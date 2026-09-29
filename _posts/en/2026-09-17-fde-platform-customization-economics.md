---
title: Whether FDE Scales Depends on a Shared Platform, Not Headcount
description: A walkthrough of Kevin Bai's framework for forward deployed engineering, covering when you need FDEs, how a shared platform absorbs custom work, and the maintenance costs you have to pay before you expand the team.
date: 2026-09-17 16:15:05 +0800
categories: [Software Engineering, FDE]
tags: [fde, forward-deployed-engineer, enterprise-software, go-to-market, product-platform, talk-notes]
media_subpath: /assets/img/posts/fde-platform-customization-economics/
---

You've sold an enterprise a platform that only becomes useful once someone builds on top of it. The contract is signed, and the first onboarding meeting is underway. But the only thing on the projector is a blank workflow diagram. The customer knows they want to improve their product listing rate or sales throughput, but has no idea how to assemble the platform into a working solution.

The real problem here is where delivery ends. When a customer can afford the platform but lacks the engineering capacity to turn it into results, how much customization should the vendor deliver, and how do you keep every deal from turning into a new maintenance liability?

## FDEs deliver customer outcomes on top of a platform

FDE stands for Forward Deployed Engineering: engineers work directly with customers to build the solutions they need on an existing software platform. At the end of his talk, Kevin Bai boiled the role down to one phrase: ["a customer-facing software engineer"](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=1019s). The company has to be willing to hold these people to the same hiring bar as software engineers, and also to put them directly in front of customers.

This post covers the AI Engineer World's Fair 2026 talk [Forward Deployed Engineering 101](https://ai.engineer/talks/KwhgfwOSToQ-forward-deployed-engineering-101). The official page lists the runtime as 17 minutes 48 seconds. In his introduction, Bai said he works on Anthropic's applied AI team, was previously one of the earliest members of Rippling's FDE team, and before that worked at Palantir. Those experiences shape his point of view; this post discusses the talk itself, not Anthropic's current work.

{% include embed/youtube.html id='KwhgfwOSToQ' %}

From [3:03 to 3:35](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=183s), Bai explains what an FDE actually delivers. The customer gets software and engineering services together, and what they ultimately sign off on is a business outcome built on the platform. The engineer has to understand the customer's business and then use the platform to build the application, workflow, or solution. In this post I'll use the term GTM (go-to-market) to mean how a company reaches customers, closes deals, and keeps serving them.

## Look at product complexity together with buyer capability

Bai borrows the Punnett square (the 2×2 grid from biology) to explain when FDE applies. One axis is how much technical skill it takes to use the product; the other is whether the buyer can absorb that complexity. From [4:03 to 5:15](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=243s) he walks through three of the combinations.

| Product and platform | Buyer or user | Who handles the complexity | Verdict in the talk |
| --- | --- | --- | --- |
| Technical products like GitHub and Datadog | CTOs, CIOs, software engineers | Technical users learn and operate it themselves | No FDE needed |
| Configurable tools like Rippling, Jira, and Slack | Non-technical buyers and users | Users get the job done through configuration | No FDE needed |
| Technical platforms you have to build on | Non-technical business buyers | The vendor sends engineers to build the customer's solution | Worth evaluating FDE |

This table is Bai's classification from the talk, not an assessment of everything these products can do. The talk also doesn't discuss the fourth combination, so I won't fill in a fourth quadrant here or present my own guesses as the speaker's conclusions.

The key is the third row. The buyer knows exactly what outcome they want, but has no engineering team that can build on the platform. If the vendor hands over only the tool, the customer still has to recruit, train, and manage engineers themselves. At [6:00](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=360s), Bai describes FDE as lending the customer engineers who already know the platform.

## A shared platform keeps custom requirements maintainable

FDEs do write custom code, but they don't start from an empty project. From [8:42 to 9:05](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=522s), Bai says engineers should assemble applications and workflows from capabilities the shared platform already provides. The product team maintains those capabilities in common, and each customer solution handles only what's different.

Foundry Ontology is the only example named in the talk. [Palantir's official docs](https://www.palantir.com/docs/foundry/ontology/overview) describe the Ontology as an operational layer that sits on top of datasets, virtual tables, and models. It maps data into business objects, properties, and relationships, and also provides actions, functions, and dynamic permissions. That lets FDEs use data and operational capabilities that are already maintained, instead of rebuilding the same foundation for every customer.

Custom work still needs boundaries. From [16:10 to 16:48](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=970s), Bai offers a simple rule: behavior that serves only one customer stays in that customer's implementation; capabilities that can serve multiple customers should eventually move back into the shared platform. The talk doesn't give a number for "how many customers makes something shareable," so that threshold is still the product team's call.

## Treating FDE as staff augmentation misreads the cost structure

A common but inaccurate way to put it is: "FDE just means sending engineers to the customer's site to do contract work." From [8:13 to 8:52](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=493s), Bai draws the line directly. If every engineer builds a system from scratch for every customer, the company is running a development services business, not what he calls platform-based FDE.

What actually changes the cost structure is how much already-maintained capability the custom code shares, not where the engineers sit. Without a platform, every new contract brings another set of dependencies, another deployment pipeline, and another support obligation. The talk captures this maintenance situation with the line "engineers don't want to learn 55 repos," then points out that maintenance costs eat into the P&L.

![On the left, with no shared platform, a job posting demands maintaining 55 repos, and the candidate calls the role a human package manager; on the right, a data model, actions, and permissions support different requirements](fde-hiring-test.png){: width="1200" height="675" }
_Same FDE title, but the underlying platform changes what the engineer maintains every day._

The financial figures in the talk can't directly prove this model is profitable, either. From [6:39 to 7:07](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=399s), Bai compares several companies by ACV (average contract value). He cites Palantir at $4 million, ServiceNow at $1.2 million, and Workday at $600,000, with qualifiers like "last I checked" and "I think." The [official annotated transcript](https://ai.engineer/talks/KwhgfwOSToQ-forward-deployed-engineering-101#commercial-case) explicitly notes that these figures have no measurement date, calculation method, or independent ranking. They only illustrate the speaker's business argument and can't be treated as an apples-to-apples comparison between companies.

## A platform controls maintenance costs; it doesn't eliminate them

Even with a shared platform, you still have to maintain customer solutions. From [10:38 to 11:12](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=638s), Bai lists a platform as a prerequisite for building an FDE team, while stressing that the maintenance burden remains substantial even when the platform is solid. A platform reduces duplicated building; it doesn't make customer differences go away.

Scattered knowledge is the second cost. In the Q&A from [15:05 to 15:29](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=905s), Bai recommends having multiple FDEs work on a project together so the full context doesn't live in one person's head. The team has to set aside time for handoffs, support, and building shared understanding.

The hiring bar doesn't drop just because the role is close to customers, either. From [16:59 to 17:25](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=1019s), Bai names two requirements for the ideal candidate: they clear the software engineering hiring bar, and the company is comfortable handing customer communication over to them. That means you can't staff FDE roles by simply swapping in presales or customer support people; both hiring and training have to cover engineering and customer communication.

## Two gates decide whether a company needs FDE

From [9:50 to 11:12](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=590s), Bai lays out two gates. The first is whether the company has to sell a technically complex product to non-technical buyers. The second is whether the company already has a shared platform, or is willing to invest in building one.

| Gate 1: gap between product and buyer | Gate 2: shared platform | Verdict |
| --- | --- | --- |
| Exists | Already have one, or committed to investing | You can evaluate a small FDE team |
| Exists | Don't have one and don't plan to build one | Hold off on expanding, or custom work turns into separately maintained projects |
| Doesn't exist | Not applicable | Technical buyers can be supported by a developer relations (DevRel) team; configurable products can use the normal sales and onboarding process |

AI doesn't remove these two gates. From [11:28 to 12:35](https://www.youtube.com/watch?v=KwhgfwOSToQ&t=688s), Bai explicitly flags one part of the talk as his personal hypothesis. He believes AI has made writing code and building custom software easier, and has made more platforms customizable. The talk doesn't provide cross-industry data showing that "almost every platform" will head in the same direction. In this post I treat AI only as a reason to re-check the two gates, not as sufficient grounds for building an FDE team.

## Run an FDE decision through one table

> This decision process hasn't been validated yet. It can rule out cases that clearly don't fit, but it can't estimate headcount, contract margins, or deployment timelines.
{: .prompt-info }

First, plugging the three product types from the talk into the two gates gives this:

| Example | Product requires building | Buyer can absorb the complexity | Has a shared platform | Result |
| --- | --- | --- | --- | --- |
| GitHub, Datadog | Yes | Yes | Not applicable | Technical GTM, no FDE needed |
| Jira, Slack | Mostly configuration | No | Not applicable | Normal sales and onboarding, no FDE needed |
| Foundry with non-technical industry buyers | Yes | No | Yes | Passes both FDE gates |

To apply this to your own company, take your most recent enterprise sales opportunity and fill in the five fields below. Write down only what you already know; any blank field is itself the next thing to investigate.

| Field | What to fill in |
| --- | --- |
| Customer outcome | The business result the customer will use to sign off, not product feature names |
| Build requirement | Whether this result requires writing code on the product, or can be done through configuration |
| Customer capability | Whether the customer has an engineering team that can build and maintain this work |
| Shared capabilities | Which of the data model, permissions, actions, and deployment approach are centrally maintained by the platform |
| Long-term ownership | Where customer-specific behavior lives, and which product team takes over shareable capabilities |

Only move into a small FDE pilot when the product requires building, the customer lacks engineering capacity, and the shared capabilities already exist. If the first two hold but the platform field is still blank, define the platform investment and maintenance ownership first. If there's no capability gap between the product and the buyer, sticking with your existing GTM approach is more direct.

## My take

The transcript, the platform docs, and the two gates above can all be checked; what follows is my own judgment, and the available evidence isn't enough to prove it applies to every B2B software company. I see FDE as a joint decision about product architecture and GTM, and the number of engineers is just the staffing outcome that follows from that decision.

If the product team hasn't defined which capabilities are centrally maintained, where customer differences live, and how frontline requirements flow back into the platform, hiring FDEs first will only multiply the number of customer project branches. Conversely, once the platform boundaries are clear, FDEs can spend their engineering time understanding the business and assembling solutions, rather than rebuilding foundational capabilities.

AI makes code faster to generate, but it doesn't decide for the company who carries the support burden. That's why product architecture has to be designed together with GTM. As customization gets cheaper, the company needs to be even clearer about who maintains which code over the long run.

## Validate the delivery gap before you open the job req

When a customer can afford the platform but lacks the engineering capacity to turn it into results, how much customization should the vendor deliver, and how do you keep every deal from turning into a new maintenance liability?

FDE can extend delivery all the way to customer outcomes, but the custom code has to be built on a shared platform. Differences that serve only one customer stay in that customer's implementation, while reusable capabilities go back to the platform team. That boundary determines whether the company delivers maintainable solutions or a pile of projects that each evolve on their own.

Pick a recent enterprise sales opportunity and fill in the five fields from the previous section. Only when there's a real capability gap between the product and the buyer, and a shared platform can absorb the repeated work, is FDE the next step worth validating.

## Further reading

- [Forward Deployed Engineering 101](https://ai.engineer/talks/KwhgfwOSToQ-forward-deployed-engineering-101): The official page provides an annotated transcript, full timestamps, and the resources mentioned in the talk, which makes it useful for checking this post's classifications and caveats line by line.
- [Palantir Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview): The docs list the Ontology's objects, relationships, actions, functions, and permissions, giving a concrete sense of which shared platform capabilities Foundry provides.
- [What Is a Forward Deployed Engineer?](https://fdepod.substack.com/p/test): Kevin Bai's follow-up article breaks FDE down into three jobs (consultant, product manager, and engineer) and stresses that the role should be used on high-value, ill-defined problems.
