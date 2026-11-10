---
title: "把重复检查自动化：用 Claude Code hooks 做排版、测试与敏感文件提醒"
description: "不想每次改完文件都自己提醒排版、跑测试、留意敏感文件？这篇教你用 Claude Code hooks，在固定时机自动做这些检查，并说明它挡不下什么。"
date: 2026-11-10 11:00:00 +0800
categories: [AI, 软件开发]
tags: [claude-code, coding-agent, workflow, testing]
media_subpath: /assets/img/posts/claude-code-hooks-automate-checks/
image:
  path: cover.webp
  alt: "改完文件自动排版、碰到敏感文件先挡下再提醒，结束这轮时再跑测试。"
---

每次请 AI 改完文件，我都还要自己想：排版有没有跑？测试有没有过？有没有不小心改到 `.env`？这些事其实不必每次开口。Claude Code（在终端里使用的 AI 编程助手）提供 hooks：在对话过程的固定时机，运行你事先写好的指令，而不是等 AI 自己决定要不要做。

这篇说明 hooks 是什么、什么时候适合用，以及怎么在项目里设置四种常见检查：改完文件自动排版、碰到敏感文件时挡下该次修改、结束这轮时跑测试，还有对话被压缩后把项目规则补回来。最后会说明它挡不下什么，因为 hooks 不是安全边界。

> **版本**：本文依 2026-11-10（台北时间）读取的 [Claude Code hooks 指南](https://code.claude.com/docs/en/hooks-guide)与 [Hooks reference](https://code.claude.com/docs/en/hooks)（含 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)）整理。当天 npm 上 Claude Code 最新是 2.1.322。之后的版本，事件与字段可能会改变。
{: .prompt-info }

若你关心的是第三方 skill 和 MCP 带来的权限风险，见[先前这篇](/posts/coding-agent-supply-chain-permission-risks/)。本篇只谈日常可以自己设置的自动检查。

## hooks 是什么，什么时候用

Hook 是你定义的指令，Claude Code 会在生命周期的关键时机运行它。官方的说法是：某些动作会固定发生，而不依赖模型自己选择要不要跑。适合用在不需要当场判断、每次都该做的事，例如排版、跑测试、或在改到特定文件时先挡下来并说明原因。需要斟酌的决定，还是留给你或权限设置。

常见的时机包括：

- **PreToolUse**：工具（例如改文件、运行指令）实际运行前，可以挡下该次调用。
- **PostToolUse**：工具成功运行后，例如用来排版刚刚改过的文件。
- **Stop**：Claude 结束这轮回复时。注意，它在每次回复结束时都会触发，不只在“整个任务完成”时。
- **SessionStart**：对话开始或接续时。若只想在压缩后补规则，可以用 matcher 限定 `compact`。

Hook 事件比上面列出的还多，完整列表见 [Hooks reference](https://code.claude.com/docs/en/hooks#hook-lifecycle)。入门不必一次全用。

![对话过程中四个固定时机，各自可以运行你设置的检查](hook-timeline.webp){: w="1280" h="720" }
_概念图，不是实际接口。四个时机依序可以是：工具运行前、运行成功后、这轮回复结束、以及对话开始或被压缩之后。_

**什么时候用：** 同一件事你已经提醒过不止一次，而且判断规则写得清楚，例如“改完 JavaScript 就排版”“不要用 Edit 或 Write 改 `.env`”。

**下一步：** 先决定设置要放在哪个文件，再从一个 hook 开始。

## 设置放在哪里

本篇的范例都写在项目根目录的 `.claude/settings.json`。这个文件可以提交到 repo，让同一项目的人共用。其他位置还有：只作用于你本机所有项目的 `~/.claude/settings.json`，以及不会进版控的 `.claude/settings.local.json`。各层的 hooks 是合并，不是互相取代。

配置文件是 JSON，不能有注解，也不能在最后一个条目后面多写逗号。结构是三层：先写事件名称，再写一组带 matcher 的规则，最后是要运行的 hooks。

Matcher 是用来过滤“这次要不要跑”的条件。对 PreToolUse 和 PostToolUse 来说，它比的是工具名称，而且大小写必须完全一致。例如 `"Edit|Write"` 只在 Claude 使用 `Edit` 或 `Write` 时触发，用 `Bash`、`Read` 或其他工具时不会跑。也可以写成 `"Edit, Write"`，意思相同。没有写 matcher，或写 `"*"`，就会在该事件每次发生时都运行。

设置好之后，在 Claude Code 的提示符输入 `/hooks`，会打开一个只读的浏览画面，列出目前的 hooks，以及它们来自用户设置、项目设置、本机设置、插件或目前这次对话。这只是查看，不能在这里改设置。

下面的指令范例需要 [`jq`](https://jqlang.org/)（用来从 hooks 传入的 JSON 取出字段）。排版那一项另外需要 Node.js 和 `npx`，才能运行官方的 Prettier 写法。Hook 脚本在 macOS 和 Linux 上必须是可执行文件，设置后请运行 `chmod +x .claude/hooks/*.sh`。

## 改完文件自动排版：PostToolUse

**什么时候用：** 你希望 Claude 用 `Edit` 或 `Write` 改完文件后，自动依项目的排版规则重排，不必每次再提醒。

把这段加到项目的 `.claude/settings.json`（若文件里已有 `"hooks"`，只要在里面加上 `PostToolUse`，不要整份覆盖）：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

**它会做什么：** 工具成功改文件后，这条指令从输入的 JSON 取出文件路径，交给 `npx prettier --write` 就地排版。这是官方指南的写法。

**你会得到什么：** 成功时，对话里通常不会跳出消息；要看的是文件是否已被重排。官方的检查方式是：请 Claude 在 JavaScript 文件里加上单引号字符串，再打开文件确认是否被改成双引号（依 Prettier 默认设置）。

**下一步：** 若你还想在改到 `.env` 或 `.git/` 时先挡下来，接着设置 PreToolUse。

## 改到敏感文件时挡下该次修改：PreToolUse

**什么时候用：** 你不希望 Claude 用 `Edit` 或 `Write` 直接改 `.env`、`.git/` 里的文件，或 `package-lock.json`。这里说的是挡下该次修改并把原因反馈给 Claude，不是“AI 不能碰这些文件”。

先添加 `.claude/hooks/protect-files.sh`（官方指南保护文件范例的写法，并处理 Windows 路径的反斜线）：

```bash
#!/bin/bash
# protect-files.sh — based on official Claude Code hooks guide example
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Normalize Windows backslash separators so the patterns below match
FILE_PATH="${FILE_PATH//\\//}"

PROTECTED_PATTERNS=(".env" "package-lock.json" ".git/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done

exit 0
```

再在 `.claude/settings.json` 的 `"hooks"` 里加上：

```json
"PreToolUse": [
  {
    "matcher": "Edit|Write",
    "hooks": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
      }
    ]
  }
]
```

`$CLAUDE_PROJECT_DIR` 是 Claude Code 提供的环境变量，指向目前项目根目录。结束码 `2` 在 PreToolUse 会阻止该次工具调用，脚本写到 stderr（标准错误输出）的 `Blocked:` 说明，会成为给 Claude 的反馈。结束码 `0` 代表没有额外决定，仍走原本的权限流程，并不等于核准这次操作。

![一般文件通过，对敏感文件的那一次修改被挡下并留下提醒](guard-edit.webp){: w="1280" h="720" }
_概念图，不是实际权限画面。这个 hook 挡的是该次 Edit 或 Write，不是所有可能改到这个文件的路径。_

**你会得到什么：** 若路径符合保护条件，该次修改不会运行，Claude 会看到挡下的原因。

**下一步：** 请记得，只用 `Edit|Write` 挡不住通过 `Bash` 或 `PowerShell` 改文件的情况，限制一节会说明怎么补。若还想在结束这轮时跑测试，接着设置 Stop。

## 结束这轮时跑测试：Stop

**什么时候用：** 你希望 Claude 结束这轮回复时，先跑项目测试；测试失败就不要就此结束，把失败原因反馈后继续修。

Stop hook 没有 matcher。它在每次回复结束时都会跑，用户中断时不会跑。若 hook 让对话继续，输入里的 `stop_hook_active` 会是 `true`。官方提醒一定要检查这个字段，或改读对话记录，以免在永远不会满足的条件上一直挡下去。连续挡下并让对话继续八次之后，Claude Code 会强制结束这一轮；Claude 一旦再调用工具，这个计数就会归零。

添加 `.claude/hooks/run-tests-on-stop.sh`。这里用 `bun test`，配合后面的 Bun 场景；请换成你项目自己的测试指令，例如 `npm test` 或 `pytest`：

```bash
#!/bin/bash
# run-tests-on-stop.sh — Stop hook with official stop_hook_active guard
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # Allow Claude to stop
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
if ! (cd "$PROJECT_DIR" && bun test) >&2; then
  echo "Blocked stop: tests failed. Fix the failing tests before finishing." >&2
  exit 2
fi
exit 0
```

对应的设置：

```json
"Stop": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-tests-on-stop.sh"
      }
    ]
  }
]
```

在 Stop 事件里，结束码 `2` 会不让 Claude 停下，stderr 的说明会成为继续工作的理由。

**你会得到什么：** 测试通过，这轮可以结束；失败时，Claude 会依反馈继续处理，而不是在已经由 hook 接续的情况下再挡一次。

**下一步：** 若你担心对话压缩后遗漏项目惯例，再加上 SessionStart。

## 压缩后把规则补回来：SessionStart

对话脉络（上下文，也就是目前还留在模型眼前的内容）太长时，Claude Code 会做 compaction（压缩）：把先前的对话摘要，好腾出空间，过程中可能漏掉重要细节。官方建议用 SessionStart hook，并把 matcher 设成 `compact`，在每次压缩后把关键规则再写进脉络。指令印到标准输出的纯文本，会被加进 Claude 的脉络。静态、不太会变的规则，也可以改放在 `CLAUDE.md`。

**什么时候用：** 有几条规则你希望每次压缩后都还在，例如软件包管理工具或测试指令。

```json
"SessionStart": [
  {
    "matcher": "compact",
    "hooks": [
      {
        "type": "command",
        "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing. Current sprint: auth refactor.'"
      }
    ]
  }
]
```

把提醒文本改成你的项目规则即可。`compact` 对应自动或手动压缩。SessionStart 不能用来挡住压缩本身。

**你会得到什么：** 依官方说明，压缩后 Claude 会再看到这段提醒。

**下一步：** 用 `/hooks` 确认四个事件都出现在清单里。

## 用 /hooks 检查设置

在 Claude Code 提示符输入 `/hooks`，打开只读的 hooks 浏览画面。清单会标示每条 hook 的来源，例如用户设置、项目设置、本机设置、插件或目前这次对话。选一条可以看到它实际运行的内容，以及定义它的配置文件路径或插件名称。也可以改看 `All events`，连尚未设置的事件一并列出。

这个画面只供查看，改设置仍要编辑对应的 JSON 文件。

## 完整范例：一个小项目的一天

假设你在维护一个小型网站，希望改完 JavaScript 就排版、不要用 Edit 或 Write 改到 `.env`、每次回复结束先跑测试，压缩后还记得“用 Bun、提交前先测”。

排版仍用前面官方的 `npx prettier` 写法；这和你用 Bun 还是 npm 管理软件包无关。

1. 在项目根目录创建 `.claude/settings.json`，放入上面四个事件的设置；创建 `protect-files.sh` 和 `run-tests-on-stop.sh`，把测试指令改成你的项目指令，并运行 `chmod +x .claude/hooks/*.sh`。
2. 确认已安装 `jq`，以及可运行 `npx prettier` 的 Node.js 环境。
3. 启动 Claude Code，输入 `/hooks`，确认 PostToolUse、PreToolUse、Stop、SessionStart 都在清单中，来源是项目设置。
4. 请 Claude 在一个 `.js` 文件加上功能。它用 Edit 或 Write 改完后，Prettier 会接着排版。
5. 若它试着用 Edit 或 Write 改 `.env`，该次修改会被挡下，并带回 `Blocked:` 的说明。
6. 它说做完时，Stop hook 会跑测试；失败就依反馈继续，而不是直接结束。
7. 若这次对话经过压缩，SessionStart 会把你写的提醒再送进脉络。

这四步可以分开加，不必一次全开。

## 该用哪个 hook

| 你的情况 | 用这个 |
| --- | --- |
| 用 Edit 或 Write 改完文件，要自动排版 | PostToolUse，matcher 设 `Edit\|Write` |
| 不要让该次 Edit 或 Write 改到 `.env`、`.git/` 等文件 | PreToolUse，matcher 设 `Edit\|Write`，结束码 2 挡下并说明原因 |
| 不论谁改了某个文件，都要在文件写入后做扫描 | FileChanged（文件写入后才运行，不能事先挡住） |
| 这轮回复结束时先跑测试或扫描工作目录 | Stop，并检查 `stop_hook_active` |
| 压缩后把项目规则补回脉络 | SessionStart，matcher 设 `compact` |
| 只想确认目前设置了哪些 hooks | `/hooks`（只读浏览） |

## 使用前要先知道的限制

这些限制都来自官方文档，使用前请先看过。

**Matcher 只比工具名称。** `"Edit|Write"` 在 Claude 改用 `Bash` 或 `PowerShell` 改文件时不会触发。官方建议：若必须看到每一次改文件，例如做合规扫描或稽核记录，加一个 Stop hook，在每轮结束时扫描工作目录；若要在每次调用时都看到，另外 match `Bash|PowerShell`，并用 `git status --porcelain` 列出已修改和尚未追踪的文件。若只在意某个文件被写入，不论是谁写的，改用 [FileChanged](https://code.claude.com/docs/en/hooks#filechanged)。因此，上面的保护脚本只能写成“挡下该次 Edit 或 Write”，不要理解成 AI 完全不能碰到这些文件。

![正门有人看守，侧路仍可绕过；只比对 Edit 和 Write 挡不住经由指令改文件](bash-bypass.webp){: w="1280" h="720" }
_概念图。Matcher 守的是指定的工具名称；经由 Bash 或 PowerShell 改文件，会走另一条路。_

**`if` 只能尽量过滤。** 除了 matcher，工具事件还能加 `if`，用权限规则的语法依工具名称和参数决定要不要启动 hook，例如 `"Edit(*.ts)"`。官方写明它是 best-effort（尽力而为，不保证每次都滤对）。真正要强制允许或禁止时，应使用权限系统，而不是只靠 hook。`if` 只对工具相关事件有效，加在其他事件上反而会让 hook 完全不跑。

**Hook 回传 allow，不会绕过 deny。** 设置里的拒绝规则，包括组织代管的拒绝清单，仍然有效。相对地，hook 的 deny 在各种权限模式都有效。结束码 0 也不等于核准。

**PostToolUse 不能还原已经发生的事。** 工具运行完才会跑到这个 hook，文件写入、指令运行或网络请求都已经生效。Exit 2 在这里也不能撤回，只能把说明交给 Claude。要事先阻挡或改写调用，用 PreToolUse。

**Hook 以你的完整用户权限运行。** 官方警告：command hook 会用你的账号权限运行指令，能改、删或读取这个账号能碰到的任何文件。加进设置前，先自己看过、在安全的环境试跑指令。在共用或正式环境使用前，请先读 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)。交互工作阶段会先问你是否信任该文件夹；但用 `claude -p` 或 SDK 时，官方说明不会跳出这个对话，会直接把文件夹视为已信任，因此 repo 里的 `.claude/settings.json` 也可能在你从未确认过的目录里被运行。Hooks 不称为安全边界，也不能宣称挡得住所有路径。

## 结论

Hooks 让排版、敏感文件提醒和收尾测试在固定时机自动发生，不必每次再开口。先从项目的 `.claude/settings.json` 加一个 hook，用 `/hooks` 确认它出现在清单里，再依需要往上加。同时要记得：matcher 只看工具名称，Bash 或 PowerShell 可以绕过只看守 Edit 和 Write 的规则；`if` 只是尽量过滤；allow 不会绕过 deny；PostToolUse 无法还原已运行的动作。把它当成提高效率的固定检查，而不是最后一道防线。

## 延伸阅读

- [Claude Code hooks 指南](https://code.claude.com/docs/en/hooks-guide)：常见用法与可拷贝范例。
- [Hooks reference](https://code.claude.com/docs/en/hooks)：事件、输入输出与 [Security considerations](https://code.claude.com/docs/en/hooks#security-considerations)。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：权限与供应链风险，和本篇的日常检查互补。
- [AI 写代码更快了，产品为什么还是交付不了？我如何理解 AI 原生开发流程](/zh-CN/posts/ai-native-sdlc-playbook/)：说明 skill 和 hook 的差别。
