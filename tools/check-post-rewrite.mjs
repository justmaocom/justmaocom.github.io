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
const HEDGES_ZH = ['我認為', '我认为', '我覺得', '我觉得', '在我看來', '在我看来', '我建議', '我建议', '我查了', '依官方', '官方說明', '官方说明', '官方警告', '推測', '推测', '推論', '推论', '推演'];
const HEDGES_EN = ['I think', 'I find', 'In my view', 'in my view', 'As I see it', "I'd suggest", 'I suggest', 'I recommend', "I'd recommend", 'I checked', 'Per the docs', 'per the docs', 'The docs warn', 'according to', 'According to', 'inferred', 'I infer'];
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
const BASE = process.env.BASE ?? git('merge-base', 'HEAD', 'main').trim();

function parse(text, zh) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no front matter');
  const [, fm, body] = m;
  const blocks = [];
  // Fences indented inside list items count too; the indent stays part of the code so a re-indent shows up.
  const prose = body.replace(/^([ \t]*)(`{3,})([^\n]*)\n([\s\S]*?)\n\1\2[ \t]*$/gm, (_, ind, f, info, code) => {
    blocks.push({ lang: info.trim().split(/\s/)[0], code: code.split('\n').map((l) => l.slice(ind.length)).join('\n') });
    return '';
  });
  const paras = prose.split(/\n\s*\n/).map((p) => p.trim())
    .filter((p) => p && !/^(#|\||>|!\[|[-*] |\d+\. |\{:|_)/.test(p));
  // The file's language picks the unit; an en table that quotes Chinese queries is still English.
  const len = (p) => (zh ? p.replace(/\s|\[|\]\([^)]*\)/g, '').length : p.split(/\s+/).length);
  const sents = prose.split('\n').filter((l) => l.trim() && !/^(#|\||!\[|\{:|_)/.test(l))
    .join('\n').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(zh ? /[。！？\n]/ : /(?<=[.!?])\s+|\n/).map((s) => s.replace(/^\s*(>|[-*]|\d+\.)\s*/, '').trim()).filter(Boolean);
  const slen = (s) => (zh ? s.replace(/\s/g, '').length : s.split(/\s+/).length);
  const plain = prose.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`[^`\n]*`/g, '');
  return {
    // Glosses ("CI（每次推上去就自動跑的檢查）") and source markers ("依官方說明", "I think") are what rewrites drop most.
    glosses: [...new Set(plain.match(zh ? /（[^）\n]{2,}）/g : /\([^)\n]{3,}\)/g) ?? [])].map((g) => g.slice(1, -1)),
    hedges: Object.fromEntries((zh ? HEDGES_ZH : HEDGES_EN).map((h) => [h, plain.split(h).length - 1])),
    haystack: (plain + blocks.map((b) => b.code).join('\n')).replace(/\s/g, ''),
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
    longParas: paras.filter((p) => len(p) > (zh ? 160 : 90)).length,
    longSents: sents.filter((s) => slen(s) > (zh ? 80 : 35)).map((s) => `(${slen(s)}) ${s.slice(0, zh ? 40 : 120)}…`),
  };
}

const fmWithoutMermaid = (fm) => fm.split('\n').filter((l) => l.trim() !== 'mermaid: true').join('\n');
const missing = (oldSet, newSet) => [...oldSet].filter((x) => !newSet.has(x));

async function checkFile(rel) {
  const issues = [];
  const zh = !rel.startsWith(`${LANGS.en}/`);
  const now = parse(readFileSync(path.join(REPO, rel), 'utf8'), zh);
  let old;
  try { old = parse(git('show', `${BASE}:${rel}`), zh); } catch { old = null; }
  if (old) {
    if (fmWithoutMermaid(old.fm) !== fmWithoutMermaid(now.fm)) issues.push('front matter changed');
    const nowCode = now.code.map((b) => `${b.lang}\n${b.code}`);
    for (const b of old.code) {
      const key = `${b.lang}\n${b.code}`;
      const i = nowCode.indexOf(key);
      if (i < 0) issues.push(`code block lost or changed: ${b.lang} «${b.code.slice(0, 60).replace(/\n/g, '⏎')}»`);
      else nowCode.splice(i, 1);
    }
    // A diagram the author already drew stays as drawn (colors and labels included).
    for (const src of old.mermaid) if (!now.mermaid.includes(src)) issues.push(`existing mermaid changed: «${src.slice(0, 60).replace(/\n/g, '⏎')}»`);
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
    if (!o) continue;
    for (const g of o.glosses) if (!r.now.haystack.includes(g.replace(/\s/g, ''))) console.log(`    ~ gloss dropped «${g}»`);
    for (const [h, n] of Object.entries(o.hedges)) if (r.now.hedges[h] < n) console.log(`    ~ source marker «${h}» ${n}→${r.now.hedges[h]}`);
  }
  for (const p of parity) console.log(`  - ${p}`);
}
console.log(`\n${slugs.length - failed}/${slugs.length} posts pass`);
process.exit(failed ? 1 : 0);
