window.__ModuleLoader__.load({
  id: 'dsh-turn-time',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'task-time'

    // One reading style everywhere (pill, rows, earlier list): the same
    // localized unit words the shipped turn header uses, never a bare "1:23".
    const CSS = `
.tt-anchor{position:relative;display:inline-flex;flex:0 0 auto;flex-direction:column;align-items:flex-start;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));}
.tt-pill{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;flex:0 0 auto;padding:1px 8px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;cursor:pointer;}
.tt-pill svg{width:14px;height:14px;flex:none;}
.tt-pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);}
@media (hover:hover){.tt-pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);}}
.tt-label{color:var(--dsw-alias-label-tertiary);}
.tt-sep{color:var(--dsw-alias-separator-primary);margin:0 6px;}
.tt-chev{opacity:.7;}
.tt-panel{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:1;box-sizing:border-box;width:max-content;min-width:220px;max-width:min(420px,calc(100vw - 32px));max-height:min(320px,60vh);overflow:auto;padding:10px 12px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);text-align:left;}
.tt-row{display:flex;justify-content:space-between;gap:24px;}
.tt-row+.tt-row{margin-top:2px;}
.tt-num{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.tt-sect{margin-top:2px;color:var(--dsw-alias-label-caption);}
.tt-rule{margin:8px 0 6px;border-top:0.5px solid var(--dsw-alias-border-l2);}
`

    /**
     * @param t - the locale seat.
     * @param ms - duration in milliseconds.
     * @returns the localized reading the shipped turn header shows, e.g. `1分23秒`.
     */
    function duration(t, ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor(total / 60) % 60
      const seconds = total % 60
      let text = ''
      if (hours > 0) text += `${hours}${t('unit.hour')}`
      if (total >= 60) text += `${minutes}${t('unit.minute')}`
      text += `${seconds}${t('unit.second')}`
      return text.trim()
    }

    /**
     * @param t - the locale seat.
     * @param ms - duration in milliseconds.
     * @returns a reading that keeps sub-second model and tool time meaningful.
     */
    function amount(t, ms) {
      if (ms > 0 && ms < 1000) return t('milliseconds', { value: String(Math.round(ms)) })
      return duration(t, ms)
    }

    function ClockIcon() {
      return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': true },
        h('circle', { cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', {
          d: 'M8 4.6V8l2.2 1.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }))
    }

    function Chevron({ open }) {
      return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': true, className: 'tt-chev' },
        h('path', {
          d: open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }))
    }

    function Row({ label, value }) {
      return h('div', { className: 'tt-row' },
        h('span', null, label),
        h('span', { className: 'tt-num' }, value))
    }

    /**
     * Composer dock pill: the current (or last) task's total time, expanding into
     * its model/tool split, the session total, and the earlier tasks.
     * @param props - the slot's standard props plus this entry's locale seat.
     */
    function TaskTime(props) {
      const { t, useProjection, useSession } = props
      const data = useProjection('taskTime')
      const running = useSession(state => state.running)
      const [open, setOpen] = React.useState(false)
      const [now, setNow] = React.useState(() => Date.now())
      const rootRef = React.useRef(null)
      const turn = data && data.turn ? data.turn : null
      const live = Boolean(turn && turn.end === null && running)
      const turnNumber = turn ? turn.n : null

      React.useEffect(() => {
        if (!live) return undefined
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
      }, [live, turnNumber])

      // The panel floats over the composer card, so leaving it must dismiss it:
      // a pointer outside it, or Escape.
      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const node = rootRef.current
          if (node !== null && !node.contains(event.target)) setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

      if (turn === null) return null

      const elapsed = turn.end === null ? Math.max(0, (live ? now : Date.now()) - turn.start) : (turn.wallMs || 0)
      const total = data.closedMs || 0
      const reading = `${t('turn')} ${duration(t, elapsed)} · ${t('total')} ${duration(t, total)}`
      const history = Array.isArray(data.history) ? data.history : []
      const hidden = Math.max(0, data.turns - history.length - (turn.end === null ? 0 : 1))

      return h('div', { className: 'tt-anchor', ref: rootRef },
        h('style', { key: 'css' }, CSS),
        h('button', {
          key: 'pill',
          type: 'button',
          className: 'tt-pill',
          'aria-expanded': open,
          'aria-label': `${reading} (${open ? t('collapse') : t('expand')})`,
          onClick: () => setOpen(value => !value),
        },
          ClockIcon(),
          h('span', { className: 'tt-label' }, t('turn')),
          h('span', { className: 'tt-num' }, duration(t, elapsed)),
          h('span', { className: 'tt-sep', 'aria-hidden': true }, '·'),
          h('span', { className: 'tt-label' }, t('total')),
          h('span', { className: 'tt-num' }, duration(t, total)),
          h(Chevron, { open })),
        open
          ? h('div', { key: 'panel', className: 'tt-panel', role: 'group', 'aria-label': t('details') },
            Row({ label: t('turnN', { n: turn.n }), value: duration(t, elapsed) }),
            Row({ label: t('model'), value: amount(t, turn.modelMs) }),
            Row({ label: t('tools'), value: amount(t, turn.toolMs) }),
            Row({ label: t('steps'), value: String(turn.stepCount) }),
            h('div', { className: 'tt-rule', 'aria-hidden': true }),
            Row({ label: t('total'), value: `${duration(t, total)} · ${t('turnsCount', { count: data.turns })}` }),
            history.length > 0
              ? h('div', { key: 'history' },
                h('div', { className: 'tt-rule', 'aria-hidden': true }),
                h('div', { className: 'tt-row' },
                  h('span', { className: 'tt-sect' }, t('earlier')),
                  hidden > 0 ? h('span', { className: 'tt-sect' }, t('earlierHidden', { count: hidden })) : null),
                history.map(earlier => h('div', { key: `earlier-${earlier.n}`, className: 'tt-row' },
                  h('span', null, t('turnN', { n: earlier.n })),
                  h('span', { className: 'tt-num' }, duration(t, earlier.wallMs)))))
              : null)
          : null)
    }

    const zh = {
      turn: '本轮',
      total: '累计',
      model: '模型用时',
      tools: '工具用时',
      steps: '步骤数',
      details: '任务耗时明细',
      expand: '展开明细',
      collapse: '收起明细',
      earlier: '更早的任务',
      earlierHidden: '还有 {count} 轮未显示',
      turnN: '第 {n} 轮',
      turnsCount: '{count} 轮',
      milliseconds: '{value} 毫秒',
      'unit.hour': '小时',
      'unit.minute': '分',
      'unit.second': '秒',
    }

    const en = {
      turn: 'This task',
      total: 'Total',
      model: 'Model',
      tools: 'Tools',
      steps: 'Step count',
      details: 'Task time breakdown',
      expand: 'Show breakdown',
      collapse: 'Hide breakdown',
      earlier: 'Earlier tasks',
      earlierHidden: '+{count} more',
      turnN: 'Task {n}',
      turnsCount: '{count} tasks',
      milliseconds: '{value}ms',
      'unit.hour': 'h ',
      'unit.minute': 'm ',
      'unit.second': 's ',
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'task-time: zh dictionary')
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'task-time: en dictionary')
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'task-time',
          order: 2,
          locale: NS,
        }, TaskTime))
      },
    }
  },
})
