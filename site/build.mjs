// Builds the HoloML site (browser milestone 22) into _site/ for GitHub
// Pages: the home page and the guides from docs/, the specification from
// SPEC.md at /spec/, and the example sites beside them at their own
// addresses. Plain pages, light and dark, that fetch nothing from other
// sites; links between them are relative, so _site/index.html also opens
// from the disk. Every link within the site is checked as it is built.
//
//   pnpm site:build          (node site/build.mjs [folder])
//   node site/build.mjs <folder> --pages-only
//                            (without the example sites, for HyperSpace 3D's
//                            screenshots; links into them are checked
//                            against examples/)
//
// The folder is emptied first, so the builder takes only a folder that is
// not there yet, an empty one, or one it made before (it leaves a marker
// file in each), and never the repository or a folder of its sources.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, posix, relative as between, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer } from 'marked';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
/** Where the site is published; links to it become links within it. */
export const SITE = 'https://srajpal.github.io/holoml/';
const REPOSITORY = 'https://github.com/srajpal/holoml';

/** The file the builder leaves in a folder it has made, so that it empties only folders of its own. */
export const MARKER = '.holoml-site';
/** What the example sites' folders hold that is not published: the scripts that make them. */
const TOOLS = 'tools';

/** The parts of the site, for the bar at the top of every page. */
const PARTS = [
  { path: 'spec/index.html', label: 'Specification', under: 'spec/' },
  { path: 'docs/tutorials/index.html', label: 'Tutorials', under: 'docs/tutorials/' },
  { path: 'docs/how-to/index.html', label: 'How-to guides', under: 'docs/how-to/' },
  { path: 'docs/reference/index.html', label: 'Reference', under: 'docs/reference/' },
  { path: 'docs/explanation/index.html', label: 'Explanation', under: 'docs/explanation/' },
  { path: 'index.html#the-example-sites', label: 'Examples', under: null },
];

const read = (file) => readFileSync(join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decodeHtml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plain = (html) => decodeHtml(html.replace(/<[^>]*>/g, ''));

/** Files under a folder of the repository, as paths from its root. */
function walk(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
}

/** The pages: each Markdown file, and the path of the page made from it. */
export function pages() {
  const out = [{ source: 'SPEC.md', path: 'spec/index.html' }];
  for (const source of walk('docs').filter((f) => f.endsWith('.md')).sort()) {
    const rel = source.slice('docs/'.length);
    out.push({ source, path: rel === 'index.md' ? 'index.html' : `docs/${rel.replace(/\.md$/, '.html')}` });
  }
  return out;
}

/** A heading's anchor, as GitHub makes it, so that links written for GitHub work here too. */
function slugger() {
  const seen = new Map();
  return (text) => {
    const base = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

/** HoloML, coloured: tags, attribute names, values, and comments. */
export function highlightHoloml(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      const stop = end < 0 ? src.length : end + 3;
      out += `<span class="hl-comment">${escapeHtml(src.slice(i, stop))}</span>`;
      i = stop;
      continue;
    }
    const tag = /^<\/?[a-z][a-z0-9-]*/i.exec(src.slice(i, i + 80));
    if (!tag) {
      const next = src.indexOf('<', i + 1);
      const stop = next < 0 ? src.length : next;
      out += escapeHtml(src.slice(i, stop));
      i = stop;
      continue;
    }
    out += `<span class="hl-tag">${escapeHtml(tag[0])}</span>`;
    i += tag[0].length;
    while (i < src.length) {
      const m = /^(?:(\s+)|(\/?>)|([a-z][a-z0-9-]*)|(=)|("[^"]*"|'[^']*'))/i.exec(src.slice(i));
      if (!m) {
        out += escapeHtml(src[i]);
        i += 1;
        continue;
      }
      i += m[0].length;
      if (m[1]) out += m[1];
      else if (m[2]) {
        out += `<span class="hl-tag">${escapeHtml(m[2])}</span>`;
        break;
      } else if (m[3]) out += `<span class="hl-attr">${m[3]}</span>`;
      else if (m[4]) out += '=';
      else out += `<span class="hl-value">${escapeHtml(m[5])}</span>`;
    }
  }
  return out;
}

const JS_KEYWORDS = new Set(
  'async await break case catch class const continue default delete do else export false finally for from function if import in instanceof let new null of return switch this throw true try typeof undefined var void while'.split(' '),
);

/** JavaScript, coloured: comments, strings, and keywords. */
export function highlightJs(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b([a-z]+)\b/g;
  let out = '';
  let last = 0;
  for (const m of src.matchAll(re)) {
    if (m[3] && !JS_KEYWORDS.has(m[3])) continue;
    out += escapeHtml(src.slice(last, m.index));
    const cls = m[1] ? 'hl-comment' : m[2] ? 'hl-value' : 'hl-keyword';
    out += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + escapeHtml(src.slice(last));
}

/** Comments in the grammars and the Web IDL: `;` in ABNF, `#` in RELAX NG, `//` in Web IDL. */
function highlightComments(src, mark) {
  return src
    .split('\n')
    .map((line) => {
      const at = line.indexOf(mark);
      return at < 0 ? escapeHtml(line) : escapeHtml(line.slice(0, at)) + `<span class="hl-comment">${escapeHtml(line.slice(at))}</span>`;
    })
    .join('\n');
}

const LANGUAGES = {
  holoml: { label: 'HoloML', highlight: highlightHoloml },
  'holoml-scene': { label: 'HoloML, in a scene', highlight: highlightHoloml },
  'holoml-each': { label: 'HoloML, in a scene', highlight: highlightHoloml },
  'holoml-head': { label: 'HoloML, in the head', highlight: highlightHoloml },
  js: { label: 'JavaScript', highlight: highlightJs },
  abnf: { label: 'ABNF', highlight: (s) => highlightComments(s, ';') },
  rnc: { label: 'RELAX NG', highlight: (s) => highlightComments(s, '#') },
  webidl: { label: 'Web IDL', highlight: (s) => highlightComments(s, '//') },
};

const REQUIREMENT_WORDS = /\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/g;

/** The specification's requirement words, marked as W3C specifications mark them; never in code. */
function markRequirementWords(html) {
  let inCode = 0;
  return html.replace(/(<[^>]*>)|([^<]+)/g, (all, tag, text) => {
    if (tag) {
      if (/^<(code|pre)\b/i.test(tag)) inCode++;
      else if (/^<\/(code|pre)>/i.test(tag)) inCode--;
      return tag;
    }
    return inCode > 0 ? text : text.replace(REQUIREMENT_WORDS, '<em class="rfc2119">$1</em>');
  });
}

/** A JPEG's width and height, for the img element (so the page does not move as pictures load). */
function jpegSize(file) {
  const b = readFileSync(file);
  let i = 2;
  while (i + 9 < b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

/** From one page of the site to another path in it. */
const relative = (from, to) => posix.relative(posix.dirname(from), to) || posix.basename(to);

/**
 * Turns one Markdown file into its page's main content. Links to other
 * pages become links to theirs; links to other files in the repository
 * go to GitHub; every link within the site is noted, to be checked.
 */
function render(page, byPath, links, problems) {
  const slug = slugger();
  const headings = [];
  let section = '';
  const at = (href) => {
    if (href.startsWith('#')) {
      links.push({ from: page.path, to: page.path, anchor: href.slice(1) });
      return href;
    }
    if (href.startsWith(SITE)) {
      const [path, anchor = ''] = href.slice(SITE.length).split('#');
      const target = path === '' || path.endsWith('/') ? `${path}index.html` : path;
      links.push({ from: page.path, to: target, anchor });
      return relative(page.path, target) + (anchor ? `#${anchor}` : '');
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
    const [path, anchor = ''] = href.split('#');
    const target = posix.normalize(posix.join(posix.dirname(page.source), decodeURI(path))).replace(/\/$/, '');
    const hash = anchor ? `#${anchor}` : '';
    const own = byPath.get(target) ?? byPath.get(`${target}/index.md`);
    if (own) {
      links.push({ from: page.path, to: own, anchor });
      return relative(page.path, own) + hash;
    }
    if (target.startsWith('site/pictures/')) {
      const to = `pictures/${posix.basename(target)}`;
      links.push({ from: page.path, to, anchor: '' });
      return relative(page.path, to);
    }
    if (target.startsWith('..') || !existsSync(join(ROOT, target))) {
      problems.push(`${page.source}: "${href}" is not a file in the repository`);
      return href;
    }
    const kind = statSync(join(ROOT, target)).isDirectory() ? 'tree' : 'blob';
    return `${REPOSITORY}/${kind}/main/${target}${hash}`;
  };

  const renderer = {
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      const id = slug(plain(inner));
      headings.push({ depth, id, inner });
      if (depth <= 2) section = id;
      return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
    },
    code({ text, lang }) {
      const language = LANGUAGES[lang ?? ''];
      const body = language ? language.highlight(text) : escapeHtml(text);
      const label = language ? ` data-lang="${language.label}"` : '';
      // Reachable by the keyboard, to scroll it; code.js takes the blocks that do not scroll out of the Tab order.
      return `<pre tabindex="0"${label}><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${body}</code></pre>\n`;
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      return `<a href="${escapeHtml(at(href))}"${title ? ` title="${escapeHtml(title)}"` : ''}>${inner}</a>`;
    },
    image({ href, text }) {
      const src = at(href);
      const file = join(ROOT, posix.normalize(posix.join(posix.dirname(page.source), href)));
      const size = /\.jpe?g$/i.test(href) && existsSync(file) ? jpegSize(file) : null;
      if (!text.trim()) problems.push(`${page.source}: the picture ${href} has no text for those who cannot see it`);
      const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text)}"${dims} loading="lazy">`;
    },
    table(token) {
      const html = Renderer.prototype.table.call(this, token);
      const name = headings.at(-1) ? plain(headings.at(-1).inner) : 'Table';
      return `<div class="table" role="region" aria-label="${escapeHtml(name)}, a table" tabindex="0">\n${html}</div>\n`;
    },
    list(token) {
      const html = Renderer.prototype.list.call(this, token);
      if (section !== 'the-example-sites' || token.ordered) return html;
      return html
        .replace(/^<ul>/, '<ul class="sites">')
        .replace(/<li>(<img [^>]*>)\s*([\s\S]*?)<\/li>/g, '<li>$1<p>$2</p></li>');
    },
    paragraph({ tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (/^<em>Note \(non-normative\):<\/em>/.test(inner)) return `<p class="note">${inner}</p>\n`;
      if (/^<em>This (section|appendix) is non-normative\.<\/em>$/.test(inner)) return `<p class="informative">${inner}</p>\n`;
      return `<p>${inner}</p>\n`;
    },
  };

  const marked = new Marked({ gfm: true, renderer });
  let html = marked.parse(read(page.source));
  if (page.source === 'SPEC.md') html = specPage(html, headings);
  return { html, headings };
}

/** The specification: its subtitle, its contents after its status, and its requirement words. */
function specPage(html, headings) {
  const start = headings.findIndex((h) => h.depth === 2 && /^1-/.test(h.id));
  const items = [];
  for (const h of headings.slice(start)) {
    if (h.depth === 2) items.push({ ...h, children: [] });
    else if (h.depth === 3 && items.length) items.at(-1).children.push(h);
  }
  const link = (h) => `<a href="#${h.id}">${h.inner}</a>`;
  const toc = [
    '<nav class="toc" aria-labelledby="contents">',
    '<h2 id="contents">Contents</h2>',
    '<ul>',
    ...items.map((h) =>
      h.children.length
        ? `<li>${link(h)}\n<ul>\n${h.children.map((c) => `<li>${link(c)}</li>`).join('\n')}\n</ul></li>`
        : `<li>${link(h)}</li>`,
    ),
    '</ul>',
    '</nav>',
    '',
  ].join('\n');
  const first = `<h2 id="${headings[start].id}">`;
  return markRequirementWords(
    html.replace(/(<h1 [^>]*>[\s\S]*?<\/h1>\n)<p><strong>([^<]*)<\/strong><\/p>/, '$1<p class="subtitle">$2</p>').replace(first, toc + first),
  );
}

/** The page around the content: the bar, the path to it, and the footer. */
function layout(page, html, headings) {
  const title = plain(headings.find((h) => h.depth === 1)?.inner ?? 'HoloML');
  const home = page.path === 'index.html';
  const root = relative(page.path, 'index.html').replace(/index\.html$/, '');
  const firstParagraph = /<p(?: class="[^"]*")?>([\s\S]*?)<\/p>/.exec(html.replace(/<p class="subtitle">[\s\S]*?<\/p>/, ''));
  const description = firstParagraph ? plain(firstParagraph[1]).replace(/\s+/g, ' ').slice(0, 200) : title;
  const parts = PARTS.map((p) => {
    const current = p.path === page.path ? ' aria-current="page"' : p.under && page.path.startsWith(p.under) ? ' class="here"' : '';
    return `<li><a href="${relative(page.path, p.path.split('#')[0])}${p.path.includes('#') ? `#${p.path.split('#')[1]}` : ''}"${current}>${p.label}</a></li>`;
  });
  const part = PARTS.find((p) => p.under && page.path.startsWith(p.under) && p.path !== page.path);
  const crumbs =
    home || page.path === 'spec/index.html'
      ? ''
      : [
          '<nav class="crumbs" aria-label="Where this page is">',
          '<ol>',
          `<li><a href="${root}index.html">Home</a></li>`,
          ...(part ? [`<li><a href="${relative(page.path, part.path)}">${part.label}</a></li>`] : []),
          '</ol>',
          '</nav>',
        ].join('\n');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(home ? 'HoloML' : `${title} · HoloML`)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="${root}style.css">
<script src="${root}code.js" defer></script>
</head>
<body class="${page.path === 'spec/index.html' ? 'spec' : home ? 'home' : 'guide'}">
<a class="skip" href="#main">Skip to the content</a>
<header class="bar">
<nav aria-label="HoloML">
<a class="home" href="${root}index.html"${home ? ' aria-current="page"' : ''}>HoloML</a>
<ul>
${parts.join('\n')}
<li><a href="${REPOSITORY}">Source on GitHub</a></li>
</ul>
</nav>
</header>
<main id="main">
${crumbs}
${html}</main>
<footer class="bar">
<div>
<p>HoloML is written in the open by The HoloML Authors. The specification is licensed under <a href="${REPOSITORY}/blob/main/LICENSE-SPEC">CC BY 4.0</a>; the code, the tools, and these guides under <a href="${REPOSITORY}/blob/main/LICENSE">Apache 2.0</a>.</p>
<p><a href="${REPOSITORY}/blob/main/${page.source}">This page's source</a> · <a href="${REPOSITORY}/issues">Comments and questions</a></p>
</div>
</footer>
</body>
</html>
`;
}

/** The ids a page has, for checking links to its parts. */
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

/** Whether `path` is `folder` itself or somewhere inside it. */
function within(folder, path) {
  const rel = between(folder, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Why the site cannot be built into `out`, or null when it can. The
 * builder empties the folder first, so it refuses the repository, any
 * folder the repository is in, and its docs/ and examples/ (whatever they
 * hold), and any other folder that has something in it and was not made
 * by an earlier build (it has no marker file). The repository's own
 * _site/, where the site goes when no folder is named, is always taken.
 */
export function refusal(out) {
  const target = resolve(out);
  if (!existsSync(target)) return null;
  // As the disk names them, so that another spelling (a link, or capitals on Windows) is still the same folder.
  const real = realpathSync.native(target);
  const root = realpathSync.native(ROOT);
  const why = 'the site is not built there, as building empties the folder first';
  if (within(real, root)) return `${target} is the repository or a folder it is in: ${why}`;
  for (const kept of ['docs', 'examples']) {
    if (real === join(root, kept)) return `${target} is the repository's ${kept}/, which the site is made from: ${why}`;
  }
  if (!statSync(real).isDirectory()) return `${target} is a file, not a folder`;
  // The repository's own _site/ is the builder's (Git ignores it), marker or not: builds from before the marker made it.
  if (real === join(root, '_site')) return null;
  if (readdirSync(real).length > 0 && !existsSync(join(real, MARKER))) {
    return `${target} has files in it that an earlier build did not make (it has no ${MARKER} file), and building would delete them: name a new or empty folder, or delete this one yourself`;
  }
  return null;
}

/** Whether a file of an example site is published: every file but the scripts that make the site (its tools/ folder). */
export function isPublished(site, file) {
  return !between(site, file).split(/[\\/]/).includes(TOOLS);
}

/**
 * Builds the site into `out` (emptied first; see refusal for the folders
 * it does not take). Returns the pages made and every problem found: a
 * link to a file or a part of a page that is not there, or a picture
 * without its text. With `examples: false`, the example sites are left
 * out, and links into them are checked against their sources in
 * examples/.
 */
export function buildSite(out = join(ROOT, '_site'), { examples = true } = {}) {
  const refused = refusal(out);
  if (refused) throw new Error(refused);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, MARKER), 'Made by site/build.mjs, which empties this folder before each build.\n');
  const list = pages();
  const byPath = new Map(list.map((p) => [p.source, p.path]));
  const links = [];
  const problems = [];
  const made = new Map();
  for (const page of list) {
    const { html, headings } = render(page, byPath, links, problems);
    if (headings.filter((h) => h.depth === 1).length !== 1) problems.push(`${page.source}: a page has one title (one "# " heading)`);
    const full = layout(page, html, headings);
    mkdirSync(join(out, posix.dirname(page.path)), { recursive: true });
    writeFileSync(join(out, page.path), full);
    made.set(page.path, full);
  }
  cpSync(join(ROOT, 'site/style.css'), join(out, 'style.css'));
  cpSync(join(ROOT, 'site/code.js'), join(out, 'code.js'));
  cpSync(join(ROOT, 'site/pictures'), join(out, 'pictures'), { recursive: true });
  // The example sites, without the scripts that make them (each site's tools/, and examples/tools/, which they share).
  const sites = readdirSync(join(ROOT, 'examples'), { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== TOOLS);
  for (const site of examples ? sites : []) {
    const from = join(ROOT, 'examples', site.name);
    cpSync(from, join(out, site.name), { recursive: true, filter: (src) => isPublished(from, src) });
  }
  writeFileSync(join(out, '.nojekyll'), '');
  const inSite = (to) => (!examples && sites.some((s) => to.startsWith(`${s.name}/`)) ? join(ROOT, 'examples', to) : join(out, to));
  for (const { from, to, anchor } of links) {
    if (!existsSync(inSite(to))) problems.push(`${from}: a link to ${to}, which the site does not have`);
    else if (anchor && made.has(to) && !idsOf(made.get(to)).has(anchor)) problems.push(`${from}: a link to ${to}#${anchor}, a part that page does not have`);
  }
  return { out, pages: [...made.keys()], problems: [...new Set(problems)] };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith('--')) ?? join(ROOT, '_site');
  const refused = refusal(folder);
  if (refused) {
    console.error(`Not built: ${refused}.`);
    process.exitCode = 1;
  } else {
    const { out, pages: made, problems } = buildSite(folder, { examples: !args.includes('--pages-only') });
    for (const p of problems) console.error(p);
    console.log(`${made.length} pages in ${out}${problems.length ? `; ${problems.length} problems` : ''}`);
    process.exitCode = problems.length ? 1 : 0;
  }
}
