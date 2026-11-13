---
title: "pstack 系列导读：这套 skill 是什么、四篇该怎么读"
description: "还在考虑要不要用 pstack，或只想解决其中一个问题？这篇导读说明这套 skill 是什么、四篇怎么串，并依你的情况建议从哪一篇读起。"
date: 2026-11-05 18:00:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, workflow, claude-code, cursor, pstack]
media_subpath: /assets/img/posts/pstack-series-guide/
image:
  path: cover.zh-CN.webp
  alt: "四篇从安装、看懂、证明能用，到用原则指挥与自己跑；先找出你卡在哪一步，再从那一篇读起。"
---

你可能听人提过 pstack，打开 repo 却只看到一长串 skill 名称；也可能是从搜索点进其中一篇，想知道前后还有哪些。这个系列我写了四篇，每篇处理用 AI 写代码时的其中一段流程。这篇导读不重讲细节，只回答三件事：pstack 是什么、四篇怎么串起来，还有你该从哪一篇开始。

> pstack 系列｜导读
>
> - 从头开始（第 1 篇）：[安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)
>
> 本系列第 3、4 篇和这篇导读都以 pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json)（commit `c742dd6`）为准；第 1 篇用的是 `0.15.29`，第 2 篇是 `0.15.30`，细节见下方的版本说明。
{: .prompt-info }

## pstack 是什么

[pstack](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack) 是 [Lauren Tan](https://x.com/poteto)（网络昵称 poteto）在 Cursor 官方插件库 [`cursor/plugins`](https://github.com/cursor/plugins) 里维护的一整组 skill，采用 MIT 许可。skill 可以想成一份操作说明，告诉 AI 编程助手怎么完成某一类工作；这里的 AI 编程助手，指的是 Cursor、Claude Code 这类能读写项目文件、帮你写代码的工具。

在 `0.15.36` 这一版，pstack 有 **58** 个 skill、**24** 条原则（每条都是简短而具体的规则，名称都是 `principle-*`），以及 **23** 个 playbook（针对某一种任务写好的固定步骤，挂在 `/poteto-mode` 下面）。另外，别把它和 Unix 命令 `pstack`（用来打印进程的调用栈）搞混；这里说的是这套 AI skill。

有两件事先知道，后面会比较好读：

- **几乎每个 skill 都要你亲自调用。** 除了 `/setup-pstack`，其他 skill 都设置成不让 AI 自己启动。
- **平时只要记住一个入口。** 先跑一次 `/setup-pstack` 选好模型；之后凡是需要严谨流程的任务，都用 `/poteto-mode` 开头，写清楚目标和“怎样算完成”，它就会帮你挑 playbook。卡住、不知道该用哪个 skill 时，先问 `/poteto-help`。

怎么安装、怎么固定版本，还有在 Claude Code 里命令要加 `/pstack:` 前缀，这些我都写在[第 1 篇](/posts/pstack-install-routing/)，这里就不重复了。

## 适合谁、不适合谁

综合我在四篇里写过的看法，这套 skill 比较适合下面这几种情况：

- 你用 Cursor 或 Claude Code，想让 AI 做事更有条理，但不想先背几十个 skill 名字（[第 1 篇](/posts/pstack-install-routing/)）。
- 改不熟的代码之前，想先弄懂机制与“为什么长这样”，再比较几种设计（[第 2 篇](/posts/pstack-understand-design/)）。
- 希望“证明它能用”变成固定流程：重现、清理、检查影响范围、用验证 skill 实际操作、开 PR，最后由你自己点合并（[第 3 篇](/posts/pstack-build-verify-merge/)）。
- 想用原则名称中途指挥 AI、把习惯做成自己的 mode，并在权限与费用上限内让它无人值守地跑（[第 4 篇](/posts/pstack-principles-customization/)）。

反过来说，下面这些情况不必动用整套：

- **很小、很明显的修改**：直接跟 AI 说就好，不用 pstack（第 1、2 篇都提过；第 2 篇更直接说，大部分改动其实用不到那些工具）。
- **不愿意为严谨流程多花用量**：pstack 会派出子代理、组评审，读写的内容越多，花掉的用量就越多（见第 1、2 篇的注意事项）。
- **无人值守却想关掉所有检查**，或在没有隔离的环境里用 `bypassPermissions`：第 4 篇明确反对这么做。合并、force push、删数据、对客户发消息这类不可逆的操作，还是要由人来决定。

## 四篇怎么串起来

四篇的顺序，就是一件工作的流程：先装好工具，再看懂、设计，接着证明能用，最后用原则指挥，让它在边界内自己跑。

![四篇：安装与挑 playbook、看懂再设计、证明能用再送审、原则与自己跑](series-map.zh-CN.webp){: w="800" h="450" }
_四篇按工作流程排列，每篇处理其中一段，细节都写在各篇里。_

主线大致是这样：先装好、选好模型，之后每个任务都交给 `/poteto-mode`（第 1 篇）；动手改之前，先用 `/how`、`/why`、`/architect` 这类工具看懂代码，再比较设计（第 2 篇）；接着按实现、清理、验证、送审的顺序把活干完，合并仍由你决定（第 3 篇）；日常则用原则名称调整方向、把习惯做成自己的 mode，需要时写好完成条件和边界，让它自己跑，第二天早上再看决策记录（第 4 篇）。

## 四篇各讲什么

### 第 1 篇：安装、选模型，再用 /poteto-mode 挑 playbook

第一次用，该从哪里开始？这篇介绍两种安装方式、怎么检查并固定版本、怎么用 `/setup-pstack` 选模型，以及 `/poteto-mode` 的任务描述该怎么写。读完你会知道，不必先背下所有 skill 名字也能上手；卡住时，先问 `/poteto-help` 就好。

→ [第 1 篇：安装、选模型，再用 /poteto-mode 挑 playbook](/posts/pstack-install-routing/)

### 第 2 篇：改代码之前，先看懂再设计

面对不熟的代码，怎么让 AI 先搞懂再动手？这篇介绍 `/how`、`/why`、`/architect`、`/interrogate` 和 `/arena`，包括什么时候用、命令怎么写、会拿到什么，以及下一步怎么接。大部分小改动并不需要它们；真的需要时，顺序是先看懂、比较设计，最后才动手改。

→ [第 2 篇：改代码之前，先看懂再设计](/posts/pstack-understand-design/)

### 第 3 篇：写完代码之后，先证明它能用再合并

代码写完了，怎样才算真的能用？这篇把流程拆成实现、清理、验证、送审四个阶段，会讲到 playbook、`/tdd`、验证 skill、开 PR 和 babysit。另外，开 PR 不会自动开始 babysit；要不要合并，永远由你决定。

→ [第 3 篇：写完代码之后，先证明它能用再合并](/posts/pstack-build-verify-merge/)

### 第 4 篇：用原则指挥 AI、做出自己的 mode，再放心让它自己跑

想改 AI 的做法，不必每次都写一大段话。这篇会讲怎么用原则名称中途指挥 AI、怎么用 `/automate-me`、`/reflect`、`/correct` 做出自己的工作方式；也会讲让它无人值守之前，要先写好的六段提示、权限与费用上限，以及第二天早上怎么用 `/show-me-your-work` 检查决策记录。

→ [第 4 篇：用原则指挥 AI、做出自己的 mode，再放心让它自己跑](/posts/pstack-principles-customization/)

## 依你的情况选起点

![三种阅读路线：第一次用从第 1 篇、改代码前从第 2 篇、已会用想自己跑从第 4 篇](reading-routes.zh-CN.webp){: w="800" h="450" }
_先找出你现在卡在哪一步，再点进对应的那一篇；不必把四篇按顺序读完才动手。_

| 你的情况 | 建议从哪里开始 |
| --- | --- |
| 还没装过，或不知道命令怎么调用 | [第 1 篇](/posts/pstack-install-routing/) |
| 已会用 `/poteto-mode`，但经常一动手就改错方向 | [第 2 篇](/posts/pstack-understand-design/) |
| 功能写完了，卡在“怎样才算证明能用”或开 PR | [第 3 篇](/posts/pstack-build-verify-merge/) |
| 日常使用已经上手，想用原则指挥、做自己的 mode，或让它无人值守地跑 | [第 4 篇](/posts/pstack-principles-customization/) |
| 只想先知道这套东西是什么 | 先读完这篇，再按上表跳过去 |

## 版本说明

这个系列每篇钉的版本不一样，读的时候请以该篇开头的版本框为准：

| 篇 | pstack | commit |
| --- | --- | --- |
| 第 1 篇 | `0.15.29` | `88d4751` |
| 第 2 篇 | `0.15.30` | `eb4db2b` |
| 第 3 篇、第 4 篇、本导读 | `0.15.36` | `c742dd6` |

> **版本**：本导读以 pstack [`0.15.36`](https://github.com/cursor/plugins/blob/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/.cursor-plugin/plugin.json) 为准，对应 `cursor/plugins` 的 commit `c742dd6`（2026-10-28 07:12，台北时间）。我在 2026-11-05 查证时，`cursor/plugins` main 最新的 commit 是 `bb68f23`（2026-11-04 15:20，台北时间），`c742dd6` 之后 pstack 文件夹都没有变动；Claude Code 最新是 2.1.318。之后的版本，数量和行为都可能改变。
{: .prompt-info }

如果想装和这篇导读相同的版本，请先 clone 下来、checkout 到 `c742dd6`，再加进 marketplace；详细步骤和不钉版本的风险，见[第 1 篇](/posts/pstack-install-routing/)和[供应链与权限风险](/posts/coding-agent-supply-chain-permission-risks/)。

## 结论

pstack 是 Cursor 官方插件库里的一套 skill，在本导读钉的版本里有 58 个 skill、24 条原则、23 个 playbook。先跑一次 `/setup-pstack`，平时记住 `/poteto-mode`，卡住时问 `/poteto-help`。四篇依次处理安装与挑 playbook、看懂再设计、证明能用再送审、用原则指挥并在边界内自己跑；你不必按顺序读完，找出自己卡在哪一步，从那一篇开始就好。

## 延伸阅读

- [官方 pstack（本导读钉选的 commit）](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack)：README、指南与各个 skill。
- [指南目录](https://github.com/cursor/plugins/tree/c742dd61706fbacc1b95f1a20b7b988cf096ce6c/pstack/docs/guide/)：从安装、overnight、原则到做出自己的 mode。
- [第 1 篇](/posts/pstack-install-routing/)｜[第 2 篇](/posts/pstack-understand-design/)｜[第 3 篇](/posts/pstack-build-verify-merge/)｜[第 4 篇](/posts/pstack-principles-customization/)
- [mattpocock/skills 系列导读](/posts/mattpocock-skills-series-guide/)和[系列（1）](/posts/mattpocock-skills-setup-routing-guide/)：另一套 skill 的系列文章。
- [自己写 Agent Skill：从 SKILL.md 结构到触发测试与维护](/posts/agent-skill-authoring-guide/)：skill 放哪里、`SKILL.md` 怎么写。
- [装了第三方 skill 和 MCP 之后，你的 Coding Agent 多了哪些破口？](/posts/coding-agent-supply-chain-permission-risks/)：权限、沙箱和锁版本。
