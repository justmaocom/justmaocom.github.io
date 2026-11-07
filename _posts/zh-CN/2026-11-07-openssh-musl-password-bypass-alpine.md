---
title: "OpenSSH 密码验证绕过漏洞：哪些主机受影响，Alpine 用户怎么修补？"
description: "OpenSSH 10.6p2 修补了只在 musl 加上无 PAM 的 sshd 才会出现的密码验证绕过（CVE-2026-123158）。这篇整理受影响条件、怎么确认主机，以及 Alpine 的修补步骤。"
date: 2026-11-07 18:00:00 +0800
categories: [信息安全]
tags: [application-security]
media_subpath: /assets/img/posts/openssh-musl-password-bypass-alpine/
image:
  path: cover.webp
  alt: "只有 musl、不经 PAM、密码登录仍开着的 sshd 受影响，软件包更新后还要重启。"
---

先讲结论：这次 OpenSSH 的密码验证绕过漏洞，**不是**所有运行 OpenSSH 的机器都会中招。Ubuntu、Debian、Fedora、RHEL 这类使用 glibc 的 Linux 不在这次的范围内，你笔记本电脑上的 `ssh` 客户端也不是问题所在。真正需要处理的，主要是 Alpine Linux 这类使用 musl、而且 SSH 服务器没有通过 PAM 验证密码的主机。

如果你有在 Alpine 上开 SSH，这篇会带你判断自己是否受影响，以及怎么安全地更新。

## 先弄清三个名词

**sshd 和 ssh 不一样。** `sshd` 是服务器端的程序，负责接受别人连进来；`ssh` 是你拿来连到别的机器的客户端。这次的问题出在 `sshd`，[OpenSSH 10.6p2 的版本说明](https://www.openssh.org/txt/release-10.6p2)标示的也是 `sshd(8)`。

**musl 是系统底层的 C 函数库。** 几乎每个程序都要靠 C 函数库做基本工作，例如把密码转成哈希值。大多数 Linux 发行版用 glibc，Alpine 用的是 musl。

**PAM 是一套验证框架。** 系统可以把“这组账号密码对不对”交给 PAM 处理。如果 sshd 不经过 PAM，它就会自己调用 C 函数库来比对密码，这次的问题就出在这条路上。

## 发生了什么事

OpenSSH 在 2026-11-05 发布 Portable OpenSSH 10.6p2，说明中写到这版包含一项“critical security workaround”，影响“使用 musl libc 且禁用 PAM 的 Linux 系统”。OpenSSH 也特别说明，他们认为根本原因不在 sshd，只是可以通过 sshd 被利用，所以在 sshd 这端挡掉。

同一天 [Alpine 发布安全公告](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)，并替 3.16 到 edge 的每个分支都推出修补软件包。这个漏洞的编号是 [CVE-2026-123158](https://cveawg.mitre.org/api/cve/CVE-2026-123158)，记录于 2026-11-05 23:46（台北时间）发布。

严重程度有两种说法，来源不同。OpenSSH 自己用的字是 critical。CVE 记录里，负责登记这条 CVE 的 MITRE 给的 CVSS 3.1 分数（评估漏洞严重程度的分数）是 8.1，等级为 High。截至我查证时，[NVD 的记录](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158)状态仍是“Received”，NVD 还没有自己评分。

补充一点：The Hacker News 的报道和 Alpine 公告发布时都写着“尚未分配 CVE”。截至我查证时，CVE 记录已经有这个编号，Alpine 的安全数据库（secdb）也已把这个 CVE 对应到各分支的修补版本。

## 问题出在哪里

一般来说，一个账号的密码栏如果是 `*`，意思是“这个账号没有可用的密码”。很多只用密钥登录的账号就是这样设置。

sshd 在没有 PAM 的情况下，会把你输入的密码丢给 `crypt()` 算出哈希，再拿去和系统保存的值比对。`*` 太短，里面没有 salt（哈希计算用的参数），所以 sshd 会借用机器上另一个账号的 salt 来算。

麻烦在于 musl 的 `crypt()` 遇到超过 256 bytes 的密码时，会返回 `*` 表示“出错了”。正常流程下，错误应该被当成失败处理，登录被拒绝。但 sshd 把这个 `*` 当成一般的哈希结果拿去比对，刚好和账号保存的 `*` 一样，于是比对成功，错误信号就被误认成“密码正确”。

10.6p2 的做法是让 sshd 拒绝和过短的保存字段比对，Alpine 各稳定分支的软件包则带有针对同一问题的修补。

![概念插画：一个“错误”信号在比对时被误当成验证通过](auth-error.webp){: w="1280" h="720" }
_概念图，不是实际架构。错误返回本来应该让登录失败，不该被当成验证成功。_

## 你的主机要同时符合这些条件才会受影响

根据 Alpine 公告整理，以下条件**全部成立**才会受影响：

1. 在使用 musl 的 Linux 上运行，且正在运行的 sshd 尚未修补。版本号以你所用发行版的安全公告为准，已经应用 backport 修补并重启的 sshd，即使其他条件都成立，也不受这个漏洞影响。
2. sshd 不经过 PAM 验证密码。在 Alpine 上，这代表装的是 `openssh-server`（本身就没有 PAM），或是装了 `openssh-server-pam` 但设置 `UsePAM no`。
3. `PasswordAuthentication` 是 `yes`。上游 OpenSSH 的默认值是 `yes`，但发行版或云镜像可能另外设置，要以 sshd 的有效设置为准。
4. 机器上有密码栏为 `*` 的账号。Alpine 公告特别列出：从 3.16 左右起默认的 `root:*`、用 `adduser` 创建却没设密码的密钥账号，以及通过 musl-nscd 从目录服务（例如 nslcd、winbind、sssd）来的用户，因为它们在本机没有 shadow 记录。
5. 机器上至少有另一个本机账号使用 `$5$` 或 `$6$` 开头的密码哈希，也就是真的设过密码。

此外，攻击者要能连到你的 SSH 端口，也要知道那个 `*` 账号的名称。Alpine 公告说，条件都成立时，攻击者一次连接就能登录，不需要重试。我觉得这句话要和上面的条件一起看，条件不成立时就不适用。

有几个容易误会的地方：

- **密码栏是 `*` 不等于“禁止登录”。** 它只代表没有密码。用 `!` 锁住的账号，Alpine 公告说不受影响。
- **“我都用密钥登录”不等于“已经关掉密码验证”。** 只要 `PasswordAuthentication` 还是 `yes`，sshd 就还接受密码登录，不管你平常怎么连。
- **root 另有规则。** Alpine 从大约 3.16 起，root 默认就是 `root:*`。不过 OpenSSH 默认的 `PermitRootLogin prohibit-password` 会挡掉 root 的密码登录，除非你改成 `yes`。真正要注意的是：如果另一个可登录的账号能通过 `doas` 之类的方式变成 root，这层保护就帮不上忙。

Alpine 官方 tiny-cloud 云镜像（3.18.11 到 3.24.3）是一个具体例子。里面的 `alpine` 账号密码栏是 `*`，而且可以免密码使用 `doas`。刚开机时是安全的，但只要机器上出现任何 `$6$` 哈希，例如管理员设了控制台密码，就符合条件。用 cloud-init 设置的镜像会写入 `PasswordAuthentication no`，Alpine 公告将它列为不受影响。

**不在这次范围内的情况：** 使用 glibc 的发行版、非 Linux 系统、sshd 通过 PAM 验证（例如 `openssh-server-pam` 搭配 `UsePAM yes`）、没有在容器内运行 sshd 的 Docker 容器，以及没有任何 `$` 型密码哈希的机器。如果你的容器是用 Alpine 当基底，而且里面真的跑了 sshd，就要照上面的条件逐项检查。自己编译 OpenSSH 的环境也一样。

## 先确认你的主机状态

以下是只读的检查方式，请在你自己管理的服务器上运行。`sshd -T` 和读取 `/etc/shadow` 需要 root 权限，后面的更新步骤也一样。

先确认操作系统和已安装的 OpenSSH 软件包：

```sh
cat /etc/os-release
apk info -v | grep openssh
```

不要只看 `ssh -V`。那是客户端的版本，不能代表服务器上的 sshd，也看不出发行版的修补版本号。

接着看 sshd 实际生效的设置：

```sh
sshd -T | grep -Ei '^(usepam|passwordauthentication|permitrootlogin) '
```

`sshd -T` 输出的是默认场景下的结果。如果你的配置文件用了 `Match` 块或 `Include`，不同用户或来源 IP 可能应用不同设置，这时可以加上 `-C` 指定连接场景，让 sshd 应用相符的 `Match` 规则后再输出。根据 [sshd(8) 说明文档](https://man.openbsd.org/sshd.8)，`user` 是登录账号，`addr` 是连接来源的 IP，`host` 是连接来源经反查后的主机名称，不是你这台服务器的名称。例如要看账号 `deploy` 从 `203.0.113.10` 连进来时的设置：

```sh
sshd -T -C user=deploy,addr=203.0.113.10 | grep -i passwordauthentication
```

如果你的 `Match` 规则是用来源主机名称判断，再加上 `host=`。跑一次 `-T` 不能代表所有连接场景都安全。

如果要看有哪些账号的密码栏是 `*`、哪些有 `$5$` 或 `$6$` 哈希，可以用只输出账号名称的方式查：

```sh
awk -F: '$2=="*"{print "无密码:", $1} $2 ~ /^\$[56]\$/{print "有哈希:", $1}' /etc/shadow
```

这行只会输出账号名称，不会输出哈希本身。要注意，通过 musl-nscd 从目录服务来的用户不在 `/etc/shadow` 里，这行查不到他们，但 Alpine 公告把他们算进受影响的账号。`/etc/shadow` 的内容请不要贴到论坛、聊天群或 AI 工具里。

## Alpine 的修补步骤

Alpine 的修补是 backport，旧分支的版本号不会变成 10.6p2。例如 3.24 修补后的 `openssh` 版本是 `10.3_p1-r2`，3.22 是 `10.0_p1-r11`。所以判断有没有修好，要拿你的分支去对照 [Alpine 公告里的版本表](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)，不能只看是不是 10.6p2。公告也说 3.21.10、3.22.8、3.23.8、3.24.4 这些镜像版本已经包含修补软件包。

动手之前，先做好两件事：用另一个窗口确认密钥登录可以用，并保留目前已经连上的 SSH 连接。如果是云主机，确认你还进得了供应商的管理控制台。

Alpine 官方的做法是更新后重启 sshd。下面的 `sshd -t` 检查和新旧连接的确认，是我额外加上的保护步骤。另外，`apk upgrade -U -a` 会更新整个系统的软件包，不只 openssh，建议先看过会变动的软件包，并安排维护时段再做。

1. 更新软件包：`apk upgrade -U -a`
2. 检查配置文件没有错误：`sshd -t`
3. 重新启动 sshd：`rc-service sshd restart`
4. 开一个新的 SSH 连接，确认登得进去。
5. 新连接正常后，再关掉原本的旧连接。

第 3 步不能省。Alpine 公告特别提醒，升级软件包不会替换正在运行的 sshd，不重启就还是旧程序在跑。

![概念插画：管理员保留旧连接，同时开新连接确认更新后能登录](safe-update.webp){: w="1280" h="720" }
_先保留现有连接，再用新连接验证；软件包更新后仍要重启 sshd 才会生效。_

如果你是自己从源代码编译 OpenSSH，请升级到 10.6p2。

## 暂时没办法更新的话

Alpine 公告建议，至少先把密码登录关掉，也就是设置 `PasswordAuthentication no`。The Hacker News 也引用 OpenSSH 的 Damien Miller，呼吁受影响的系统立即关闭密码验证或禁用 SSH。这会让所有账号都不能用密码登录 SSH，所以一定要先确认密钥登录可用，否则可能把自己锁在外面。

要注意 `Match` 块里可能另外写了 `PasswordAuthentication yes`，只改主设置不一定够。另外，Alpine 默认的 sshd_config 从 3.19 起才会读 `/etc/ssh/sshd_config.d/` 这个 drop-in 文件夹，更旧的版本会忽略它。Alpine 公告提供了完整的指令，包含 drop-in 配置文件与修改 `Match` 块的方式，也说明了如何还原。我建议直接照[公告的“If you cannot update”段落](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)操作，不要自己拼凑。

改完设置同样要 `sshd -t` 检查，再重启 sshd 才会生效。重启后用 `sshd -T | grep -i passwordauthentication` 确认输出 `passwordauthentication no`，有 `Match` 设置的话也要用 `-C` 检查相关场景。

## 如果担心已经被登录过

目前 OpenSSH 和 Alpine 都没有提到已知的攻击事件。不过“还没有报告”不代表“确定没有人利用过”。另一方面，网络上已经有公开的 PoC，CISA 在 CVE 记录中的标注是“poc”，这只代表概念验证已公开，不等于已经有人在野外利用。

Alpine 建议，在对外开放的机器上检查这些地方：

- `/var/log/messages` 中 sshd 的 `Accepted password for` 记录，特别是登录的账号本来就没有密码，例如 `alpine`、`root` 或只用密钥的账号。
- `doas` 的使用记录。
- 最近添加的账号、文件，以及 `authorized_keys` 有没有多出不认得的密钥。

这些记录只是线索。查不到可疑记录，不能证明主机没事，因为记录可能没保存、被轮转，或被改过。Alpine 的说法是：如果没办法排除曾被登录，就把这台机器当成已遭入侵。实际做法上，可以先把主机从网络隔离或屏蔽 SSH 对外连接，从干净的镜像重建，再更换这台机器上用过的密钥、密码、API token 等凭证。

## 给大家的长期建议

这次的条件很特定，但有两个习惯值得留下来。第一，对外开放的 SSH 服务器尽量只用密钥登录，并且明确设置 `PasswordAuthentication no`，不要依赖默认值。第二，判断有没有修补时，看你所用发行版的公告和软件包版本号，不要只拿上游版本号比对。

## 主要来源

查证截至 2026-11-07（台北时间）。

- [OpenSSH 10.6p2 release notes](https://www.openssh.org/txt/release-10.6p2)
- [Alpine Linux 安全公告：openssh-server password authentication bypass](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)
- [Alpine secdb（v3.24 main）](https://secdb.alpinelinux.org/v3.24/main.json)：CVE 与修补版本的对应
- [CVE-2026-123158 记录（CVE Services API）](https://cveawg.mitre.org/api/cve/CVE-2026-123158)
- [NVD 上的 CVE-2026-123158（API）](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158)
- [oss-security 邮件列表讨论](https://www.openwall.com/lists/oss-security/2026/11/05/3)
- [The Hacker News 原始报道](https://thehackernews.com/2026/11/openssh-issues-emergency-fix-for-flaw.html)
