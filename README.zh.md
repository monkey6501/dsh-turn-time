# dsh-turn-time

[English](README.md) | 中文

在 DeepSeek Harness Web 输入框下方显示每次任务耗时的插件。

## 显示内容

输入框下方、与内置的“活动 / 用量”标签同一排，多出一枚计时标签。**两组读数始终可见，不需要点开**：

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

时长用词与对话流里原生的“已完成，用时 …”一致（`1分23秒`、`1h 23m 5s`），所以这排小字和聊天区读起来是一套。

## 安装

```sh
dsh plugin --profile web add dsh-turn-time
```

或者把源码目录装进本地：**插件 → 添加插件**，选中这个目录。

## 数据从哪来

宿主侧一个名为 `taskTime` 的投影单元折叠已提交的会话事件，因此翻历史、刷新、压缩上下文都不会让数字变形。每个轮次只保存累计量（模型用时、工具用时、步骤数）和正在计时的那一步；已完成的轮次压成一行摘要，且摘要列表有上限，所以检查点很小，不会随日志一起膨胀。

## 已知限制

- 只保留总量，没有逐步、逐次工具调用的记录。
- 中途被取消、没产出消息的步骤只有步骤时长、没有模型用时。
- 由事后补写的结束标记关闭的轮次（崩溃后的 `interrupted`、fork 边界的 `forked`）按最后一次活动计时，而不是按标记写入的时刻。
- 并行工具调用按调用累加，所以 工具用时 可能大于该轮的墙钟耗时。
- 秒表用的是浏览器时钟对着宿主事件时间戳；本地桌面会话两者一致，页面被远程访问时可能有偏差。

## 关掉它

在 **插件** 里停用这个 bundle，标签和 `taskTime` 投影都会一起消失，没有别的界面读它。

## 发布到插件市场

社区市场（`dshmarket`）读的是 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录，上架只提一个 PR、加一个文件 `data/plugins/<owner>__<repo>.yml`：

```yaml
url: https://github.com/monkey6501/dsh-turn-time
name: monkey6501/dsh-turn-time
category: usage
icon: https://raw.githubusercontent.com/monkey6501/dsh-turn-time/main/assets/icon-180.png
description:
  en: "Shows how long the current task took and the session total below the composer, with the task's model time, tool time and step count."
  zh: 在输入框下方显示本轮任务耗时与本会话累计耗时，并可展开查看本轮的模型用时、工具用时和步骤数。
```

提交前：

1. 发到 npm（`npm publish`），市场才能用预构建包安装、显示下载量；
2. 仓库公开、创建满 24 小时，并加上 `dsh-plugin` topic；
3. 商店卡片图标用 `assets/icon-180.png`（目录要求 GitHub 托管的位图，SVG 不收；`icon.svg` 是应用内图标）。

逐条命令见 [PUBLISHING.md](PUBLISHING.md)。
