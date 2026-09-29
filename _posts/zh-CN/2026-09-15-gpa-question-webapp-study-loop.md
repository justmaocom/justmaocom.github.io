---
title: 采购法 PDF 题库变成不靠题序记忆的练习网站
description: 从解析题库、随机组卷，并用跨练习统计找出弱项
date: 2026-09-15 13:42:04 +0800
categories: [软件开发, Web应用]
tags: [python, fastapi, sqlalchemy, postgresql, pdf-parsing, side-project]
media_subpath: /assets/img/posts/gpa-question-webapp-study-loop/
---

做这个项目，是因为老婆报名了采购法资格考试。

直接照着 PDF 题库练习几次，很容易连题目顺序和答案一起记住。下一页还没翻，答案已经先浮出来。这种熟悉感无法分辨记住的是题目内容，还是答案在 PDF 里的位置。

要解的问题是：怎么把固定题库改造成每轮顺序不同、还能留下弱项的练习？

![左侧照固定题序能预告答案，右侧题序洗牌后显示理解度重新加载中](pdf-order-memory.png){: width="800" height="430" }
_题序一洗牌，熟悉感就不能代替理解。_

## 这是一套把官方题库变成练习记录的 Web App

[gpa-question-webapp](https://github.com/7a6ac0/gpa-question-webapp) 是一套政府采购法题库练习网站。本文检查的版本是 commit [`b29fe3f`](https://github.com/7a6ac0/gpa-question-webapp/tree/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb)。项目声明的版本是 `0.1.0`，需要 Python `3.11` 以上，并使用 FastAPI、SQLAlchemy、Jinja2、pdfplumber 与 python-docx。这些信息都写在 [`pyproject.toml`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/pyproject.toml#L5-L21)。项目采用 [MIT License](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/LICENSE#L1-L20)。

它接手已下载到本地的官方 PDF 或 DOCX，通过 [`parse_command`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/cli.py#L39-L86) 将题目写进数据库。浏览器端的路由覆盖随机练习、立即对答案、单次成绩与跨练习弱项统计，入口集中在 [`src/api/main.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/main.py#L5-L40)。

整体架构有两条数据路径。上半部把手动下载的官方题库交给 CLI，解析后写进 PostgreSQL；下半部由浏览器界面调用 FastAPI，读写题目、session 与作答记录。

![官方题库经本地文件与导入 CLI 写入 PostgreSQL，浏览器则经界面和 FastAPI 读写练习数据](system-architecture.png){: width="1200" height="548" }
_架构图依据 commit `b29fe3f` 绘制；[打开交互版](/assets/img/posts/gpa-question-webapp-study-loop/system-architecture.html)。_

## 数据怎么从 PDF 走到一道可作答的题目

第一段是导入。CLI 扫描输入目录中的 `.pdf` 和 `.docx`，再依扩展名交给对应解析器。若没有指定类别，文件名开头的 `1` 到 `13` 会被当成类别编号。实现可见 [`src/ingestion/cli.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/cli.py#L39-L84)。

PDF 解析器先用“是非题”与“选择题”切段，再用正则表达式辨识题号及答案。选择题答案 `1` 到 `4` 会转成 `A` 到 `D`。实际规则写在 [`src/ingestion/pdf_parser.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/pdf_parser.py#L11-L19)。

```python
MC_QUESTION_START = re.compile(r"^\s*(\d+)\s+([1-4])\s+(.+)")
TF_QUESTION_START = re.compile(r"^\s*(\d+)\s+([OX])\s+(.+)")
ANSWER_NUM_TO_LETTER = {"1": "A", "2": "B", "3": "C", "4": "D"}
```
{: file="src/ingestion/pdf_parser.py" }

第二段是去重与更新。每题的 `source_hash` 由类别、题型和题目文字符串接后计算 SHA-256。再次导入时，相同哈希会更新答案、选项或法规出处；来源里消失的题目则标上 `deleted_at`。完整流程在 [`src/ingestion/base.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/base.py#L13-L100)。

```python
@property
def source_hash(self) -> str:
    raw = f"{self.category_id}|{self.question_type}|{self.question_text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
```
{: file="src/ingestion/base.py" }

第三段才是练习。[`create_session`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L32-L97) 用 `func.random()` 打乱符合类别与题型的题目，再依要求的题数截取。初次取得的 [`QuestionResponse`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/models/schemas.py#L15-L23) 没有正确答案字段。提交答案后，[`submit_answer`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L100-L170) 才在服务器比对答案、记录结果并返回正解。

## 弱项不是猜的，是按类别累积出来

这里最需要确认的是“跨练习弱项”到底算了什么。

[`get_weakness`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L173-L225) 先用 `anonymous_id` 找出练习记录，再把所有作答依题目类别分组。各类别的正确率是答对笔数除以总作答笔数，结果按正确率由低到高排列。前端再筛出低于 `80%` 的类别，最多取五类组成“针对弱项练习”按钮，判断逻辑位于 [`src/templates/weakness.html`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/templates/weakness.html#L48-L69)。

```javascript
const weakCats = data.categories.filter(c => c.percentage < 80).slice(0, 5);
const weakIds = weakCats.map(c => c.category_id).join(',');
```
{: file="src/templates/weakness.html" }

所以这个判定有明确分母、门槛与排序方式。它算的是各类别历次作答的累积正确率，不是能力测验模型，也不会替近期成绩加权。同一题做过多次，每次作答都会进入统计。这些界线来自 `SessionAnswer.id` 的笔数汇总方式，不是 README 对功能的自我描述。

## 方便的代价是格式耦合与匿名识别

题库解析器直接依赖官方文档的布局文字与答案格式。只要段落标题不再是“是非题”或“选择题”，或选择题不再使用 `1` 到 `4`，现有规则就无法照原方式辨识。这项维护成本可从 [`_split_sections`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/pdf_parser.py#L57-L85) 与两个题型解析函数直接看出来。

运行环境也不是单一静态网页。[`docker-compose.yml`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/docker-compose.yml#L1-L29) 会启动应用程序与 PostgreSQL 16，并用 `pgdata` volume 保存数据。如果练习记录需要在磁盘故障后恢复，部署时还要另外安排备份。

目前的跨练习识别使用浏览器 `localStorage` 里的 `gpa_anonymous_id`，前端把它放进 `/api/weakness` 查询参数。这段流程写在 [`src/templates/weakness.html`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/templates/weakness.html#L12-L36)。对应路由只接收 `anonymous_id`，没有账号验证依赖。这对家用工具很省事，但它不是存放正式测验成绩的权限设计。

## 适合家用练习，不适合直接当正式考试系统

如果题库来源固定、用户范围明确，需求是打乱题序并找出常错类别，这个项目已经把必要流程接起来。题库有变动时，[`upsert_questions`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/base.py#L28-L100) 也能更新、保留或软删除现有题目，不必每次清空数据库。

如果要公开提供多人使用，还需要先处理账号、授权、数据隔离与备份策略。若题库布局经常改动，也要替解析器准备失败报告与新格式测试。现有代码适合自用练习工具，不能直接视为正式考试平台。

## 先跑测试，再接自己的题库

先确认依赖、CLI 入口与核心行为，再处理官方题库文件。以下命令已在 macOS、Python `3.14.2`、uv `0.9.17` 上实际运行。

```bash
git clone https://github.com/7a6ac0/gpa-question-webapp.git
cd gpa-question-webapp
uv sync --extra dev
uv run python -m src.ingestion.cli --help
uv run pytest -q
```
{: .nolineno }

实测结果为 `34 passed in 1.05s`，CLI 也列出了 `parse` 子命令。这只确认目前 commit 的安装与测试可以完成，不代表任何版本的官方 PDF 都能成功解析。下一步可从[公共工程委员会题库页面](https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion)下载一个类别的文件，放进 `data/`，再依[项目 README](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/README.md#L47-L58) 的导入命令处理。

## 真正有用的是留下可回头查的练习记录

上面的可查证内容只能确认功能确实存在，而我仍判断这个项目的价值在于完成一个复习循环，文中证据无法证明它会提高考试成绩。

固定 PDF 能提供题目和答案，网站则把每次答题留成数据。随机组卷切断题序提示，类别统计指出下一轮该练哪里。对这个家庭需求而言，技术选型只是手段，能持续完成“作答、发现弱项、再练一次”才是成品。

## 把第一份题库跑通

开头的问题是：怎么把固定题库改造成每轮顺序不同、还能留下弱项的练习？

这个项目的答案很具体。解析器把 PDF 变成可查询的题目，session 每次重新抽题，作答记录再按类别累积。它处理的是固定题序造成的熟悉感，适用范围是自用或小范围练习，不包含正式测验需要的权限与管理机制。

最小的下一步是 clone 项目并跑完测试。确认本地环境正常后，再拿一份官方题库验证解析结果。

## 延伸阅读

- [gpa-question-webapp 源代码](https://github.com/7a6ac0/gpa-question-webapp)：可直接对照本文提到的导入、作答与弱项统计实现。
- [公共工程委员会采购专业人员题库](https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion)：取得这个项目实际处理的官方题库来源。
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)：理解路由、响应模型与依赖注入的用法。
- [SQLAlchemy 2.0 文档](https://docs.sqlalchemy.org/en/20/)：查阅 session、查询与 ORM 关联的正式说明。
