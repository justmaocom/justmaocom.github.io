// Compare rewritten posts against the merge base with main: nothing lost, mermaid parses, three languages stay in step.
// Needs `npm ci` first (it loads mermaid from node_modules).
// Usage: node tools/check-post-rewrite.mjs [file-or-slug ...]   (default: every post changed since the base; BASE=<ref> overrides it)
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NM = `${REPO}/node_modules`;
const { default: purify } = await import(`${NM}/dompurify/dist/purify.es.mjs`);
// Node has no DOM; parse only needs these to exist.
Object.assign(purify, { addHook() {}, removeHook() {}, removeHooks() {}, sanitize: (s) => String(s) });
const { default: mermaid } = await import(`${NM}/mermaid/dist/mermaid.core.mjs`);

const LANGS = { 'zh-TW': '_posts', 'zh-CN': '_posts/zh-CN', en: '_posts/en' };
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
const BASE = process.env.BASE ?? git('merge-base', 'HEAD', 'main').trim();

function parse(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no front matter');
  const [, fm, body] = m;
  const blocks = [];
  const prose = body.replace(/^(`{3,})([^\n]*)\n([\s\S]*?)\n\1[ \t]*$/gm, (_, f, info, code) => {
    blocks.push({ lang: info.trim().split(/\s/)[0], code });
    return '';
  });
  const paras = prose.split(/\n\s*\n/).map((p) => p.trim())
    .filter((p) => p && !/^(#|\||>|!\[|[-*] |\d+\. |\{:|_)/.test(p));
  const len = (p) => (/[一-鿿]/.test(p) ? p.replace(/\s|\[|\]\([^)]*\)/g, '').length : p.split(/\s+/).length);
  const zh = /[一-鿿]/.test(prose);
  const sents = prose.split('\n').filter((l) => l.trim() && !/^(#|\||!\[|\{:|_)/.test(l))
    .join('\n').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(zh ? /[。！？\n]/ : /(?<=[.!?])\s+|\n/).map((s) => s.replace(/^\s*(>|[-*]|\d+\.)\s*/, '').trim()).filter(Boolean);
  const slen = (s) => (zh ? s.replace(/\s/g, '').length : s.split(/\s+/).length);
  return {
    fm,
    blocks,
    code: blocks.filter((b) => b.lang !== 'mermaid'),
    mermaid: blocks.filter((b) => b.lang === 'mermaid').map((b) => b.code),
    urls: new Set(body.match(/https?:\/\/[^\s)\]>"'`]+/g) ?? []),
    links: new Set(body.match(/\/posts\/[a-z0-9-]+\//g) ?? []),
    images: (body.match(/!\[[^\]]*\]\(([^)\s]+)/g) ?? []).map((s) => s.replace(/.*\(/, '')),
    h2: (prose.match(/^## /gm) ?? []).length,
    proseLen: paras.reduce((n, p) => n + len(p), 0),
    maxPara: Math.max(0, ...paras.map(len)),
    longParas: paras.filter((p) => len(p) > (/[一-鿿]/.test(p) ? 160 : 90)).length,
    longSents: sents.filter((s) => slen(s) > (zh ? 80 : 35)).map((s) => `(${slen(s)}) ${s.slice(0, zh ? 40 : 120)}…`),
  };
}

const fmWithoutMermaid = (fm) => fm.split('\n').filter((l) => l.trim() !== 'mermaid: true').join('\n');
const missing = (oldSet, newSet) => [...oldSet].filter((x) => !newSet.has(x));

async function checkFile(rel) {
  const issues = [];
  const now = parse(readFileSync(path.join(REPO, rel), 'utf8'));
  let old;
  try { old = parse(git('show', `${BASE}:${rel}`)); } catch { old = null; }
  if (old) {
    if (fmWithoutMermaid(old.fm) !== fmWithoutMermaid(now.fm)) issues.push('front matter changed');
    const nowCode = now.code.map((b) => `${b.lang}\n${b.code}`);
    for (const b of old.code) {
      const key = `${b.lang}\n${b.code}`;
      const i = nowCode.indexOf(key);
      if (i < 0) issues.push(`code block lost or changed: ${b.lang} «${b.code.slice(0, 60).replace(/\n/g, '⏎')}»`);
      else nowCode.splice(i, 1);
    }
    for (const u of missing(old.urls, now.urls)) issues.push(`url lost: ${u}`);
    for (const l of missing(old.links, now.links)) issues.push(`internal link lost: ${l}`);
    for (const im of missing(new Set(old.images), new Set(now.images))) issues.push(`image lost: ${im}`);
  }
  if (now.mermaid.length && !/^mermaid: true$/m.test(now.fm)) issues.push('has mermaid block but no `mermaid: true`');
  for (const [i, src] of now.mermaid.entries()) {
    try { await mermaid.parse(src); } catch (e) { issues.push(`mermaid #${i + 1} parse error: ${String(e.message).split('\n').slice(0, 3).join(' ')}`); }
  }
  return { rel, old, now, issues };
}

let args = process.argv.slice(2);
if (!args.length) {
  args = git('diff', '--name-only', BASE, '--', '_posts').split('\n').filter(Boolean)
    .concat(git('ls-files', '--others', '--exclude-standard', '--', '_posts').split('\n').filter(Boolean));
}
const slugs = [...new Set(args.map((a) => path.basename(a, '.md')))];

let failed = 0;
for (const slug of slugs) {
  const results = {};
  for (const [lang, dir] of Object.entries(LANGS)) {
    const rel = `${dir}/${slug}.md`;
    if (existsSync(path.join(REPO, rel))) results[lang] = await checkFile(rel);
  }
  const all = Object.values(results);
  const parity = [];
  for (const k of ['h2', 'code', 'mermaid']) {
    const counts = all.map((r) => (Array.isArray(r.now[k]) ? r.now[k].length : r.now[k]));
    if (new Set(counts).size > 1) parity.push(`${k} count differs across languages: ${counts.join('/')}`);
  }
  const tags = all.map((r) => r.now.fm.match(/^tags:.*$/m)?.[0]);
  if (new Set(tags).size > 1) parity.push('tags differ across languages');
  const bad = all.some((r) => r.issues.length) || parity.length;
  if (bad) failed++;
  console.log(`\n${bad ? 'ISSUES' : 'PASS  '} ${slug}`);
  for (const r of all) {
    const o = r.old;
    const pct = o ? Math.round((100 * r.now.proseLen) / o.proseLen) : 100;
    console.log(`  ${r.rel.padEnd(70)} prose ${o?.proseLen ?? '-'}→${r.now.proseLen} (${pct}%)  maxPara ${o?.maxPara ?? '-'}→${r.now.maxPara}  longPara ${o?.longParas ?? '-'}→${r.now.longParas}  longSent ${o?.longSents.length ?? '-'}→${r.now.longSents.length}  mermaid ${r.now.mermaid.length}`);
    for (const i of r.issues) console.log(`    - ${i}`);
    // Warnings only: a long sentence is a readability target, not a lost fact.
    for (const s of r.now.longSents) console.log(`    ~ long sentence ${s}`);
  }
  for (const p of parity) console.log(`  - ${p}`);
}
console.log(`\n${slugs.length - failed}/${slugs.length} posts pass`);
process.exit(failed ? 1 : 0);
