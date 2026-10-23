// Reads node_modules, so run `npm ci` first to get the versions pinned in package-lock.json.

import { cpSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const modules = join(root, 'node_modules');
const lib = join(root, 'assets/lib');

// npm package -> [path inside the package, path under assets/lib, excluded paths?]
const registry = {
  '@fortawesome/fontawesome-free': [
    ['css/all.min.css', 'fontawesome-free/css/all.min.css'],
    ['webfonts', 'fontawesome-free/webfonts'],
  ],
  clipboard: [['dist/clipboard.min.js', 'clipboard/clipboard.min.js']],
  dayjs: [
    ['dayjs.min.js', 'dayjs/dayjs.min.js'],
    ['locale/en.js', 'dayjs/locale/en.js'],
    ['plugin/localizedFormat.js', 'dayjs/plugin/localizedFormat.js'],
    ['plugin/relativeTime.js', 'dayjs/plugin/relativeTime.js'],
  ],
  glightbox: [
    ['dist/js/glightbox.min.js', 'glightbox/glightbox.min.js'],
    ['dist/css/glightbox.min.css', 'glightbox/glightbox.min.css'],
  ],
  // The theme expects .min names; the package's dist files are already minified.
  'loading-attribute-polyfill': [
    ['dist/loading-attribute-polyfill.css', 'loading-attribute-polyfill/loading-attribute-polyfill.min.css'],
    ['dist/loading-attribute-polyfill.umd.js', 'loading-attribute-polyfill/loading-attribute-polyfill.umd.min.js'],
  ],
  // MathJax loads its components at runtime, so the whole package ships minus the Node entry points and docs.
  mathjax: [
    [
      '.',
      'mathjax',
      [
        'node-main.js',
        'node-main.mjs',
        'node-main.cjs',
        'node-main-setup.cjs',
        'require.mjs',
        'CONTRIBUTING.md',
        'README.md',
        'package.json',
      ],
    ],
  ],
  mermaid: [['dist/mermaid.min.js', 'mermaid/mermaid.min.js']],
  'simple-jekyll-search': [['dest/simple-jekyll-search.min.js', 'simple-jekyll-search/simple-jekyll-search.min.js']],
  tocbot: [
    ['dist/tocbot.min.js', 'tocbot/tocbot.min.js'],
    ['dist/tocbot.css', 'tocbot/tocbot.min.css'],
  ],
};

const entries = Object.entries(registry).flatMap(([pkg, files]) =>
  files.map(([from, to, excluded = []]) => ({ from: join(modules, pkg, from), to: join(lib, to), excluded })),
);

// Clearing whole top-level dirs drops files a previous version shipped. fonts/ and LICENSE are not listed, so they stay.
for (const dir of new Set(entries.map(({ to }) => relative(lib, to).split('/')[0]))) {
  rmSync(join(lib, dir), { recursive: true, force: true });
}

for (const { from, to, excluded } of entries) {
  cpSync(from, to, { recursive: true, filter: (src) => !excluded.includes(relative(from, src)) });
}
