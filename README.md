# dsh-turn-time

English | [中文](README.zh.md)

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

## Publishing to the plugin market

The community market (`dshmarket`) reads the [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
catalog. Listing it takes one pull request that adds one file,
`data/plugins/<owner>__<repo>.yml`:

```yaml
url: https://github.com/monkey6501/dsh-turn-time
name: monkey6501/dsh-turn-time
category: usage
icon: https://raw.githubusercontent.com/monkey6501/dsh-turn-time/main/assets/icon-180.png
description:
  en: "Shows how long the current task took and the session total below the composer, with the task's model time, tool time and step count."
  zh: 在输入框下方显示本轮任务耗时与本会话累计耗时，并可展开查看本轮的模型用时、工具用时和步骤数。
```

Before submitting:

1. Publish to npm (`npm publish`) so stores can install a prebuilt package and
   show a download count. Only new package names need the extra check that
   `dist-tags.latest` on `registry.npmjs.org` matches the published version and
   that its `dist.tarball` actually downloads.
2. Keep the repository public and at least a day old, and add the `dsh-plugin`
   topic.
3. The storefront tile is `assets/icon-180.png` (a GitHub-hosted raster image,
   as the catalog requires). `icon.svg` is the in-app plugin icon.

Step-by-step commands live in [PUBLISHING.md](PUBLISHING.md).
