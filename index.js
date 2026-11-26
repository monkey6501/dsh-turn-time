/**
 * The `taskTime` projection unit: how long each task — one turn, from
 * `turn/start` to `turn/end` — took, split into model time, tool time, and a
 * step count.
 *
 * The fold mirrors the vocabulary of `@deepseek-ai/dsh-session-stats`: model
 * time is `step/start` → `assistant/message`, tool time pairs
 * `tool/call` → `tool/result` by callId, and `step/end` closes the open step.
 * No per-step list is kept: a turn carries running totals plus the open step
 * boundary it needs to time, and finished turns collapse into one summary row,
 * so the checkpointed state stays tiny instead of growing with the log.
 *
 * @module @local/task-time
 */

/** Cordis plugin name. */
export const name = 'task-time'

/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

/** How many finished tasks stay visible in the breakdown. */
const HISTORY_LIMIT = 10

/**
 * Boundaries are validated by shape rather than a schema library: this bundle
 * ships no dependencies, and the registry only calls `.parse()` on the state
 * it restores from a checkpoint whose `stateVersion` matched.
 */
const passthrough = { parse: value => value }

/**
 * @param n - turn number.
 * @param start - turn start time.
 * @returns a fresh open turn.
 */
function openTurn(n, start) {
  return { n, start, end: null, last: start, modelMs: 0, toolMs: 0, stepCount: 0, openStep: null, calls: {} }
}

/**
 * @param turn - a turn, open or closed.
 * @param fallbackEnd - time to close an interrupted turn at.
 * @returns the turn's one-row summary.
 */
function summarize(turn, fallbackEnd) {
  const end = turn.end === null ? fallbackEnd : turn.end
  return {
    n: turn.n,
    wallMs: Math.max(0, end - turn.start),
    modelMs: turn.modelMs,
    toolMs: turn.toolMs,
    stepCount: turn.stepCount,
  }
}

/**
 * @returns the empty state of one Session.
 */
function init() {
  return { turns: 0, closedMs: 0, history: [], turn: null }
}

/** The `taskTime` unit registered on `ctx.sessionProjections`. */
export const taskTimeProjectionDefinition = {
  key: 'taskTime',
  stateVersion: 3,
  stateSchema: passthrough,
  init,
  apply: (state, event) => {
    // Every uninteresting event returns the same reference (Object.is gates the change feed).
    switch (event.type) {
      case 'turn/start': {
        const previous = state.turn
        if (previous === null) return { ...state, turn: openTurn(event.data.turn, event.time) }
        // An open turn without `turn/end` was interrupted (crash or abandon):
        // count the time it was actually active, then start fresh.
        const interrupted = previous.end === null
        const closeAt = interrupted ? previous.last : previous.end
        return {
          turns: state.turns + (interrupted ? 1 : 0),
          closedMs: state.closedMs + (interrupted ? Math.max(0, closeAt - previous.start) : 0),
          history: [summarize(previous, closeAt), ...state.history].slice(0, HISTORY_LIMIT),
          turn: openTurn(event.data.turn, event.time),
        }
      }
      case 'step/start': {
        const turn = state.turn
        if (turn === null || turn.n !== event.data.turn) return state
        return {
          ...state,
          turn: {
            ...turn,
            last: event.time,
            stepCount: turn.stepCount + 1,
            openStep: { n: event.data.step, start: event.time, timed: false },
          },
        }
      }
      case 'assistant/message': {
        const turn = state.turn
        const open = turn === null ? null : turn.openStep
        if (turn === null || turn.n !== event.data.turn) return state
        if (open === null || open.n !== event.data.step || open.timed) return state
        // One assembled message per step: a duplicate must not redefine model time.
        return {
          ...state,
          turn: {
            ...turn,
            last: event.time,
            modelMs: turn.modelMs + Math.max(0, event.time - open.start),
            openStep: { ...open, timed: true },
          },
        }
      }
      case 'tool/call': {
        const turn = state.turn
        if (turn === null || turn.n !== event.data.turn) return state
        return { ...state, turn: { ...turn, last: event.time, calls: { ...turn.calls, [event.data.callId]: event.time } } }
      }
      case 'tool/result': {
        const turn = state.turn
        if (turn === null || turn.n !== event.data.turn) return state
        const message = event.data.message
        const callId = message !== null && typeof message === 'object' && message.source
          ? message.source.callId
          : undefined
        // Own-key check: callId is provider-minted, so a prototype name must read as unmatched.
        if (typeof callId !== 'string' || !Object.hasOwn(turn.calls, callId)) return state
        const calls = { ...turn.calls }
        const startedAt = calls[callId]
        delete calls[callId]
        return {
          ...state,
          turn: { ...turn, last: event.time, toolMs: turn.toolMs + Math.max(0, event.time - startedAt), calls },
        }
      }
      case 'step/end': {
        const turn = state.turn
        if (turn === null || turn.n !== event.data.turn) return state
        if (turn.openStep === null) return { ...state, turn: { ...turn, last: event.time } }
        return { ...state, turn: { ...turn, last: event.time, openStep: null } }
      }
      case 'turn/end': {
        const turn = state.turn
        if (turn === null || turn.n !== event.data.turn || turn.end !== null) return state
        const reason = event.data.reason === undefined ? undefined : event.data.reason.kind
        // `interrupted`/`forked` are appended after the fact (resume repair, fork
        // seed), so their own timestamp is not when work stopped: the last
        // observed activity is. A live closer lands right after that activity.
        const end = reason === 'interrupted' || reason === 'forked' ? turn.last : event.time
        return {
          ...state,
          turns: state.turns + 1,
          closedMs: state.closedMs + Math.max(0, end - turn.start),
          // Unresolved calls belong to a cancelled or failed turn; results always
          // land within their turn, so drop them instead of keeping them forever.
          turn: { ...turn, end, openStep: null, calls: {} },
        }
      }
      default:
        return state
    }
  },
  wire: {
    viewSchema: passthrough,
    // The pill is a summary; the session list has no row for it.
    summary: false,
    view: state => {
      const turn = state.turn
      return {
        turns: state.turns,
        closedMs: state.closedMs,
        history: state.history,
        turn: turn === null ? null : {
          n: turn.n,
          start: turn.start,
          end: turn.end,
          wallMs: turn.end === null ? null : Math.max(0, turn.end - turn.start),
          modelMs: turn.modelMs,
          toolMs: turn.toolMs,
          stepCount: turn.stepCount,
        },
      }
    },
  },
}

/**
 * Register the `taskTime` unit; the registration is an effect on this plugin's
 * fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 * @returns when the plugin is ready.
 */
export async function apply(ctx) {
  await ctx.sessionProjections.register(taskTimeProjectionDefinition)
}
