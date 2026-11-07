---
title: "OpenSSH Password Authentication Bypass: Which Hosts Are Affected, and How Alpine Users Can Patch"
description: "OpenSSH 10.6p2 fixes a password authentication bypass (CVE-2026-123158) in sshd on musl without PAM. Who is affected, how to check, and how to patch Alpine."
date: 2026-11-07 18:00:00 +0800
categories: [Security]
tags: [application-security]
media_subpath: /assets/img/posts/openssh-musl-password-bypass-alpine/
image:
  path: cover.webp
  alt: "Only sshd on musl, without PAM, and with password login still enabled is affected; restart after updating."
---

The short version: this OpenSSH password authentication bypass does **not** hit every machine running OpenSSH. glibc-based Linux such as Ubuntu, Debian, Fedora, and RHEL is outside its scope, and the `ssh` client on your laptop isn't the problem either. The hosts that really need attention are mainly ones like Alpine Linux, which use musl and whose SSH server doesn't verify passwords through PAM.

If you run SSH on Alpine, this post walks you through deciding whether you're affected and how to update safely.

## Three Terms First

**sshd and ssh are different.** `sshd` is the server program that accepts incoming connections; `ssh` is the client you use to connect to other machines. This bug is in `sshd`, and the [OpenSSH 10.6p2 release notes](https://www.openssh.org/txt/release-10.6p2) label it `sshd(8)` as well.

**musl is a low-level C library.** Almost every program relies on a C library for basic work, such as turning a password into a hash. Most Linux distributions use glibc; Alpine uses musl.

**PAM is an authentication framework.** A system can hand "is this username and password right?" to PAM. If sshd doesn't go through PAM, it calls the C library itself to compare passwords, and that path is where this bug lives.

## What Happened

On 2026-11-05, OpenSSH released Portable OpenSSH 10.6p2. The notes say it contains a "critical security workaround" affecting "Linux systems that use the musl libc and PAM disabled." OpenSSH also says it considers the root cause to be outside sshd, but because it's exploitable through sshd, it blocks it there.

The same day, [Alpine published a security advisory](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/) and shipped fixed packages for every branch from 3.16 to edge. The vulnerability is [CVE-2026-123158](https://cveawg.mitre.org/api/cve/CVE-2026-123158); the record was published on 2026-11-05 at 23:46 Taipei time.

Severity comes from two different sources. OpenSSH's own word is "critical." In the CVE record, MITRE, which registered the CVE, gives a CVSS 3.1 score (a standard severity score for vulnerabilities) of 8.1, rated High. As of my check, [the NVD record](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158) still shows the status "Received," and NVD hasn't scored it yet.

One more note: The Hacker News report and the Alpine advisory both said "no CVE assigned" when they were published. As of my check, the CVE record has this ID, and Alpine's security database (secdb) also maps the CVE to each branch's fixed version.

## Where the Bug Is

Normally, if an account's password field is `*`, it means "this account has no usable password." Many key-only accounts are set up this way.

Without PAM, sshd passes the password you type to `crypt()` to compute a hash, then compares it with the stored value. `*` is too short to contain a salt (a parameter used in hashing), so sshd borrows the salt of another account on the machine.

The trouble is that musl's `crypt()` returns `*` as an error indicator when the password is longer than 256 bytes. Normally an error should count as a failure and the login should be refused. But sshd compares this `*` as if it were an ordinary hash, it happens to equal the stored `*`, the comparison succeeds, and the error signal is mistaken for "password correct."

10.6p2 makes sshd refuse to compare against a stored field that is too short, and the packages on Alpine's stable branches carry a patch for the same problem.

![Concept illustration: an "error" signal mistaken for a successful check during comparison](auth-error.webp){: w="1280" h="720" }
_A concept image, not the real architecture. An error return should make the login fail, never count as successful authentication._

## Your Host Is Affected Only If All of These Hold

Based on the Alpine advisory, you're affected only if **all** of the following are true:

1. The running sshd isn't patched yet. Go by your distribution's security advisory for version numbers. An sshd that has the backported fix applied and has been restarted isn't affected, even if every other condition holds.
2. sshd doesn't verify passwords through PAM. On Alpine, that means you installed `openssh-server` (built without PAM), or `openssh-server-pam` with `UsePAM no`.
3. `PasswordAuthentication` is `yes`. Upstream OpenSSH defaults to `yes`, but distributions or cloud images may set it differently, so go by sshd's effective configuration.
4. The machine has an account whose password field is `*`. The Alpine advisory specifically lists: `root:*`, the default since about 3.16; key-only accounts created with `adduser` without a password; and users coming from a directory service (such as nslcd, winbind, or sssd) through musl-nscd, since they have no local shadow entry.
5. At least one other local account has a password hash starting with `$5$` or `$6$`, meaning a password really was set.

On top of that, an attacker has to be able to reach your SSH port and know the name of that `*` account. The Alpine advisory says that when all the conditions hold, an attacker can log in with a single connection, no retries needed. I think that sentence has to be read together with the conditions above; when they don't hold, it doesn't apply.

A few things are easy to misread:

- **A `*` password field doesn't mean "login disabled."** It only means there's no password. Accounts locked with `!` are not affected, according to the Alpine advisory.
- **"I only use keys" doesn't mean "password authentication is off."** As long as `PasswordAuthentication` is still `yes`, sshd still accepts password logins, however you usually connect.
- **root has its own rule.** Since about Alpine 3.16, root defaults to `root:*`. But OpenSSH's default `PermitRootLogin prohibit-password` blocks password logins for root unless you change it to `yes`. What really matters: if another account that can log in can become root, for example through `doas`, that protection doesn't help.

Alpine's official tiny-cloud cloud images (3.18.11 through 3.24.3) are a concrete example. Their `alpine` account has a `*` password field and can use `doas` without a password. They're safe on first boot, but as soon as any `$6$` hash appears on the machine, for example when an admin sets a console password, the conditions are met. Images configured through cloud-init write `PasswordAuthentication no`, and the Alpine advisory lists them as not affected.

**Outside this bug's scope:** glibc distributions, non-Linux systems, sshd that verifies through PAM (such as `openssh-server-pam` with `UsePAM yes`), Docker containers that don't run sshd inside, and machines with no `$`-style password hash at all. If your container uses an Alpine base image and really runs sshd, check it against the conditions above one by one. The same goes for environments where you build OpenSSH yourself.

## Check Your Host First

These checks are read-only; run them on servers you manage yourself. `sshd -T` and reading `/etc/shadow` need root, and so do the update steps later.

First, check the operating system and the installed OpenSSH packages:

```sh
cat /etc/os-release
apk info -v | grep openssh
```

Don't rely on `ssh -V`. That's the client version; it doesn't represent the sshd on the server, and it doesn't show the distribution's patch release.

Next, look at sshd's effective configuration:

```sh
sshd -T | grep -Ei '^(usepam|passwordauthentication|permitrootlogin) '
```

`sshd -T` prints the result for the default context. If your configuration uses `Match` blocks or `Include`, different users or source IPs may get different settings. In that case, add `-C` to specify a connection context, so sshd applies the matching `Match` rules before printing. According to the [sshd(8) manual](https://man.openbsd.org/sshd.8), `user` is the login account, `addr` is the source IP of the connection, and `host` is the source's reverse-resolved hostname, not your server's name. For example, to see the settings when the account `deploy` connects from `203.0.113.10`:

```sh
sshd -T -C user=deploy,addr=203.0.113.10 | grep -i passwordauthentication
```

If your `Match` rules use the source hostname, add `host=` as well. One run of `-T` doesn't prove that every connection context is safe.

To see which accounts have a `*` password field and which have `$5$` or `$6$` hashes, you can print only account names:

```sh
awk -F: '$2=="*"{print "no password:", $1} $2 ~ /^\$[56]\$/{print "has hash:", $1}' /etc/shadow
```

This prints only account names, never the hashes themselves. Note that users coming from a directory service through musl-nscd aren't in `/etc/shadow`, so this line won't list them, but the Alpine advisory counts them among affected accounts. Please don't paste the contents of `/etc/shadow` into forums, chat groups, or AI tools.

## Alpine's Patch Steps

Alpine's fix is a backport, so older branches don't move to version 10.6p2. For example, the fixed `openssh` on 3.24 is `10.3_p1-r2`, and on 3.22 it's `10.0_p1-r11`. So to judge whether you're fixed, compare your branch against [the version table in the Alpine advisory](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/), rather than checking for 10.6p2. The advisory also says the 3.21.10, 3.22.8, 3.23.8, and 3.24.4 releases already include the fixed package.

Before you start, do two things: confirm in another window that key login works, and keep your current SSH session open. On a cloud host, make sure you can still reach the provider's management console.

Alpine's official procedure is to update, then restart sshd. The `sshd -t` check and the new-versus-old session check below are extra safety steps I added. Also, `apk upgrade -U -a` updates every package on the system, not just openssh, so review what will change first and schedule a maintenance window.

1. Update packages: `apk upgrade -U -a`
2. Check the configuration for errors: `sshd -t`
3. Restart sshd: `rc-service sshd restart`
4. Open a new SSH session and confirm you can log in.
5. Only after the new session works, close the old one.

Don't skip step 3. The Alpine advisory stresses that upgrading the package doesn't replace the running sshd; without a restart, the old program is still running.

![Concept illustration: an admin keeps the old session open while opening a new one to confirm login after the update](safe-update.webp){: w="1280" h="720" }
_Keep your current session open, then verify with a new one; after the package update, sshd still needs a restart to take effect._

If you build OpenSSH from source yourself, upgrade to 10.6p2.

## If You Can't Update Yet

The Alpine advisory recommends at least turning password logins off, that is, setting `PasswordAuthentication no`. The Hacker News also quotes OpenSSH's Damien Miller urging affected systems to disable password authentication immediately or disable SSH. This stops every account from logging in to SSH with a password, so confirm key login works first, or you may lock yourself out.

Watch out for `Match` blocks that set `PasswordAuthentication yes` separately; changing only the main settings may not be enough. Also, Alpine's default sshd_config reads the `/etc/ssh/sshd_config.d/` drop-in directory only from 3.19 onward; older releases ignore it. The Alpine advisory gives the complete commands, including a drop-in file and changing the `Match` blocks, and explains how to undo them. I recommend following [the advisory's "If you cannot update" section](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/) as written, instead of piecing together your own.

After the change, check again with `sshd -t`, then restart sshd for it to take effect. After the restart, run `sshd -T | grep -i passwordauthentication` and confirm it prints `passwordauthentication no`; if you have `Match` settings, check the relevant contexts with `-C` too.

## If You're Worried Someone Already Logged In

So far, neither OpenSSH nor Alpine mentions any known attacks. But "no reports yet" doesn't mean "definitely never exploited." Meanwhile, a public PoC already exists, and CISA's note in the CVE record is "poc." That only means a proof of concept is public; it doesn't mean exploitation in the wild.

Alpine recommends checking these on exposed machines:

- sshd's `Accepted password for` lines in `/var/log/messages`, especially for accounts that have no password, such as `alpine`, `root`, or key-only accounts.
- `doas` usage records.
- Recently created accounts and files, and any unfamiliar keys in `authorized_keys`.

These records are only clues. Finding nothing suspicious doesn't prove the host is fine, because logs may not have been kept, may have been rotated, or may have been altered. Alpine's guidance: if you can't rule out a login, treat the machine as compromised. In practice, you can first isolate the host from the network or block outside SSH access, rebuild from a clean image, and then rotate the keys, passwords, API tokens, and other credentials used on that machine.

## Long-Term Advice

The conditions this time are very specific, but two habits are worth keeping. First, have internet-facing SSH servers use key login only, and set `PasswordAuthentication no` explicitly instead of relying on defaults. Second, when deciding whether you're patched, go by your distribution's advisory and package version, not only the upstream version number.

## Main Sources

Checked as of 2026-11-07 (Taipei time).

- [OpenSSH 10.6p2 release notes](https://www.openssh.org/txt/release-10.6p2)
- [Alpine Linux security advisory: openssh-server password authentication bypass](https://alpinelinux.org/posts/2026-11-05-openssh-password-authentication-bypass/)
- [Alpine secdb (v3.24 main)](https://secdb.alpinelinux.org/v3.24/main.json): CVE-to-fixed-version mapping
- [CVE-2026-123158 record (CVE Services API)](https://cveawg.mitre.org/api/cve/CVE-2026-123158)
- [CVE-2026-123158 on NVD (API)](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2026-123158)
- [oss-security mailing list discussion](https://www.openwall.com/lists/oss-security/2026/11/05/3)
- [The Hacker News original report](https://thehackernews.com/2026/11/openssh-issues-emergency-fix-for-flaw.html)
