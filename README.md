# dsh-turn-time

English | [中文](#中文说明)

Per-task wall-clock timing for the DeepSeek Harness Web composer.

## What it shows

A pill sits below the composer, beside the shipped activity and usage pills.
Both readings are always visible — nothing needs to be opened:

```
🕐 本轮 1分23秒 · 累计 12分45秒
```

- **本轮** — the current task, i.e. one turn from `turn/start` to `turn/end`. It
  ticks once per second while the task runs and freezes at its final duration
  when the turn ends.
- **累计** — summed wall time of the session's closed tasks.

Clicking the pill floats the breakdown above it (Escape or a click outside
closes it):

| Row | Meaning |
|---|---|
| 第 N 轮 | this task's total wall time |
| 模型用时 | summed `step/start` → `assistant/message` time |
| 工具用时 | summed `tool/call` → `tool/result` time |
| 步骤数 | steps in this task |
| 累计 | session total and how many tasks it covers |
| 更早的任务 | the previous finished tasks, one total each (up to 10; the row says how many are hidden) |

Durations use the same localized unit words as the shipped turn header
(`1分23秒`, `1h 23m 5s`), so the strip and the transcript read alike.

## Install

```sh
dsh plugin --profile web add dsh-turn-time
```

Or install a local checkout: **Plugins → Add plugin**, and pick this directory.

## Where the numbers come from

A host projection unit named `taskTime` folds committed session events, so the
figures survive paging, reload, and compaction. A turn carries running totals
(model time, tool time, step count) plus the open step it is timing; finished
turns collapse into one summary row and the summary list is capped, so the
checkpointed state stays tiny instead of growing with the log.

## Limits

- Only totals are kept — there is no per-step or per-tool-call record.
- A step that never assembled a message (cancelled or interrupted mid-stream)
  contributes no model time.
- A task closed by an after-the-fact marker (`interrupted` after a crash,
  `forked` at a fork boundary) is timed to its last observed activity, not to
  the moment the marker was written.
- Parallel tool calls are summed per call, so 工具用时 can exceed the task's
  wall time.
- The live tick uses the browser clock against host event timestamps, which
  agree on a local Desktop session and can drift when the page is served
  remotely.

## Turning it off

Disabling the bundle in **Plugins** removes both the pill and the `taskTime`
projection; no other UI reads it.

---

## 中文说明

在 DeepSeek Harness Web 输入框下方显示每次任务耗时的插件。

### 显示内容

输入框下方、与内置的「活动 / 用量」标签同一排，多出一枚计时标签。**两组读数始终可见，不需要点开**：

```
🕐 本轮 1分23秒 · 累计 12分45秒
```

- **本轮** —— 当前这次任务，即一次 turn（`turn/start` → `turn/end`）。运行中每秒跳动，轮次结束停在最终耗时上。
- **累计** —— 本会话已完成任务的总墙钟时间。

点一下标签，会在标签上方浮出明细（按 Esc 或点空白处收起）：

| 行 | 含义 |
|---|---|
| 第 N 轮 | 这次任务的总耗时 |
| 模型用时 | 各步 `step/start` → `assistant/message` 之和 |
| 工具用时 | 各次 `tool/call` → `tool/result` 之和 |
| 步骤数 | 这次任务走了几步 |
| 累计 | 本会话总耗时，以及覆盖了几次任务 |
| 更早的任务 | 之前每次任务各一行总耗时（最多 10 条，超出会提示还有几轮未显示） |

时长用词与对话流里原生的「已完成，用时 …」一致（`1分23秒`、`1h 23m 5s`），所以这排小字和聊天区读起来是一套。

### 安装

```sh
dsh plugin --profile web add dsh-turn-time
```

或者把源码目录装进本地：**插件 → 添加插件**，选中这个目录。

### 数据从哪来

宿主侧一个名为 `taskTime` 的投影单元折叠已提交的会话事件，因此翻历史、刷新、压缩上下文都不会让数字变形。每个轮次只保存累计量（模型用时、工具用时、步骤数）和正在计时的那一步；已完成的轮次压成一行摘要，且摘要列表有上限，所以检查点很小，不会随日志一起膨胀。

### 已知限制

- 只保留总量，没有逐步、逐次工具调用的记录。
- 中途被取消、没产出消息的步骤只有步骤时长、没有模型用时。
- 由事后补写的结束标记关闭的轮次（崩溃后的 `interrupted`、fork 边界的 `forked`）按最后一次活动计时，而不是按标记写入的时刻。
- 并行工具调用按调用累加，所以「工具用时」可能大于该轮的墙钟耗时。
- 秒表用的是浏览器时钟对着宿主事件时间戳；本地桌面会话两者一致，页面被远程访问时可能有偏差。

### 关掉它

在 **插件** 里停用这个 bundle，标签和 `taskTime` 投影都会一起消失，没有别的界面读它。

