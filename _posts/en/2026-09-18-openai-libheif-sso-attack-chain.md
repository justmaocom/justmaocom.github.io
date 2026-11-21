---
title: "From a Forum Image Upload to Codex: The HEIF and SSO Attack on OpenAI"
description: "Hacktron chained a Discourse image bug and an SSO flaw to reach OpenAI accounts and internal GitHub. What's verifiable, what was fixed, and what to audit."
date: 2026-09-18 14:24:48 +0800
categories: [Security, Attack Chains]
tags: [application-security, sso, codex, discourse, libheif]
media_subpath: /assets/img/posts/openai-libheif-sso-attack-chain/
image:
  path: cover.en.webp
  alt: "How far a forum image bug can reach depends on the trust behind SSO and Codex, so access reviews must count what AI agents can do."
mermaid: true
---

> On July 25, our team hacked OpenAI. It took us less than 72 hours.
>
> Hacktron AI, [original post](https://x.com/HacktronAI/status/2100795824812777893)

You open an SSO access review sheet. The service name field just says "forum." The next column asks for the products and external resources reachable after login, and ChatGPT, Codex, and GitHub show up one after another. How does an image upload bug on a forum end up touching an internal code repository?

I based this scenario on the [incident write-up](https://www.hacktron.ai/blog/hacking-openai) Hacktron published in September 2026. The image-decoding vulnerability and Discourse's fix can both be fully verified from public sources. The OpenAI SSO misconfiguration, the employee account takeover, and the internal pull request rest only on the research team's word.

I keep those two kinds of evidence apart, because that is how you see what this incident is really warning us about.

## First, Separate the Two Vulnerabilities From the Attack Chain

This disclosure covers two different problems.

The first is CVE-2026-32882 in `libheif`. Discourse's [security advisory](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335) confirms that a malicious HEIF file uploaded as an image can lead to remote code execution. The advisory gives it a CVSS 3.1 score of 8.8 and lists four patched Discourse release lines.

The second problem is in OpenAI SSO. According to [Hacktron's incident report](https://www.hacktron.ai/blog/hacking-openai#intro), the team first gained access to the Discourse environment behind `community.openai.com`. The report says they then used an authentication configuration issue to take over the ChatGPT accounts of several OpenAI employees.

The team says Codex on one of those accounts was already connected to OpenAI's GitHub organization. By their account, they used Codex to open pull request `#1186742` in an internal monorepo, and then stopped testing.

For the second half of the chain, there is no public OpenAI SSO configuration, login exchange, or internal pull request to check against. So I can only confirm that "Hacktron reports this." I will not go further and conclude that Slack, email, or other connectors were also accessed, nor guess how wide the access went.

On the timeline, the two kinds of evidence show up interleaved:

| Time | What happened | Evidence source and limits |
| --- | --- | --- |
| 2026-07-23 | Hacktron says it began examining Discourse's image upload flow | [Research team's timeline](https://www.hacktron.ai/blog/hacking-openai#heap-buffer-overflow-in-libheif); self-reported |
| 2026-07-25 05:00 to 06:00 UTC | The team says it gained remote code execution and admin access in the forum environment | [Research team's timeline](https://www.hacktron.ai/blog/hacking-openai#intro); no public environment logs attached |
| 2026-07-25 13:30 to 15:30 UTC | The team says it took over employee accounts and opened an internal pull request | [Research team's timeline](https://www.hacktron.ai/blog/hacking-openai#intro); internal link not public |
| 2026-07-25 22:49 UTC | The team says OpenAI replied that the fix was complete | [OpenAI's reply as relayed by the team](https://www.hacktron.ai/blog/hacking-openai#intro); fix diff not public |
| 2026-07-27 | Discourse commits an isolation fix for image processing | [Public commit](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec); verifiable line by line |
| 2026-07-28 | Discourse publishes GHSA-vhm9-85gw-x335 | [Public security advisory](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335); lists versions and rebuild steps |

A tight timeline does not mean every step has the same quality of evidence. Whether the vulnerability exists can be checked against the advisory and the fix. Whether the attackers actually walked the whole path can, for now, only be judged from the research team's own records. The internal pull request is not public, so outsiders cannot check its contents. So I stop that row at "the team says it opened a PR," and do not infer from it how wide the access went.

In the diagram below, the green block and solid lines mark the parts you can verify against the public advisory and source code. The orange block and dashed lines mark the events as Hacktron's report describes them, with no configuration details disclosed.

```mermaid
sequenceDiagram
  participant A as Attacker
  participant D as community.openai.com
  participant M as ImageMagick
  participant L as libheif
  participant S as OpenAI SSO
  participant C as ChatGPT/Codex
  participant G as OpenAI GitHub

  rect rgba(34, 197, 94, 0.16)
    Note over A,L: Verifiable via public advisory and source code (solid lines)
    A->>D: Upload malicious HEIF file
    D->>M: Convert image
    M->>L: Decode HEIF
    L->>D: CVE-2026-32882 leads to remote code execution
  end

  rect rgba(245, 158, 11, 0.18)
    Note over A,G: Per Hacktron's report, configuration details not public (dashed lines)
    A-->>D: Exploit vulnerability to enter forum environment
    D-->>S: Abuse SSO configuration issue
    S-->>C: Take over employee accounts
    C-->>G: Codex uses existing GitHub connection
    G-->>G: Open internal monorepo PR
  end
```

As I see it, every time the chain crosses a privilege boundary, the security problem you have to deal with changes:

| Boundary crossed | Capability gained at that point | Evidence status | What to follow up on in a review |
| --- | --- | --- | --- |
| Uploaded file to image decoder | Native code processes attacker-controlled data | Verifiable via Discourse advisory and source | Formats, decoder version, executing process |
| Decoder to forum environment | Remote code execution on Discourse's image upload path | Verifiable via Discourse advisory | File permissions, network permissions, process isolation |
| Forum environment to OpenAI SSO | Forum compromise extended to OpenAI accounts | Hacktron report only | SSO trust settings, sessions, and fix records |
| Employee account to Codex | Use of the account's existing product capabilities | Hacktron report only | Agent permissions and available connectors |
| Codex to GitHub | Opening a pull request in an internal repo on the account's behalf | Hacktron report only | GitHub authorization scope, org policy, and audit logs |

I would not collapse these five rows into one sentence like "the forum had a bug." Each row has different people responsible for the fix, different records to check, and different controls that can reduce the impact.

## How a HEIF Image Reaches a Native Decoder

A HEIF file is not just an attachment sitting on the server: Discourse hands it to an image-processing program for conversion. The diagram below shows the call path in the post-incident [defensive fix](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec), starting in `lib/upload_creator.rb`.

```mermaid
flowchart TD
  U[Upload HEIF image] --> A["convert_heif!"]
  A --> B[execute_convert]
  B --> C[ImageMagick.magick]
  C --> S["Discourse::SafeExec.capture"]
  S --> M[ImageMagick]
  M --> L[libheif decodes]
  S -.- R1[Only allowed read/write paths]
  S -.- R2[Unlisted env vars cleared]
  S -.- R3[Network off]
```

`ImageMagick.magick` lives in `lib/image_magick.rb`, which the fix adds. It routes ImageMagick commands through `Discourse::SafeExec.capture`, and that wrapper applies the three restrictions in the diagram.

Networking is turned off with `seccomp_deny_network: true`. The goal of the three restrictions is to limit what the decoder can read, write, and connect to the next time something goes wrong in it.

The fix uses two strategies at once, and each answers a different question:

| Fix strategy | Problem it directly addresses | Work it leaves behind |
| --- | --- | --- |
| Update `libheif` | Fixes the known boundary calculation bug | Keep tracking distro backports and future decoder bugs |
| Isolate ImageMagick | Limits what the image process can read, write, and connect to | Confirm kernel support, allowlists, and the actual execution path |

Do only the first, and the next decoder bug still runs with the old privileges. Do only the second, and the known vulnerability stays in the image. As I see it, fixing the known bug and limiting the consequences of unknown bugs are both needed.

The upstream `libheif` [fix commit](https://github.com/strukturag/libheif/commit/85e21ad44eba931314337300a2376b8d28f085ae) rewrites the overlap area calculation in `HeifPixelImage::overlay`, converting the additions to `int64_t` before comparing bounds. The commit title is just "simplify overlay overlap area computation," with no sign that it is a security fix.

The diff shows what the code changed. It is not enough to reconstruct the full exploit, and it does not explain why downstream packages missed the fix.

## How SSO Extended the Forum Breach Into Codex

The public technical material on this leg is thin. Remote code execution on the forum is only the first leg of the attack chain. What happens next depends on how OpenAI SSO handles forum logins, and which products and connectors a logged-in account can use.

Hacktron says it verified an account takeover path that required no user interaction, then used Codex in a compromised account to operate on GitHub. Outsiders cannot reproduce this leg from what is available, because the public material does not disclose:

- The specific fields involved in the SSO misconfiguration
- Token contents
- The session exchange flow
- The fix diff

That is as far as I can say with confidence: what exists is an incident narrative. Hacktron says it reported the issue to OpenAI, but the core configuration has not been made public, so I would not treat it as a reproducible description of an OpenAI SSO vulnerability.

To examine this leg, I split "login" into three layers:

| Layer | Question it answers |
| --- | --- |
| Identity verification | Who does the system think is logging in? |
| Service trust | Which products does a login session established on one service carry over to? |
| Agent authorization | Which external resources can Codex operate on behalf of this identity? |

What this case lacks most is technical detail on the second layer. The public material does not say what credentials the forum side held, what login session OpenAI SSO accepted, or which piece of decision logic the fix changed.

For the third layer, all I know is the outcome Hacktron describes: Codex was connected to GitHub and was used to open a pull request. Keeping the three layers apart stops a vague "SSO was broken" from covering up every open question.

![An SSO access review form where forum, ChatGPT, Codex, and GitHub are crammed into a field meant for a single line](sso-review-form.webp){: width="960" height="540" }
_When a login identity carries over to other services, one line on the review form quickly stops being enough._

## Upstream Version Numbers Alone Can Mislead You About Patch Status

Seeing `libheif 1.19.8` does not by itself mean a system is still vulnerable. Linux distributions backport security fixes without changing the upstream version number. So to judge patch status, you have to compare the full package revision against the distro's advisory.

Debian's [DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) lists CVE-2026-32882. It states that Debian 13 trixie fixed the issues in the advisory in version `1.19.8-1+deb13u1`. Upstream `1.19.8` and the package carrying `-1+deb13u1` do not have the same patch status.

If your asset inventory only records `libheif 1.19.8`, it is missing the information needed to judge patch status. At a minimum, I recommend keeping three things:

- The upstream version
- The full distro package revision
- The identifier of the image actually deployed

The first two tell you which backports the package includes. The last tells you whether the patched package actually made it into the runtime environment.

So "the scanner shows upstream version X" is not enough to close a ticket. The scan result is where the investigation starts; the distro advisory and the running image together determine the current state.

Once the package is fixed, you still have to confirm the running program has been replaced. I covered one example in [CVE-2026-123158: OpenSSH Password Bypass on Alpine (musl)](/posts/openssh-musl-password-bypass-alpine/): on Alpine, the fix is not complete until sshd has been restarted successfully after the package upgrade.

## Isolating Image Processing Has Deployment Prerequisites

A version inventory cannot answer the isolation question. The Discourse advisory calls the new Landlock and seccomp restrictions defense in depth, and notes that whether they take effect depends on kernel support. Discourse's [fix commit](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec) also notes that Landlock requires Linux 5.13 or later.

If the kernel does not support it, "the code now has a sandbox" does not mean "this host now restricts the image process." No package version, however new, will tell you which one is true. So deployment checks must cover both kernel capability and whether the restriction is actually enabled.

Security updates can also bring compatibility trade-offs. [DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html) explains that to fix CVE-2026-47178, another vulnerability listed in the same advisory, Debian will reject a class of images. These images are uncompressed, use 4:2:0 or 4:2:2 chroma subsampling, and use tiling or certain interleaving modes.

This is not a direct cost of CVE-2026-32882, and it does not mean all HEIF files will fail to decode. But it shows that you need to read every behavior change in a package advisory.

## Decide What to Check Based on Your Deployment

If you run Discourse yourself, the security advisory gives clear patched versions and rebuild steps; the next section lists the full procedure. Updating only through the web interface does not prove the underlying image has been replaced.

If you maintain another service that accepts HEIF or AVIF uploads, Discourse's version numbers do not apply. Instead, find out:

- Which process parses untrusted images
- Which `libheif` package it uses
- Which paths that process can read and write, and whether it can make network connections

Discourse's `SafeExec` implementation is a useful reference case, but I would not lift it directly into another framework as a fix.

If you only use a hosted service, you cannot inspect the provider's images yourself, so your work shifts to inventorying identities and connectors. List every product reachable after an SSO login, and every external resource that agents such as Codex have been authorized to operate on. That list is exactly the management question this case's public material leaves open.

The same chain of events lands on several different owners. You can use the table below to assign checks directly:

| Area of responsibility | First question to answer | Records to leave when done |
| --- | --- | --- |
| Application operations | Which upload paths invoke a HEIF or AVIF decoder | Code entry points, actual commands, and list of formats |
| Platform and containers | Which package revision is in the running image | Image identifier, package version, and advisory comparison |
| Host security | What restrictions actually apply to the image process | Kernel version, file allowlist, and network policy |
| Identity management | Which services a forum login session carries over to | List of SSO services, trust settings, and session rules |
| AI tool management | Which external resources each agent connector can operate on | Connector list, authorization scope, owner, and how to revoke |

If the only answer a row can give is "the system blocks it," I treat the check as unfinished. Each row should leave behind configuration, versions, or records that can be re-verified.

## Start by Checking the Deployed Image Against Package Advisories

For self-hosted Discourse, I would work through the table below in order. Every step needs a result you can sign off on:

| Step | Result to sign off on |
| --- | --- |
| 1. In the Discourse security advisory, find the release line you are on and its patched version | The release line you are on maps to a patched version listed in the advisory |
| 2. Check the full `libheif` package revision in your deployed image and compare it against that Linux distribution's security advisory | The full package revision matches the distro advisory |
| 3. Rebuild the application image following the Discourse advisory | The runtime environment demonstrably runs the patched image |
| 4. Confirm that the host kernel supports the isolation mechanism, and check the read/write and network restrictions on the image-processing process | The image process's file and network restrictions are observable in practice |
| 5. Inventory the products available to OpenAI SSO accounts and the external resources Codex is connected to | Every connector has an owner, a scope, and a way to revoke it |

The rebuild command for step 3 is quoted from the [Discourse advisory](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335):

```bash
./launcher rebuild app
```
{: .nolineno }

Before you run it for real, back up according to your deployment setup and read the version notes in the advisory that apply to you.

## My Take: Redraw Your SSO Trust Relationships

Once an AI agent is connected to company resources, a team should re-examine the trust relationships between its SSO services. This is my own judgment, and the public evidence does not yet fully support it. The image-decoding vulnerability, the Discourse fix, and the Debian package update above are the parts backed by sources you can check.

Traditional SSO inventories usually frame the question as "who can log in to which application." Once agents are in the picture, you also need to check "which systems can the agent operate on behalf of this identity."

The Codex-to-GitHub path Hacktron describes supports exactly this line of review. But the public evidence cannot prove the actual scope of OpenAI's tokens. Nor can it prove that re-partitioning single sign-on services would definitely have stopped that particular takeover.

This judgment does not require assuming the AI agent itself has a vulnerability. As long as an agent holds connector permissions the user granted, you have to count those permissions when assessing the consequences of an identity system being compromised.

It also changes how you frame incident exercises. Suppose the question stops at "what can someone see after an employee account is compromised." Then you need to push further and ask "what can this account command the agent to do." Reading data, modifying code, and opening pull requests are different permissions, and a single "connected to GitHub" cannot gloss over them.

Hacktron also says that HEIF Heist, the research effort covering multiple targets, ran for two months with three researchers and cost less than US$3,000 in tokens. [The cost section of the original post](https://www.hacktron.ai/blog/hacking-openai#costs-of-finding-these-vulnerabilities) does not provide per-run logs, and its scope is broader than this OpenAI incident.

So I would not use the number to estimate the cost of a typical attack. But it can remind people running exercises not to assume that reliably exploiting a memory corruption bug is work only large teams can afford.

The more practical change, I think, is to fold agent permissions into every identity review:

- Record the resource scope when a connector is added.
- Re-confirm it when someone changes roles.
- Be able to revoke it all at once when an incident happens.

None of this depends on the undisclosed details of OpenAI SSO, and it can also shrink the consequences of other account takeover incidents.

## Start by Checking What Your Logins and Image Process Can Touch

The smallest first step I'd suggest is to open your current access review sheet. Find one service that you can log in to via SSO and that supports agent connectors. Add a column for "external resources operable after login." On the technical side, start with the package revision of your image-processing process and its file and network permissions.

## Further Reading

- [Hacktron's full incident report](https://www.hacktron.ai/blog/hacking-openai): the timeline, the SSO takeover, and Codex opening an internal pull request, still the team's own account.
- [Discourse security advisory GHSA-vhm9-85gw-x335](https://github.com/discourse/discourse/security/advisories/GHSA-vhm9-85gw-x335): affected and patched versions, CVSS, and the official rebuild command.
- [Discourse's image-processing isolation fix](https://github.com/discourse/discourse/commit/a07188016987de1613c961277e2e928aaa7c37ec): how the `ImageMagick` wrapper, allowed read/write paths, and network restrictions land in code.
- [Debian security advisory DSA-6417-1](https://lists.debian.org/debian-security-announce/2026/msg00328.html): the full package revision, and the format compatibility change one of its fixes causes.
- [libheif's overlay calculation fix](https://github.com/strukturag/libheif/commit/85e21ad44eba931314337300a2376b8d28f085ae): the boundary calculation changes in `HeifPixelImage::overlay`.
- [Third-Party Skills and MCP Servers: The New Attack Surface in Your Coding Agent](/posts/coding-agent-supply-chain-permission-risks/): the same lesson applied to coding agents, where a small entry point's damage depends on the trust behind it.
