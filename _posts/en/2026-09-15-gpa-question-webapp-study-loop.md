---
title: Turning a Procurement Act PDF Question Bank into a Practice Site That Doesn't Reward Memorizing Question Order
description: Parsing the question bank, building randomized quizzes, and using cross-session stats to find weak areas
date: 2026-09-15 13:42:04 +0800
categories: [Software Development, Web Applications]
tags: [python, fastapi, sqlalchemy, postgresql, pdf-parsing, side-project]
media_subpath: /assets/img/posts/gpa-question-webapp-study-loop/
---

I built this project because my wife signed up for the Government Procurement Act certification exam.

If you practice straight from the PDF question bank a few times, it's easy to end up memorizing the question order along with the answers. Before you even turn the page, the answer has already popped into your head. That kind of familiarity can't tell you whether you actually remember the material or just where the answer sits in the PDF.

The problem to solve: how do you turn a fixed question bank into practice rounds that come in a different order every time and still leave a record of your weak areas?

![On the left, a fixed question order lets you predict the answer; on the right, once the order is shuffled, understanding shows as "reloading"](pdf-order-memory.png){: width="800" height="430" }
_Once the question order is shuffled, familiarity can no longer stand in for understanding._

## A web app that turns the official question bank into practice records

[gpa-question-webapp](https://github.com/7a6ac0/gpa-question-webapp) is a practice site for the Government Procurement Act question bank. The version examined in this post is commit [`b29fe3f`](https://github.com/7a6ac0/gpa-question-webapp/tree/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb). The package declares version `0.1.0`, requires Python `3.11` or later, and uses FastAPI, SQLAlchemy, Jinja2, pdfplumber, and python-docx. All of this is listed in [`pyproject.toml`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/pyproject.toml#L5-L21). The project is released under the [MIT License](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/LICENSE#L1-L20).

It takes the official PDF or DOCX files you've already downloaded locally and writes the questions into a database through [`parse_command`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/cli.py#L39-L86). The browser-facing routes cover randomized practice, instant answer checking, per-session scores, and cross-session weak-area stats, all wired up in [`src/api/main.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/main.py#L5-L40).

The overall architecture has two data paths. In the upper half, the manually downloaded official question bank goes to a CLI, which parses it and writes it into PostgreSQL. In the lower half, the browser UI calls FastAPI to read and write questions, sessions, and answer records.

![The official question bank goes through local files and the import CLI into PostgreSQL, while the browser reads and writes practice data through the UI and FastAPI](system-architecture.png){: width="1200" height="548" }
_Architecture diagram based on commit `b29fe3f`; [open the interactive version](/assets/img/posts/gpa-question-webapp-study-loop/system-architecture.html)._

## How data travels from a PDF to an answerable question

The first stage is import. The CLI scans the input directory for `.pdf` and `.docx` files and hands each one to the matching parser based on its extension. If no category is specified, a leading `1` to `13` in the filename is treated as the category number. See [`src/ingestion/cli.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/cli.py#L39-L84) for the implementation.

The PDF parser first splits the document into sections using the Chinese headings for "true/false questions" (是非題) and "multiple-choice questions" (選擇題), then uses regular expressions to recognize question numbers and answers. Multiple-choice answers `1` to `4` are converted to `A` to `D`. The actual rules are in [`src/ingestion/pdf_parser.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/pdf_parser.py#L11-L19).

```python
MC_QUESTION_START = re.compile(r"^\s*(\d+)\s+([1-4])\s+(.+)")
TF_QUESTION_START = re.compile(r"^\s*(\d+)\s+([OX])\s+(.+)")
ANSWER_NUM_TO_LETTER = {"1": "A", "2": "B", "3": "C", "4": "D"}
```
{: file="src/ingestion/pdf_parser.py" }

The second stage is deduplication and updating. Each question's `source_hash` is a SHA-256 hash of its category, question type, and question text joined together. On re-import, a matching hash updates the answer, options, or legal reference; questions that have disappeared from the source get marked with `deleted_at`. The full flow is in [`src/ingestion/base.py`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/base.py#L13-L100).

```python
@property
def source_hash(self) -> str:
    raw = f"{self.category_id}|{self.question_type}|{self.question_text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
```
{: file="src/ingestion/base.py" }

Actual practice only begins in the third stage. [`create_session`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L32-L97) uses `func.random()` to shuffle the questions matching the chosen categories and types, then takes as many as requested. The [`QuestionResponse`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/models/schemas.py#L15-L23) you receive at first has no correct-answer field. Only after you submit does [`submit_answer`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L100-L170) check the answer on the server, record the result, and return the correct answer.

## Weak areas aren't guessed; they accumulate by category

The part most worth checking here is what "cross-session weak areas" actually computes.

[`get_weakness`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/api/routes/sessions.py#L173-L225) first looks up practice records by `anonymous_id`, then groups every answer by question category. Each category's accuracy is the number of correct answers divided by the total number of answers, and the results are sorted from lowest to highest accuracy. The frontend then filters for categories below `80%` and takes up to five of them to build a "practice weak areas" button. The condition lives in [`src/templates/weakness.html`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/templates/weakness.html#L48-L69).

```javascript
const weakCats = data.categories.filter(c => c.percentage < 80).slice(0, 5);
const weakIds = weakCats.map(c => c.category_id).join(',');
```
{: file="src/templates/weakness.html" }

So this assessment has a clear denominator, threshold, and sort order. It computes the cumulative accuracy of all past answers in each category. It isn't an ability-estimation model, and it doesn't give extra weight to recent results. If you answer the same question several times, every attempt counts toward the stats. These limits follow from how the code counts `SessionAnswer.id` rows, not from the README's description of the feature.

## The price of convenience: format coupling and anonymous identity

The question-bank parser depends directly on the layout text and answer format of the official documents. If the section headings no longer read "true/false questions" or "multiple-choice questions," or multiple-choice answers no longer use `1` to `4`, the current rules will stop recognizing them. You can see this maintenance cost directly in [`_split_sections`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/pdf_parser.py#L57-L85) and the two question-type parsing functions.

The runtime isn't a single static web page, either. [`docker-compose.yml`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/docker-compose.yml#L1-L29) starts the application and PostgreSQL 16, and persists data in a `pgdata` volume. If practice records need to survive a disk failure, you'll have to arrange backups separately when deploying.

Cross-session identity currently relies on `gpa_anonymous_id` in the browser's `localStorage`, which the frontend puts into the `/api/weakness` query string. This flow is in [`src/templates/weakness.html`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/templates/weakness.html#L12-L36). The matching route only accepts `anonymous_id` and has no account-authentication dependency. That's very convenient for a household tool, but it isn't an access-control design suitable for storing official exam scores.

## Good for home practice, not a ready-made official exam system

If your question bank comes from a fixed source, your users are a well-defined group, and what you need is shuffled question order plus a view of the categories you keep getting wrong, this project already wires the necessary pieces together. When the question bank changes, [`upsert_questions`](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/src/ingestion/base.py#L28-L100) can update, keep, or soft-delete existing questions, so you don't have to wipe the database every time.

If you want to make it publicly available to many users, you'll first need to handle accounts, authorization, data isolation, and a backup strategy. If the question bank's layout changes often, you'll also want failure reports and tests for new formats in the parser. The current code is suited to a personal practice tool and shouldn't be treated as an official exam platform as-is.

## Run the tests first, then plug in your own question bank

Confirm the dependencies, the CLI entry point, and the core behavior before dealing with the official question-bank files. The commands below were actually run on macOS with Python `3.14.2` and uv `0.9.17`.

```bash
git clone https://github.com/7a6ac0/gpa-question-webapp.git
cd gpa-question-webapp
uv sync --extra dev
uv run python -m src.ingestion.cli --help
uv run pytest -q
```
{: .nolineno }

The result was `34 passed in 1.05s`, and the CLI listed the `parse` subcommand. This only confirms that installation works and the tests pass at the current commit; it doesn't mean every version of the official PDF will parse successfully. As a next step, download one category's file from the [Public Construction Commission question bank page](https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion), put it in `data/`, and process it with the import command in the [project README](https://github.com/7a6ac0/gpa-question-webapp/blob/b29fe3fc0ccd9ba8b534a974d4c7921a78e007bb/README.md#L47-L58).

## What really matters is a practice record you can look back on

The verifiable material above only confirms that the features exist. I still believe this project's value lies in closing a review loop, though nothing in this post can prove it will raise exam scores.

A fixed PDF gives you questions and answers; the website turns every attempt into data. Randomized quizzes cut off the question-order cues, and category stats point to what to practice next round. For this household need, the tech choices are just a means to an end. The real product is being able to keep repeating the loop of "answer, find weak areas, practice again."

## Get your first question bank running end to end

The opening question was: how do you turn a fixed question bank into practice rounds that come in a different order every time and still leave a record of your weak areas?

This project's answer is concrete. The parser turns the PDF into queryable questions, each session draws questions afresh, and answer records accumulate by category. What it tackles is the familiarity caused by a fixed question order. It's meant for personal or small-scale practice and doesn't include the permissions and management features an official exam would need.

The smallest next step is to clone the project and run the tests. Once your local environment checks out, validate the parsing results with one official question-bank file.

## Further reading

- [gpa-question-webapp source code](https://github.com/7a6ac0/gpa-question-webapp): compare directly against the import, answering, and weak-area stats implementations discussed in this post.
- [Public Construction Commission procurement professional question bank](https://web.pcc.gov.tw/psms/plrtqdm/questionPublic/indexReadQuestion): the official question-bank source this project actually processes.
- [FastAPI documentation](https://fastapi.tiangolo.com/): learn how routing, response models, and dependency injection work.
- [SQLAlchemy 2.0 documentation](https://docs.sqlalchemy.org/en/20/): the official reference for sessions, queries, and ORM relationships.
