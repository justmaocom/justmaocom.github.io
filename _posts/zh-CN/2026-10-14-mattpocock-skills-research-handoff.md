---
title: "mattpocock/skills 系列（6）：查资料、做交接、学新东西，都有固定做法"
description: "写代码之外，还有很多事会拖慢进度：查资料、交接给下一个人、设置只有你能动手的账号、学一个新主题。本文介绍 research、wizard、handoff、teach 与 writing-for-agents 五个 skill，并沿用按席位计费的例子走一遍。"
date: 2026-10-14 14:30:00 +0800
categories: [AI, skills]
tags: [agent-skills, coding-agent, research, handoff, documentation]
media_subpath: /assets/img/posts/mattpocock-skills-research-handoff/
image:
  path: cover.png
  alt: "查资料、交接、配置密钥到写给 AI 的文档，背后是同一个原则：每件事只保留一份正本，其他地方附链接。"
---

前五篇谈的都是“把功能做出来”：问清楚需求、写规格、拆工作单、写代码、审查与合并。但实际做按席位计费时，还会遇到另一类事情：

- 支付服务的按比例收费规则怎么算？得有人去查官方文档。
- 原型要在另一个文件夹做，现在这段对话里谈好的东西，要怎么带过去？
- 支付服务的密钥（让程序能使用支付服务的一串密码）只有你能登录后台去拿，AI 帮不上忙。
- 你自己对“按比例计费”一知半解，想好好学一次。
- 项目给 AI 看的说明文档越写越长，AI 却常常没照着做。

这些事都不是写代码，却常常卡住进度。`mattpocock/skills` 用五个 skill 处理它们：`research`、`handoff`、`wizard`、`teach` 和 `writing-for-agents`。

> mattpocock/skills 系列｜第 6 篇
>
> - 上一篇（第 5 篇）：[代码写完之后，谁来看结构、审修改、解冲突](/posts/mattpocock-skills-design-review-integration/)
> - 系列导读：[这套 skill 是什么、六篇该怎么读](/posts/mattpocock-skills-series-guide/)
>
> 本文内容以 [`1.2.3` 版](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/package.json#L2-L10)为准。这五个 skill 在 `1.2.3` 都已存在，到目前最新的 `1.3.1` 也都还在。按席位计费的 skill 调用流程按原始指令推演；文中的 wizard 脚本语法检查则是实际运行结果。
{: .prompt-info }

> GitHub 上的主线在 `1.3.1` 之后，又替其中三个 skill 加了还没正式发布的小修正：[`wizard` 的脚本模板](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/wizard/template.sh)修了几个兼容性问题，[`handoff`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/handoff/SKILL.md#L8) 写明临时目录的找法，[`teach`](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/teach/SKILL.md#L110) 要求测验的正确答案不要老是放在同一个位置。这些修改不影响本文介绍的做法。
{: .prompt-tip }

## 先认识三个词

| 本文用词 | 一句话解释 |
| --- | --- |
| 第一手资料 | 东西的原始出处，例如官方说明书、源代码、规格书，而不是别人看完写的心得 |
| 后台助手 | 另外开一个 AI 在后台做事（和“登录后台”的后台不是一回事），你可以继续跟原本的 AI 聊别的 |
| 对话记忆 | AI 在这一次对话里记得的所有内容。开一个新对话，记忆就清空 |

## 五个 skill 各管什么

| skill | 做什么 | 什么时候用 | AI 会不会自己启动 |
| --- | --- | --- | --- |
| `research` | 派后台助手去查第一手资料，写成一份附出处的笔记 | 需要查官方文档、API（程序之间互相沟通的规则）等事实时 | 会 |
| `handoff` | 把目前的对话整理成一份交接单 | 要换文件夹、换工具或交给同事时 | 不会，要你手动调用 |
| `wizard` | 写一个一步一步带你操作的小脚本 | 遇到只有你能做的步骤，例如登录后台拿密钥 | 会 |
| `teach` | 在一个文件夹里，分好几次教你一个新主题 | 想真正学会某件事时 | 不会，要你手动调用 |
| `writing-for-agents` | 一份“怎么写给 AI 看的文档”的参考手册 | 写 skill 或项目说明文档 `AGENTS.md` 时 | 会 |

`handoff` 和 `teach` 都[设置成](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L5)[AI 不能自己启动](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L4)。交接和上课都是你决定要开始的事，AI 不该在聊天聊到一半时突然帮你做。

在 `ask-matt` 的路线图里，[`handoff` 被放在“阶段交界”](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L61-L69)，其他四个都在[不属于任何流程的单独板块](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L73-L86)，需要时才拿出来用。

## `research`：派一个助手去查原文

`research` 很短，[整份只有三件事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md#L6-L12)：

1. 开一个后台助手去查，你可以继续做别的。
2. 只查第一手资料，例如官方文档、源代码、规格书，每个说法都要追到真正的出处，不能引用别人的转述。
3. 把结果写成一份 Markdown 笔记（一种用简单符号排版的纯文本文件），每一句都附上出处，存在项目里习惯放笔记的地方；没有惯例就自己找个合理的位置，并告诉你放在哪。

为什么坚持第一手资料？想象你问路，路人说“前面左转应该就到了”，和你自己打开地图看，可信度差很多。网上的教程常常是某个版本的写法，换了版本就不准；官方文档和源代码才是现在真正的规则。

![左侧是一串“听说”：论坛心得引用博客、博客引用另一篇教程，越传越走样；右侧直接读官方文档、源代码和规格书，整理成一份每句都附出处的笔记；底部写着“每句话都追到原始出处”](research-primary-sources.png){: width="800" height="450" }
_二手文章一层一层转述，越传越走样；第一手资料才是现在的规则。_

查完之后，这份笔记不是终点。[`ask-matt` 说明](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L81)，研究结果要带进主流程的 `grill-with-docs`，当作讨论需求时的材料。查资料是为了帮你思考，不是替你做决定。

## `handoff`：写一张交接单给下一位

`handoff` 处理的是“换人接手”的情况。这个“人”可以是另一个 AI 对话，也可以是同事。

用医院交接班来比喻。下班的护士不会把整天的经过从头讲一遍，而是交一张单子：病人现在状况如何、还有什么要做、哪些记录可以去哪里查。`handoff` 做的就是这张单子。

它的规则只有[五条](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L8-L16)：

1. 把目前的对话整理成一份交接文档，存在电脑的临时目录，不放进项目里。
2. 文档里要有一段“建议使用的 skill”，告诉下一位该先调用哪些 skill。
3. 已经写在别处的东西不要重抄，例如规格、工作单、commit（把一批修改存成一个版本并附上说明），只要附上路径或链接。
4. 把敏感数据遮掉，例如密码、密钥和个人数据。
5. 你调用它时如果顺便说了“下一段要做什么”，交接单就针对那件事来写。

第 3 条最重要。交接单要短，才有人会看；重抄一遍规格，不但变长，两份内容之后还可能对不上。

![左侧是一长串对话记录，从头卷到尾都还没看到重点；右侧是一张交接单，只列出“做到哪”、“下一步”、“建议使用的 skill”、“参考链接”四栏，密码已遮掉；底部写着“交接单只写下一位需要的，其余附上链接”](handoff-note.png){: width="800" height="450" }
_下一位不需要整段对话，只需要一张写清楚现状和下一步的单子。_

### 什么时候才需要交接单

`ask-matt` 对它的使用时机[写得很窄](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L67)：只有在换了一套 AI 工具、换了一个文件夹、交给同事，或是做到一半要分出一件支线工作时才用。

其他时候有更省事的选择，例如直接在原对话继续，或让工具自动把对话浓缩成摘要后接着做。第 4 篇的 `prototype` 就是典型的使用时机：原型放在另一个文件夹，所以[去的时候交接一次，回来时再交接一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md#L18-L21)，把原型学到的东西带回原本的讨论。

## `wizard`：只有你能做的步骤，让程序带你做

有些事 AI 真的做不了：登录支付服务的后台复制密钥、在云服务商的网站上按几个按钮、把密码存进 GitHub 的加密设置里。这些步骤每次都要重新跟 AI 解释一遍，很烦。

`wizard` 的做法是[写一个交互式的小脚本](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L8)，像家具组装说明书那样一步一步带你：它会替你打开网页、告诉你按哪里、复制什么，等你粘贴之后，自动把值存到该放的地方，每一步都让你确认，也显示还剩几步。

这个小脚本是 bash 脚本，也就是一串在终端（输入文字命令的窗口）里依次运行的命令。外观和交互的部分已经[写好在模板 `template.sh` 里](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L10)，包括进度显示、隐藏输入密码、重复运行不会写坏配置文件等等。AI 只要负责规划步骤、填入每一步的内容，模板上半部的共用代码一律不准改。

![左侧是一个终端界面，显示“步骤 1/2：支付服务密钥”，下方提示已打开网页、请粘贴密钥，输入的内容显示成圆点；右侧列出结果：密钥写入 .env、需要的密钥存进 GitHub 加密设置；底部写着“只有你能做的事，让程序一步一步带你做”](wizard-human-steps.png){: width="800" height="450" }
_AI 写好步骤，你只要照着屏幕提示操作、粘贴数值。_

它分四步：

1. **[先列出所有手动步骤](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L16-L25)。** AI 先读项目的配置文件，例如 `.env`（存放密钥等配置值的文件）和自动化流程的配置，找出需要哪些值，再把步骤清单给你确认。每个值都要知道从哪里拿、要存到哪里、是不是机密。
2. **[写清楚每一步的路线](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L27-L31)。** 例如“后台 → 开发者 → API 密钥 → 显示测试密钥 → 复制”。AI 不确定现在的画面长怎样时，要问你或去查文档，[不准自己编出可能不存在的步骤](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L29)。
3. **[写成脚本](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L33-L37)。** 每一步只做一件事；机密用隐藏输入；执行无法撤销的操作前，一定要先问你。
4. **[检查并交给你](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L39-L44)。** AI 做语法检查，但[不会自己从头跑一遍](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L43)，因为脚本会打开浏览器、等人输入。它改用逐行对照的方式确认每个值都有收集、都存到对的地方。

脚本[默认只用一次](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L12)，做完就删。只有在你希望以后的人也能照着跑时，才放进项目，并在 README 加上说明，让下一个人直接跑脚本，不必再问 AI。

## `teach`：把 AI 当成家教，分好几次学

`teach` 和其他 skill 不同，它不是帮你做事，而是[教你学会一件事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L8)，而且默认要上好几次课。

所以它会把目前的文件夹当成你的学习文件夹，[把学习进度存成几种文件](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L12-L20)：

| 文件 | 像什么 | 放什么 |
| --- | --- | --- |
| `MISSION.md` | 学习目标卡 | 你为什么想学，学会之后能做到什么 |
| `RESOURCES.md` | 参考书单 | 值得信任的资料来源，以及可以请教别人的社区 |
| `lessons/` | 一堂一堂的讲义 | 每堂课一个网页文件，只教一件小事 |
| `reference/` | 小抄 | 从课程浓缩出来、方便日后查的重点 |
| `learning-records/` | 学习日志 | 你已经学会什么，用来决定下一堂教什么 |

### 先问你为什么要学

[第一件事是搞清楚你学这个的目的](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L71-L79)。目的不清楚，课程就会变得空泛，AI 也无从判断下一步该教什么。目标要具体，[“十月前跑完半程马拉松”比“变健康”好](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/MISSION-FORMAT.md#L28)。

### 每堂课只教一点点，而且要动手

[每堂课都要短](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L53)，因为人一次能记住的东西很少。每堂课要让你得到一个看得见的小成果，难度则要[刚好比你现在的程度高一点](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L83-L89)，太简单学不到东西，太难又会放弃。

它也很在意“真的记住”。[原文把记忆分成两种](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L36-L45)：当下想得起来，和过一阵子还记得。当下想得起来容易让人以为自己学会了，所以它会用“不看资料自己回想”、“隔几天再练一次”这类方法，让你记得更久。

另外两个细节：知识一律[从可信的资料来，不靠 AI 自己的印象](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L30)；碰到需要实战经验的问题，它会[推荐你去相关社区问真正做过的人](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L116-L120)。

## `writing-for-agents`：写给 AI 看的文档，也有写法

前面那些 skill 本身，以及项目里的 `AGENTS.md`（放在项目里、告诉 AI 这个项目该怎么做事的说明文档），都是“写给 AI 看的文档”。`writing-for-agents` 就是写这类文档的参考手册，目的是让 AI [每次都用同一套方式做事](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L6)。

整份手册很长，我挑出最实用的六个重点：

1. **指引句的写法，决定 AI 会不会去读那份文档。** 例如 `AGENTS.md` 里写“改计费功能前，先读 `docs/billing.md`”。[原文说](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L12)，AI 有没有去读，看的是这句话写得够不够清楚，而不是那份文档写得多好。
2. **一直放着的文本都有成本。** `AGENTS.md` 的每一行，AI 每次对话都要读过一遍。[原文把成本分成两种](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L20-L27)：AI 要一直记着的字，和人要自己记得有哪些文档。
3. **常用的放前面，少用的另外放。** 就像工具箱，常用的螺丝刀放上层，少用的工具收进下层抽屉，再贴张标签写明里面有什么。[每次都会用到的写在主文档，只有某些情况才用到的，搬到另一份文件](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L39)。
4. **每一步都要写清楚“怎样算做完”。** [“理解需求”太模糊，AI 很容易提早喊完成](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L47-L52)；“每个改到的数据表都列出来”就清楚得多。
5. **说要做什么，不要只说不要做什么。** 跟人说“不要想大象”，对方脑中只剩大象。[原文建议直接写出想要的行为](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L74)，例如写“注释只写一行”，而不是“不要写长注释”。
6. **删掉 AI 本来就会做的句子。** [一句话如果拿掉之后，AI 的行为没有改变，它就只是占位置](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L81)。

如果写的是 skill，另一份 [`SKILL-MECHANICS.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL-MECHANICS.md#L5-L14) 说明怎么决定“让 AI 能自己启动”还是“只能你手动调用”：前者要一直占用 AI 的对话记忆，后者则要你自己记得它存在。这也解释了为什么 `handoff` 和 `teach` 被设成只能手动启动。

## 哪些地方要花你的时间

| 环节 | 由谁负责 | 要做什么 |
| --- | --- | --- |
| `research` 的问题 | 你 | 把要查的问题问清楚；查完后读笔记，确认出处真的支持那句话 |
| `handoff` 的时机 | 你 | 判断是不是真的要换地方或换人；不需要时就留在原对话 |
| 读交接单 | 下一位 | 先照“建议使用的 skill”开始，再依链接去读原始文档 |
| `wizard` 的步骤清单 | 你 | 确认步骤顺序和每个值该存到哪里 |
| 跑 `wizard` | 你 | 照画面登录后台、复制粘贴；无法撤销的操作要再确认一次 |
| `teach` 的学习目标 | 你 | 说清楚为什么想学、学会后要做到什么 |
| 上课 | 你 | 每堂课都要动手练习、做测验，看不懂就直接问 |
| 改 `AGENTS.md` | 你和 AI | 每加一行都问自己：拿掉它，AI 的行为会不会变？ |

最花你时间的是 `teach`，因为学习本来就得自己花力气，这部分 AI 替代不了。其次是 `wizard`，但它省下的是“每次都要重新跟 AI 解释一遍”的时间，跑过一次就值得。

## 什么情况用哪一个

| 你遇到的状况 | 用哪个 | 什么时候不适合 |
| --- | --- | --- |
| 需要查官方文档或源代码确认某条规则 | `research` | 答案就在项目里、读一个文件就知道时，直接读就好 |
| 要换文件夹、换 AI 工具，或把工作交给同事 | `handoff` | 还在同一个地方继续做时，留在原对话或让工具自动压缩对话 |
| 卡在只有你能操作的步骤 | `wizard` | AI 自己就做得到的事，[直接让它做](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L3) |
| 想真正学会一个主题 | `teach` | 只是想知道一个答案时，直接问就好 |
| 写 skill，或整理 `AGENTS.md` | `writing-for-agents` | 写给人看的文档，例如博客文章，用一般的写作原则 |

## 模拟情境：替按席位计费查资料、交接、设置密钥

以下的 skill 调用没有实际运行，流程按 `1.2.3` 版的原始指令推演。其中的 wizard 脚本是用 `1.2.3` 版的模板，为本文写的最小示例；我只用 bash 5.2.37 做了语法检查，没有实际运行，这也是 `wizard` 自己的规定。

### 先查清楚按比例收费的规则

第 3 篇用 `to-questionnaire` 问过财务负责人：月中添加席位后，要不要按剩余天数比例收费？假设财务选了按比例收费，接下来就要确认支付服务实际怎么算。你决定先查官方文档：

```text
$research 支付服务在订阅中途增加数量时，怎么按比例计算费用？只用官方文档与 API 参考。
```
{: .nolineno }

后台助手开始查的同时，你继续和原本的 AI 聊别的工作单。查完之后，项目里多了一份笔记，每一句规则都附上官方文档的链接（推演）。你把这份笔记带进 `grill-with-docs`，决定按席位计费要不要跟着支付服务的规则走。

### 交接到原型的文件夹

月中加席位的画面怎么呈现，你想先做个原型试试。原型要放在另一个文件夹，所以你调用了交接：

```text
$handoff 下一段要用 prototype 试做“月中加席位”的确认画面
```
{: .nolineno }

交接单可能长这样（推演）：

- **做到哪**：三张工作单都完成，计费规则已查好。
- **下一步**：做月中加席位的确认画面原型，比较两种写法。
- **建议使用的 skill**：`prototype`。
- **参考链接**：规格、第三张工作单、刚才的研究笔记，都只附路径，不重抄内容。

你在原型文件夹开一个新对话，把这张交接单给它，就能直接接手。

### 用 wizard 设置支付服务的密钥

要接上真正的支付服务，得先拿到密钥，这只有你能登录后台去拿。AI 读了 `.env.example` 和自动化流程的配置后，列出两个步骤给你确认：拿 API 密钥，以及拿“每席价格”的 ID。确认后，它照模板写出脚本，步骤部分大致像这样：

```bash
TOTAL_STAGES=2

banner "Per-seat billing setup"

stage "Stripe: API keys"
say "We'll grab your Stripe test keys for local dev + CI."
open_url "https://dashboard.stripe.com/test/apikeys"
step "Copy the Publishable key (starts pk_test_)."
ask STRIPE_PUBLISHABLE_KEY "Paste the publishable key:"
step "Click 'Reveal test key' on the Secret key row, then copy it."
ask_secret STRIPE_SECRET_KEY "Paste the secret key:"
write_env STRIPE_PUBLISHABLE_KEY "$STRIPE_PUBLISHABLE_KEY"
write_env STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
set_secret STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"

stage "Stripe: per-seat price"
open_url "https://dashboard.stripe.com/test/products"
step "Open the seat product and copy its Price ID (starts price_)."
ask STRIPE_SEAT_PRICE_ID "Paste the price ID:"
write_env STRIPE_SEAT_PRICE_ID "$STRIPE_SEAT_PRICE_ID"

finish
```
{: file="setup-billing.sh（步骤部分）" }

第一步照抄了模板里的 Stripe 示例，第二步是为按席位计费加的。`ask_secret` 是隐藏输入，你粘贴的密钥不会显示在画面上；`set_secret` 只用在自动化流程真正需要的那一个密钥上。

接着做语法检查：

```bash
bash -n setup-billing.sh
```
{: .nolineno }

这条指令没有输出、退出码是 0（程序正常结束的信号），代表语法没问题。我没有实际跑这个脚本，因为它会打开浏览器、等人粘贴密钥，`wizard` 也[要求 AI 不要自己从头跑](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L43)。剩下的就是你在终端运行 `./setup-billing.sh`，照画面一步一步做。

## 我认为最该先用的是 `handoff` 的第 3 条

这一节是我自己的看法，原始资料没有直接这样说。

五个 skill 里，最容易被小看的是 `handoff`，它只有五条规则。但我觉得第 3 条“已经写在别处的东西不要重抄，只附链接”，不只适用于交接单。

`research` 的笔记附出处、`wizard` 把值存进 `.env` 而不是写在对话里、`writing-for-agents` 要求同一件事只写在一个地方，背后都是同一个想法：让每件事只有一份正本，其他地方都指向它。前五篇留下的规格、工作单和 `CONTEXT.md`，就是这些正本。

所以我会先从交接单开始练习：交接前先问自己，这段内容是不是已经写在某份文档里了？如果是，就只附链接。

不过，这个习惯有个前提：正本得真的存在，而且有人维护。如果项目从来不写规格，交接单只附链接就等于什么都没交代，这时还是得把重点写进交接单里。

## 小结

写代码之外的事，也可以有固定做法：

- 要查事实，用 `research` 派助手去读第一手资料，带回附出处的笔记。
- 要换地方或换人，用 `handoff` 写一张只列重点、其他附链接的交接单。
- 卡在只有你能做的步骤，用 `wizard` 让程序一步一步带你做。
- 想真正学会一件事，用 `teach` 分好几次、边学边练。
- 写给 AI 看的文档，照 `writing-for-agents` 的原则：写清楚、放对位置、删掉没用的句子。

回到按席位计费，下一步是在终端跑一次 `./setup-billing.sh`，把支付服务的密钥设置好，再到原型文件夹，用交接单开始试做月中加席位的画面。

## 延伸阅读

- [`research`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md#L1-L12)：只有三步的完整指令。
- [`handoff`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md#L1-L16)：交接单的五条规则。
- [`wizard`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md#L1-L44)：四个步骤和每一步的完成条件；[`template.sh`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/template.sh#L182-L204) 则是脚本模板，最后一段是 Stripe 的示例步骤。
- [`teach`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md#L1-L140)：学习文件夹的结构，以及课程该怎么设计；[`MISSION-FORMAT.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/MISSION-FORMAT.md#L1-L31) 是学习目标卡的格式。
- [`writing-for-agents`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md#L1-L81)：写给 AI 看的文档的完整原则；[`SKILL-MECHANICS.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL-MECHANICS.md#L1-L22) 说明 skill 的启动方式怎么选。
