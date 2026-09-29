---
title: OpenWiki 追得到代码变更，却证明不了文档正确
description: OpenWiki 用 Git 变更与 Grounded Claims 找出该更新的 repo wiki 页面，但来源检查全绿只代表引用没过期。从 0.5.2 源代码拆解它做到哪里，以及导入要付的成本。
date: 2026-09-19 08:20:00 +0800
categories: [AI, 文档维护]
tags: [openwiki, coding-agent, documentation]
media_subpath: /assets/img/posts/openwiki-agent-docs-maintenance/
---

`AGENTS.md` 适合放构建命令与工作规则，不适合塞进完整的架构说明。coding agent 接手陌生 repo 时，仍得从源代码和测试找出模块关系、数据流与失败处理。OpenWiki 的做法是把这些信息整理到 repo 内的 wiki，让 agent 需要时再读。本文要查的是，代码改变后，它如何找出需要重写的页面，以及更新结果可以信到什么程度。

[LangChain 发布 OpenWiki 时](https://www.langchain.com/blog/introducing-openwiki-an-open-source-agent-for-repo-documentation)，主张 agent 指引文件只要指向 repo wiki，coding agent 就能按需求取用文档，不必把大量说明塞进单一指引文件。这种分工让指引文件维持简短，却增加了一份会随代码过期的 wiki。以下分别从更新流程与来源检查，看 OpenWiki 如何处理这个问题。

## OpenWiki 把 repo 文档做成可更新的 wiki

OpenWiki 是产生与维护 repo wiki 的命令行工具。本文查证的是源代码 commit [`715109a`](https://github.com/langchain-ai/openwiki/tree/715109a8ab1cda6d47680fcc8170e203c751bf61)。该版本的 [`package.json`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/package.json) 标注为 `0.5.2`，要求 Node.js `22.22.0` 以上，并采用 [`MIT License`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/LICENSE#L1)。

本文关注的是 code mode，也就是把生成的文档放回原 repo，一起纳入版本控制。运行初始化后，OpenWiki 会创建 `openwiki/` 目录，并在 `AGENTS.md` 与 `CLAUDE.md` 写入由它管理的指引部分。若 repo 还没有更新 workflow，它也会创建 `.github/workflows/openwiki-update.yml`。因此 `--init` 会读取代码，也会修改 agent 指引与 GitHub Actions 配置。这些行为可在 [`ensureCodeModeRepoSetup`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L47) 与 [`writeCodeModeAgentSnippets`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L192) 查到。

OpenWiki 写入的 agent 指引会把 `openwiki/` 定位成按需求查阅的 evidence index。也就是说，agent 先用 wiki 找到相关系统与文件，再回到源代码和测试确认；wiki 本身不是最终依据。这项限制写在 [`createCodeModeAgentsSnippet`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/ingestion/code-mode.ts#L423) 产生的指引中。

![短指引指向 repo wiki，wiki 再连回源代码与测试](agents-md-points-to-wiki.png){: width="800" height="430" }
_AGENTS.md 只负责指路；wiki 是按需查阅的 evidence index，仍要回到代码确认。_

## 一次更新如何决定要改哪些页面

OpenWiki 会产生 wiki 页面，也会为页面中的重要描述创建 Claim，记录支持该描述的源代码位置。每一页及其 Claims 是一个依次处理的 page job。这些 Claims 不写在 wiki 正文里，而是另外存成 sidecar 元数据文件。运行一次 repo 更新时，OpenWiki 依次完成下列工作。

1. `getRepositoryChangedPaths` 先找出代码改了什么。它比较上次记录的 Git commit 与目前 checkout 的 `HEAD`。尚未提交的变更也会纳入，包括已加入 Git index 的 staged 文件、尚未加入 index 的 unstaged 文件，以及 Git 尚未跟踪的新文件。它会排除 OpenWiki 自己产生的 `openwiki/`，以及 `.openwikiignore` 指定的路径，避免把文档产物当成代码变更。[`src/agent/utils.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/utils.ts#L909) 列出了实际使用的 Git 命令。
2. 负责规划的 planner 再决定 wiki 应该有哪些页面。它会读取 `package.json` 这类 manifest、程序入口、主要目录与代表性测试，并按系统边界、运行环境与跨系统流程安排页面。给 planner 的 prompt 明确禁止照源代码目录逐个文件列清单，因为目标是解释系统如何运作，不是复制文件树。这段要求可在 [`createRepositoryPlannerPrompt`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/repository-prompts.ts#L43) 查到。
3. 负责写页面的 worker 一次只处理目前排到的 page job。它完成页面后，还要列出哪些 Claims 是添加、修订、确认或撤回。这些动作让 OpenWiki 知道一条现有描述是仍然成立、内容需要修改，还是应该从文档移除。[`submitRepositoryPage`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L1184) 会拒绝不按队列顺序提交的页面，并在接受前确认页面文件可读。
4. 写入页面和 Claims 时，OpenWiki 会检查 worker 读取的页面版本是否仍是最新版，避免覆盖其他更新。接着它确认 sidecar 内的 Claim 能找到所引用的代码，通过后才把这个 page job 标成完成。所有页面处理完后，它还会检查 Mermaid 图、wiki 索引、内部链接、Claim 来源与本次生成记录。这组收尾检查实现在 [`finalizeWikiArtifacts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/wiki-finalizer.ts#L248)。

![OpenWiki 更新流程：Git 变更、planner、page job 与收尾检查](openwiki-update-pipeline.png){: width="800" height="430" }
_一次更新先看代码改了什么，再决定页面、写入 Claims，最后才做整批检查。_

OpenWiki 每完成一页就把结果写进本次更新的 checkpoint。若进程中途失败，已完成页面的记录不会跟着消失。只有全部页面通过验证并写入本次生成记录后，[`finishRepositoryRun`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L1487) 才会移除这份运行状态。这代表中断时能保留部分进度，不代表未完成的 wiki 已经可以合并。

## Claims 能检查到哪里

Grounded Claims 的用途是让重要文档描述可以回查源代码。每条 Claim 都连到一个 `repo://` URI，位置可以是整个文件，也可以缩小到一段行号。除了行号，repository resolver 还会计算引用内容的 SHA-256，并保存首尾行与相邻内容的 hash。若有人在文件上方插入代码，导致原本的行号整段往后移，resolver 会用原内容与前后文寻找新的位置。这段逻辑见 [`resolveLineRangeEvidence`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts#L294) 与 [`locateUnchangedLineRange`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts#L404)。

每次更新前，`runClaimsPreflight` 会解析各条 Claim 引用的代码。文件或引用范围已经找不到时，状态是 `unresolved`。找到位置但内容版本不同时，状态是 `stale`。OpenWiki 只有在 Git 检查没有发现必须处理的变更、所有 Claims 都没有问题，而且每页都已有 Claims 可作为覆盖基准时，才会把这次运行判定为 `no-op`，也就是不重新生成文档。[`preflight.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/brains/code/preflight.ts#L40) 与 [`repository-run.ts`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/generation/repository-run.ts#L410) 实现了这两层判定。

这项检查只回答两个问题：引用的位置是否仍然存在，以及该位置的内容是否改变。它不会重新判断文档中的自然语言是否正确。假设文档声称“重试三次后会写入失败消息队列”，但被引用的代码其实只重试两次。只要那段代码没有修改，保存的 hash 仍会相同，`stale` 与 `unresolved` 都不会出现。

所以，来源检查全绿只代表 Claim 仍能连到当初引用的内容。审查者仍要读该段代码与相关测试，确认文档没有误解条件、数量或执行顺序。

![CI 面板显示来源检查全绿，开发者询问文档是否正确，审查者拿出红笔](claims-green-review-red-pen.png){: width="800" height="430" }
_Claims 全绿后，仍需人工核对文档描述。_

## 放进日常工作，差别在哪里

### 个人项目隔几个月后再维护

维护个人项目时，你同时是开发者和文档审查者。几个月没碰项目，再回来修登录错误时，你可能还记得功能位于哪个目录，却忘了 session 在哪里续期、超时由哪些测试覆盖，以及部署时读取哪个环境变量。若 wiki 有一页说明登录流程，并用 Claims 连到 session 代码、测试与部署配置，coding agent 就能先读这几个位置，不必从整个 repo 搜索相关关键词。

个人使用也容易省略审查，因为没有人会退回错误的文档 PR。若项目已分成多个模块，或每次维护相隔数月，可以把抽查 Claims 纳入每次更新的例行工作。若项目只有少量文件，而且你每周都在修改，直接读源代码与测试通常更省时间。

### 企业值班与跨团队修改

假设值班工程师收到订单重复创建的告警，但原作者正在休假。这时要先找出接收订单的 API、重试发生的位置，以及服务在哪里产生和检查幂等键。若 wiki 的订单流程页面已连到这些代码和测试，工程师与 coding agent 可以直接从引用位置开始查。wiki 不会判断这次事故的根因，但能协助工程师确认请求经过哪些服务，不用先等原作者上线。

跨团队修改会让文档落后的代价更明显。假设支付团队替事件格式加入必填的版本字段，订单与通知服务都要更新解析程序。OpenWiki 可以依 Git 变更与现有 Claims 找出可能需要改写的页面，并提出文档 PR。审查者仍要确认文档是否写清楚旧版事件能否继续使用，以及测试是否覆盖新旧格式。团队也得先指定文档 PR 的审查人、处理期限，以及生成中断时是否接受部分结果。没有这些安排，自动产生的 PR 只会留在队列里。

项目是个人的还是企业的，并不直接决定它需不需要 repo wiki。若每次接手都要重新找一遍入口、流程与测试，而且有人负责核对文档，wiki 才有机会省下重复查找的时间。

## 什么样的 repo 值得承担维护成本

OpenWiki 会增加模型调用、CI 配置与人工审查。导入前至少要确认下列成本由谁承担。

- 每次生成与更新都会调用模型。[README 的 quick start](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md#quick-start) 要求设置模型服务商、API 密钥与模型名称。账单、运行时间和输出质量会随模型与 repo 内容改变。本文没有运行完整生成，因此没有这些项目的实测数字。
- 官方 [`openwiki-update.yml`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/examples/openwiki-update.yml#L1) 会拉取完整 Git history，让 OpenWiki 能比较前后 commit。它也需要模型密钥，以及 `contents: write` 和 `pull-requests: write` 权限，用来提交文档变更与创建 PR。这些权限应和其他能写入 repo 的自动化一样接受审查。
- `--init` 会创建 `openwiki/`、修改 agent 指引，还可能添加 GitHub Actions workflow。第一次运行后，审查范围应包含所有 diff，而非只有生成的 wiki 页面。
- Claims 会把文档描述带到确切的源代码位置，但点开链接不等于完成审查。审查者仍要比较描述、引用范围与相关测试。

若 repo 包含多个子系统，coding agent 经常需要修改陌生区域，而且团队愿意审查自动文档 PR，wiki 可以集中记录各系统的入口与交互方式。若小型 repo 只有几个入口，源代码和测试已能直接说明行为，就不必再维护一份内容相近的 wiki。没有审查人力时，也不应启用定时更新，因为每次运行只会再增加一个等待处理的 PR。

企业 repo 还要先排除不应交给模型处理的路径。`.openwikiignore` 会阻止 OpenWiki 的文件工具读取指定内容。启用忽略规则后，OpenWiki 的本地运行后端也会拒绝任意 shell command，因为 shell 可能绕过文件工具直接读取被忽略的文件。这项限制实现在 [`OpenWikiLocalShellBackend.execute`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/agent/docs-only-backend.ts#L481)。`.openwikiignore` 只限制 OpenWiki 的工具，不能取代 repo 访问权限，也不能补救已提交到 Git 的密钥。

## 先用一个 repo 验证更新流程

先确认 CLI 能在本地启动。以下命令把 OpenWiki 安装到 `/tmp` 下的新目录，不会改动测试 repo 的依赖包，也不会写进 npm 平常使用的全局安装位置。这组命令已在 macOS arm64、Node.js `25.2.1`、npm `11.6.2` 实际运行。OpenWiki 使用 Ink 的交互式终端界面，因此要在 Terminal 这类有 PTY 的环境运行。若 stdin 不支持 raw mode，Ink 会直接打印出错误。

```bash
check_prefix="$(mktemp -d /tmp/openwiki-check.XXXXXX)"
npm install --global --prefix "$check_prefix" openwiki@0.5.2 --no-audit --no-fund
PATH="$check_prefix/bin:$PATH" openwiki --help
```
{: .nolineno }

若 CLI 安装成功，输出会显示版本 `0.5.2` 和 `Usage` 部分。以下省略号代表中间内容已截断。

```console
>_ OpenWiki v0.5.2 agent docs for codebases
...
# Usage
   openwiki [--init|--update] [message]
```

本文只验证 CLI 能启动，没有提供模型凭证，也没有运行完整生成。下列 `--init` 与 `--update` 是项目 [`README`](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md#quick-start) 列出的原始命令。由于 `--init` 会修改 agent 指引并可能添加 workflow，第一次测试应放在可丢弃的 repo 或没有其他变更的测试分支。

```bash
openwiki --init

# 修改并提交一个有测试覆盖的行为后
openwiki --update
```
{: .nolineno }

命令返回成功只代表进程跑完。是否值得采用，还要检查以下结果。

1. 查看 `openwiki/`、`AGENTS.md`、`CLAUDE.md` 和添加 workflow 的完整 diff，确认 OpenWiki 修改了哪些文件，以及 workflow 取得哪些权限。
2. 从 wiki 挑一页熟悉的功能，检查它有没有漏掉主要入口、异常处理或代表性测试。
3. 从该页抽查几条 Claims，逐条确认文档描述是否精确、`repo://` 范围是否真的支持它，以及相关测试是否符合描述。
4. 记录生成耗时、模型用量、错误描述数量与人工修改时间。这些数字才能拿来和手动维护文档的时间比较。

## 文档维护该自动化到哪一步

前面引用的源代码可以查证 OpenWiki 如何跟踪来源，但不能证明它替每个团队省钱或省时间。我的导入顺序是：先在一个真实 repo 手动运行 `--init` 与 `--update`，保留 wiki 和 Claims 供团队审查，但暂时不启用定时 workflow。确认文档质量和审查时间能接受后，再让 GitHub Actions 定期创建更新 PR。

OpenWiki 会保存每条 Claim 引用的代码位置与内容版本，因此审查者能查出来源是否仍存在。单看文档最后生成时间，无法做这项检查。不过，团队还是要记录抽查时发现多少错误描述、哪些主要流程没有写进 wiki，以及每次文档 PR 需要多少人工修改。若这些审查工作花的时间比原本手动更新文档还多，自动化只是把时间移到 PR review。

## 从一次有来源可查的更新开始

OpenWiki 先比较 Git 变更，再由 planner 读取 repo 结构与测试，决定要处理哪些页面。每页完成时，它检查页面、Claims sidecar 和引用来源，整批完成前再检查索引与内部链接。这些机制可以确认中断时留下了哪些进度，也能确认 Claim 引用的内容版本是否改变。它们不能判断文档是否正确解读了代码。

最小的测试是在可丢弃的 repo 跑一次 `--init`，提交一项有测试的代码变更，再跑 `--update`。接着抽查变更相关页面的 Claims，记录模型用量、错误数量与人工审查时间。只有文档能正确描述这项变更，而且更新成本可以接受，才把定时 workflow 加进正式 repo。

## 延伸阅读

- [Introducing OpenWiki](https://www.langchain.com/blog/introducing-openwiki-an-open-source-agent-for-repo-documentation)：理解首发时为何用短 agent 指引连到大型 repo wiki。
- [OpenWiki README](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/README.md)：查 CLI、code mode、Grounded Claims 与定时更新的使用方式。
- [Claims preflight 实现](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/brains/code/preflight.ts)：核对 `stale` 与 `unresolved` 的实际判定。
- [Repository evidence resolver](https://github.com/langchain-ai/openwiki/blob/715109a8ab1cda6d47680fcc8170e203c751bf61/src/claims/evidence/repository/resolver.ts)：追查行号移动后如何用内容 hash 与上下文重新定位 evidence。
