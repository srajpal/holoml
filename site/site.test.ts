import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, parse as parsePath, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse as parseSource } from '../packages/parser/src/index.ts';
import { check as checkSource } from '../packages/schema/src/index.ts';
import { CHECKER, MARKER, PLAYGROUND, PLAYGROUND_CSP, buildSite, checkerModule, highlightHoloml, isPublished, pages, refusal } from './build.mjs';

/** The site (browser milestone 22), built into a folder of its own for these checks. */
let out = '';
let built: { pages: string[]; playground: string; problems: string[] } = { pages: [], playground: '', problems: [] };
/** The guides' pages and the playground's (holoml #58), for what every page of the site must be. */
const everyPage = () => [...built.pages, built.playground];
const html = (path: string) => readFileSync(join(out, path), 'utf8');

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'holoml-site-'));
  built = buildSite(out);
});

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true });
});

const ROOT = fileURLToPath(new URL('../', import.meta.url));
/** The example sites: every folder of examples/ but tools/, which holds what their tools share and their scripts' tests. */
const EXAMPLES = readdirSync(new URL('../examples/', import.meta.url), { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== 'tools')
  .map((e) => e.name);

/** Files under a folder, as paths from it with forward slashes. */
function filesUnder(dir: string, from = ''): string[] {
  return readdirSync(join(dir, from), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(dir, `${from}${e.name}/`) : [`${from}${e.name}`]));
}

describe('Y4: every link within the site answers', () => {
  it('builds with no link to a missing file or part of a page, and no picture without its text', () => {
    expect(built.problems).toEqual([]);
  });
});

describe('Y5: the site has its parts at their addresses', () => {
  it('has the home page, the specification at spec/, and a page for every guide', () => {
    const made = new Set(built.pages);
    expect(made.has('index.html')).toBe(true);
    expect(made.has('spec/index.html')).toBe(true);
    for (const p of pages() as { source: string; path: string }[]) expect(made.has(p.path), p.source).toBe(true);
    for (const kind of ['tutorials', 'how-to', 'reference', 'explanation']) expect(made.has(`docs/${kind}/index.html`), kind).toBe(true);
  });

  it('keeps the example sites at their addresses, without the scripts that make them', () => {
    for (const site of EXAMPLES) {
      expect(existsSync(join(out, site, 'index.holoml')), site).toBe(true);
      expect(existsSync(join(out, site, 'index.html')), site).toBe(true);
      expect(existsSync(join(out, site, 'tools')), `${site}/tools`).toBe(false);
    }
    expect(EXAMPLES).toHaveLength(7);
    // What the examples' tools share, and the tests of their scripts, are not a site.
    expect(existsSync(join(out, 'tools'))).toBe(false);
  });

  it('publishes every file of an example but its tools, with its credits', () => {
    for (const site of EXAMPLES) {
      const sources = filesUnder(join(ROOT, 'examples', site)).filter((f) => !f.split('/').includes('tools'));
      expect(filesUnder(join(out, site)).sort(), site).toEqual(sources.sort());
      expect(sources, site).toContain('models/CREDITS.md');
      expect(readFileSync(join(out, site, 'models/CREDITS.md'), 'utf8'), site).toBe(readFileSync(join(ROOT, 'examples', site, 'models/CREDITS.md'), 'utf8'));
    }
  });

  it('leaves out the tools by their place in the site, wherever the repository is kept', () => {
    // A copy of the repository under a folder named "tools" published no example at all (review 134).
    for (const root of ['/home/me/tools/holoml', 'C:/tools/holoml'].map((r) => r.split('/').join(sep))) {
      const site = join(root, 'examples', 'showroom');
      expect(isPublished(site, site), root).toBe(true);
      expect(isPublished(site, join(site, 'index.holoml')), root).toBe(true);
      expect(isPublished(site, join(site, 'models', 'CREDITS.md')), root).toBe(true);
      expect(isPublished(site, join(site, 'tools')), root).toBe(false);
      expect(isPublished(site, join(site, 'tools', 'prepare.mjs')), root).toBe(false);
    }
  });

  it('asks nothing of another site: every picture, style, and script is its own', () => {
    for (const path of built.pages) {
      const page = html(path);
      const fetched = [...page.matchAll(/<(?:img|script|link|source|iframe|video|audio)\b[^>]*\s(?:src|href)="([^"]*)"/gi)].map((m) => m[1]!);
      expect(fetched.filter((u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u)), path).toEqual([]);
      // One script, the site's own (code.js), and none written into the page, in any case of letters.
      expect(page.match(/<script\b[^>]*>/gi), path).toEqual([expect.stringMatching(/^<script src="(?:\.\.\/)*code\.js" defer>$/)]);
      expect(page, path).not.toMatch(/\sstyle="[^"]*url\(/);
    }
    const css = readFileSync(join(out, 'style.css'), 'utf8');
    expect(css).not.toMatch(/@import|url\(/);
    const code = readFileSync(join(out, 'code.js'), 'utf8');
    expect(code).not.toMatch(/\bfetch\b|XMLHttpRequest|\bimport\b|WebSocket|sendBeacon|https?:|\bsrc\b|\bhref\b/);
  });
});

describe('E2: the builder empties only a folder of its own (review 134)', () => {
  const scratch: string[] = [];
  const folder = () => {
    const dir = mkdtempSync(join(tmpdir(), 'holoml-refuse-'));
    scratch.push(dir);
    return dir;
  };
  afterAll(() => {
    for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
  });

  it('refuses the repository, every folder it is in, and its docs/ and examples/', () => {
    // Asked, never tried: refusal() deletes nothing, whatever it answers.
    const REPOSITORY = /is the repository or a folder it is in: the site is not built there/;
    expect(refusal(ROOT)).toMatch(REPOSITORY);
    expect(refusal(join(ROOT, '.'))).toMatch(REPOSITORY);
    expect(refusal(join(ROOT, 'site', '..'))).toMatch(REPOSITORY);
    for (let dir = dirname(join(ROOT, 'x')); dir !== parsePath(dir).root; dir = dirname(dir)) expect(refusal(dir), dir).toMatch(REPOSITORY);
    expect(refusal(parsePath(ROOT).root)).toMatch(REPOSITORY);
    expect(refusal(join(ROOT, 'docs'))).toMatch(/is the repository's docs\/, which the site is made from/);
    expect(refusal(join(ROOT, 'examples'))).toMatch(/is the repository's examples\/, which the site is made from/);
    // Its other folders have files no build made.
    for (const kept of ['site', 'packages', 'spec', 'conformance', '.github']) expect(refusal(join(ROOT, kept)), kept).toMatch(/has files in it that an earlier build did not make/);
    // Its own _site/, where the site goes when no folder is named, is the builder's, marker or not.
    expect(refusal(join(ROOT, '_site'))).toBeNull();
    // The same folder spelled another way (Windows takes either case).
    if (process.platform === 'win32') expect(refusal(ROOT.toUpperCase())).toMatch(REPOSITORY);
  });

  it('refuses a folder with files in it that it did not make, and leaves them alone', () => {
    const dir = folder();
    mkdirSync(join(dir, 'work'));
    writeFileSync(join(dir, 'work', 'thesis.txt'), 'three years');
    expect(refusal(dir)).toMatch(/has files in it that an earlier build did not make \(it has no \.holoml-site file\), and building would delete them/);
    expect(() => buildSite(dir)).toThrow(/has files in it that an earlier build did not make/);
    expect(readFileSync(join(dir, 'work', 'thesis.txt'), 'utf8')).toBe('three years');
    expect(filesUnder(dir)).toEqual(['work/thesis.txt']);
    // And a file is not a folder.
    expect(refusal(join(dir, 'work', 'thesis.txt'))).toMatch(/is a file, not a folder/);
  });

  it('builds into a folder that is not there yet, an empty one, and one an earlier build made', () => {
    const dir = folder();
    expect(refusal(dir)).toBeNull();
    expect(refusal(join(dir, 'not', 'there', 'yet'))).toBeNull();
    const first = buildSite(dir, { examples: false }) as { problems: string[] };
    expect(first.problems).toEqual([]);
    expect(existsSync(join(dir, MARKER))).toBe(true);
    // Built again over its own work: what the last build left is gone, and the site is whole.
    writeFileSync(join(dir, 'left-over.html'), 'from the last build');
    expect(refusal(dir)).toBeNull();
    buildSite(dir, { examples: false });
    expect(existsSync(join(dir, 'left-over.html'))).toBe(false);
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
    expect(existsSync(join(dir, MARKER))).toBe(true);
    // The site made for these checks has its marker too.
    expect(existsSync(join(out, MARKER))).toBe(true);
  });
});

describe("the example sites' own pages: for browsers that do not show HoloML, a cart, a booking, a checkout", () => {
  const PAGES = EXAMPLES.flatMap((site) => filesUnder(join(ROOT, 'examples', site)).filter((f) => f.endsWith('.html') && !f.includes('/')).map((f) => `${site}/${f}`));

  it('are published, each with its language, its title, and one main heading', () => {
    for (const site of EXAMPLES) expect(PAGES, site).toContain(`${site}/index.html`);
    for (const page of ['sofa-studio/cart.html', 'harbour-loft/booking.html', 'sneaker-store/checkout.html']) expect(PAGES).toContain(page);
    for (const path of PAGES) {
      const page = html(path);
      expect(page, path).toMatch(/<html lang="en">/);
      expect(/<title>([^<]+)<\/title>/.exec(page)?.[1]?.trim(), path).toBeTruthy();
      expect(page.match(/<h1[\s>]/g)?.length, `${path}: one h1`).toBe(1);
      expect(page, path).toMatch(/<main>/);
    }
  });

  it('link only to files the site has, and ask nothing of another site', () => {
    for (const path of PAGES) {
      const page = html(path);
      const links = [...page.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]!);
      expect(links.length, path).toBeGreaterThan(0);
      for (const href of links.filter((h) => !/^[a-z][a-z0-9+.-]*:/i.test(h))) expect(existsSync(join(out, dirname(path), href.split(/[?#]/)[0]!)), `${path}: ${href}`).toBe(true);
      // Every page leads to its site's first page.
      expect(links, path).toContain('index.holoml');
      const fetched = [...page.matchAll(/<(?:img|script|link|source|iframe|video|audio)\b[^>]*\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]!);
      expect(fetched.filter((u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u)), path).toEqual([]);
      for (const [, from] of page.matchAll(/\bimport\s[^;]*?from\s+'([^']+)'/g)) expect(existsSync(join(out, dirname(path), from!)), `${path}: ${from}`).toBe(true);
      expect(page, path).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|<form\b[^>]*\saction=/);
    }
  });

  it('a status region is in the page before its text is shown, so that screen readers say it', () => {
    let regions = 0;
    for (const path of PAGES) {
      for (const [tag] of html(path).matchAll(/<[a-z0-9]+\b[^>]*\srole="status"[^>]*>/g)) {
        regions++;
        expect(tag, path).not.toMatch(/\shidden\b/);
      }
    }
    // The booking page's note and the checkout page's.
    expect(regions).toBe(2);
    expect(html('harbour-loft/booking.html')).toMatch(/<div role="status">\s*<p id="sent" hidden>/);
    expect(html('sneaker-store/checkout.html')).toMatch(/<div role="status">\s*<p class="placed" id="placed" hidden>/);
  });

  it("the booking page's focus ring is seen on its white card: 3 to 1 at least", () => {
    const page = html('harbour-loft/booking.html');
    const ring = /:focus-visible \{ outline: 3px solid (#[0-9a-f]{6});/.exec(page)?.[1] ?? '';
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    for (const ground of ['#ffffff', '#eef2f4']) {
      const [hi, lo] = [luminance(ring), luminance(ground)].sort((x, y) => y - x);
      expect((hi! + 0.05) / (lo! + 0.05), `${ring} on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Y6: for everyone', () => {
  it('every page says its language, has a title, one main heading, and a way past the bar', () => {
    for (const path of everyPage()) {
      const page = html(path);
      expect(page, path).toContain('<html lang="en-GB">');
      expect(/<title>([^<]+)<\/title>/.exec(page)?.[1]?.trim(), path).toBeTruthy();
      expect(page.match(/<h1[\s>]/g)?.length, `${path}: one h1`).toBe(1);
      expect(page, path).toContain('<a class="skip" href="#main">');
      expect(page, path).toContain('<main id="main">');
    }
  });

  it('headings go down one level at a time', () => {
    for (const path of everyPage()) {
      const levels = [...html(path).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      const skips = levels.flatMap((l, i) => (i > 0 && l > levels[i - 1]! + 1 ? [`h${levels[i - 1]} to h${l}`] : []));
      expect(skips, path).toEqual([]);
    }
  });

  it('every picture has its text, and ids are unique', () => {
    for (const path of everyPage()) {
      const page = html(path);
      for (const img of page.matchAll(/<img\b[^>]*>/g)) expect(img[0], path).toMatch(/\salt="[^"]+"/);
      const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
      expect(ids.filter((id, i) => ids.indexOf(id) !== i), path).toEqual([]);
    }
  });

  it('takes code that does not scroll out of the Tab order, and puts it back when it scrolls (code.js)', () => {
    // The page's blocks, as the script sees them: two that fit and one wider than its box.
    const block = (scrollWidth: number, clientWidth: number) => {
      const attributes = new Map([['tabindex', '0']]);
      return {
        scrollWidth,
        clientWidth,
        attributes,
        setAttribute: (name: string, value: string) => void attributes.set(name, value),
        removeAttribute: (name: string) => void attributes.delete(name),
      };
    };
    const blocks = [block(300, 600), block(900, 600), block(600, 600)];
    const listeners = new Map<string, () => void>();
    const asked: string[] = [];
    const document = { querySelectorAll: (selector: string) => (asked.push(selector), blocks) };
    const addEventListener = (type: string, listener: () => void) => void listeners.set(type, listener);
    new Function('document', 'addEventListener', readFileSync(join(out, 'code.js'), 'utf8'))(document, addEventListener);
    expect(asked).toEqual(['pre[tabindex]']);
    expect(blocks.map((b) => b.attributes.get('tabindex'))).toEqual([undefined, '0', undefined]);
    // The window narrows: the first block scrolls now, and the keyboard reaches it again.
    blocks[0]!.clientWidth = 200;
    blocks[1]!.clientWidth = 1000;
    listeners.get('resize')!();
    expect(blocks.map((b) => b.attributes.get('tabindex'))).toEqual(['0', undefined, undefined]);
    expect([...listeners.keys()].sort()).toEqual(['load', 'resize']);
  });

  it('the keyboard reaches everything that scrolls: code and tables', () => {
    for (const path of built.pages) {
      const page = html(path);
      for (const pre of page.matchAll(/<pre\b[^>]*>/g)) expect(pre[0], path).toContain('tabindex="0"');
      const tables = page.match(/<table>/g)?.length ?? 0;
      const regions = page.match(/<div class="table" role="region" aria-label="[^"]+" tabindex="0">\n<table>/g)?.length ?? 0;
      expect(regions, path).toBe(tables);
    }
  });

  it('every colour pair meets WCAG 2.2 AA, in light and in dark', () => {
    const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');
    const tokens = (block: string) => Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1]!, m[2]!]));
    const light = tokens(/:root \{([^}]*)\}/.exec(css)![1]!);
    const dark = tokens(/@media \(prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/.exec(css)![1]!);
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    for (const [scheme, t] of [['light', light], ['dark', dark]] as const) {
      for (const text of ['fg', 'muted', 'link', 'visited', 'must', 'hl-tag', 'hl-attr', 'hl-value', 'hl-comment', 'hl-keyword']) {
        for (const ground of ['bg', 'surface']) {
          expect(contrast(t[text]!, t[ground]!), `${scheme}: ${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrast(t.focus!, t.bg!), `${scheme}: the focus ring`).toBeGreaterThanOrEqual(3);
      expect(contrast(t.border!, t.bg!), `${scheme}: table rules under headers`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the playground as built (holoml #58: PG6 and PG7 in the page)', () => {
  const page = () => html(PLAYGROUND);

  it("is at playground/, in every page's bar, with its script, its styles, and the checker beside it", () => {
    expect(built.playground).toBe('playground/index.html');
    for (const file of ['playground.js', 'playground.css', 'first.holoml', 'holoml/parser.js', 'holoml/schema.js', 'holoml/rules.js']) {
      expect(existsSync(join(out, 'playground', file)), file).toBe(true);
    }
    for (const path of everyPage()) expect(html(path), path).toMatch(/<li><a href="(?:\.\.\/)*(?:playground\/)?index\.html"(?: aria-current="page"| class="here")?>Playground<\/a><\/li>/);
    expect(page()).toContain('<a href="index.html" aria-current="page">Playground</a>');
  });

  it('asks nothing of another site: its policy allows only its own scripts, styles, fetches, and frames', () => {
    const p = page();
    expect(p).toContain(`<meta http-equiv="Content-Security-Policy" content="${PLAYGROUND_CSP}">`);
    expect(PLAYGROUND_CSP).toBe("default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'");
    expect(p.match(/<script\b[^>]*>/gi)).toEqual(['<script src="../code.js" defer>', '<script type="module" src="playground.js">']);
    const fetched = [...p.matchAll(/<(?:img|script|link|source|iframe|video|audio)\b[^>]*\s(?:src|href)="([^"]*)"/gi)].map((m) => m[1]!);
    expect(fetched.filter((u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u))).toEqual([]);
    expect(p).not.toMatch(/\sstyle="/);
    // The viewer, on the same origin beside this site, takes its page from this one.
    expect(p).toContain('data-viewer="../../hypersol-hyperspace-3d/viewer/index.html?from=parent"');
    const css = readFileSync(join(out, 'playground', 'playground.css'), 'utf8');
    expect(css).not.toMatch(/@import|url\(|#[0-9a-f]{3,6}\b/i);
    const js = readFileSync(join(out, 'playground', 'playground.js'), 'utf8');
    expect(js).not.toMatch(/https?:|XMLHttpRequest|WebSocket|sendBeacon|localStorage|document\.cookie/);
    // It fetches only the presets, by addresses relative to itself, and talks to the viewer on its own origin only.
    expect([...js.matchAll(/\bfetch\(([^,]+),/g)].map((m) => m[1])).toEqual(['sourceOf(name)']);
    expect([...js.matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1])).toEqual(['waiting, location.origin']);
    expect(js).toContain('e.origin !== location.origin');
  });

  it('offers the first page and every example site as presets, each at its address in the site', () => {
    const values = [...page().matchAll(/<option value="([^"]+)">/g)].map((m) => m[1]!);
    expect(values[0]).toBe('first');
    expect(values.slice(1).sort()).toEqual([...EXAMPLES].sort());
    for (const name of values.slice(1)) expect(existsSync(join(out, name, 'index.holoml')), name).toBe(true);
  });

  it('names every control, reads its problems out, and leaves the text by Tab', () => {
    const p = page();
    expect(p).toMatch(/<label for="pg-preset">Start from<\/label>\s*<select id="pg-preset">/);
    expect(p).toMatch(/<textarea id="pg-text"[^>]*\saria-label="The page's HoloML"[^>]*\saria-describedby="pg-keys"/);
    expect(p).toMatch(/<p class="pg-count" id="pg-count" role="status">/);
    expect(p).toMatch(/<label class="pg-switch"><input type="checkbox" id="pg-live" checked> Draw as I type<\/label>/);
    expect(p).toMatch(/<button type="button" id="pg-run">Run<\/button>/);
    // The line numbers are for the eye; screen readers have the problems' lines and columns.
    expect(p).toMatch(/<pre class="pg-lines" id="pg-lines" aria-hidden="true">/);
    const js = readFileSync(join(out, 'playground', 'playground.js'), 'utf8');
    // The Tab key is left alone: it moves on, as everywhere on the site.
    expect(js).not.toMatch(/['"]Tab['"]/);
  });
});

describe('Y1: the specification as a page', () => {
  it('has its contents, with every numbered section and appendix', () => {
    const page = html('spec/index.html');
    const toc = /<nav class="toc"[\s\S]*?<\/nav>/.exec(page)?.[0] ?? '';
    const sections = [...page.matchAll(/<h2 id="((?:\d+|appendix-[a-z])-[^"]+)">/g)].map((m) => m[1]!);
    expect(sections.length).toBeGreaterThan(15);
    for (const id of sections) expect(toc, id).toContain(`href="#${id}"`);
    for (const id of ['index', 'references', 'acknowledgements']) expect(toc, id).toContain(`href="#${id}"`);
  });

  it('marks its requirement words, and never those in code', () => {
    const page = html('spec/index.html');
    expect(page.match(/<em class="rfc2119">/g)?.length ?? 0).toBeGreaterThan(50);
    for (const pre of page.matchAll(/<pre\b[\s\S]*?<\/pre>/g)) expect(pre[0]).not.toContain('rfc2119');
  });
});

describe('the pages alone, for HyperSpace 3D screenshots', () => {
  it('builds without the example sites, and checks links into them against their sources', () => {
    const pagesOnly = mkdtempSync(join(tmpdir(), 'holoml-pages-'));
    try {
      const result = buildSite(pagesOnly, { examples: false }) as { pages: string[]; problems: string[] };
      expect(result.problems).toEqual([]);
      expect(result.pages).toEqual(built.pages);
      for (const site of EXAMPLES) expect(existsSync(join(pagesOnly, site)), site).toBe(false);
      expect(existsSync(join(pagesOnly, 'pictures'))).toBe(true);
    } finally {
      rmSync(pagesOnly, { recursive: true, force: true });
    }
  });
});

describe('the HoloML in code blocks is coloured without changing it', () => {
  it('keeps every character of the text', () => {
    const text = '<holoml version="0.2">\n  <!-- a comment -->\n  <scene>\n    <model src="a.glb" solid />\n    <label>1 &lt; 2</label>\n  </scene>\n</holoml>';
    const coloured = (highlightHoloml(text) as string).replace(/<[^>]+>/g, '');
    const decoded = coloured.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    expect(decoded).toBe(text);
  });
});

/*
 * The playground's checker (holoml #58, check PG3's ground): the parser's
 * and the checker's sources as the builder writes them for the browser
 * (checkerModule: Node's own type stripping) answer as the sources do.
 */
type Parse = (text: string) => unknown;
type Check = (doc: unknown) => unknown[];
let checkerDir = '';
let parseModule: Parse;
let checkModule: Check;

beforeAll(async () => {
  checkerDir = mkdtempSync(join(tmpdir(), 'holoml-checker-'));
  for (const [name, source] of Object.entries(CHECKER as Record<string, string>)) writeFileSync(join(checkerDir, name), checkerModule(source) as string);
  parseModule = ((await import(pathToFileURL(join(checkerDir, 'parser.js')).href)) as { parse: Parse }).parse;
  checkModule = ((await import(pathToFileURL(join(checkerDir, 'schema.js')).href)) as { check: Check }).check;
});

afterAll(() => {
  if (checkerDir) rmSync(checkerDir, { recursive: true, force: true });
});

/** Every HoloML file under a folder of the repository. */
function holomlFiles(folder: string): string[] {
  return readdirSync(join(ROOT, folder), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith('.holoml'))
    .map((e) => relative(ROOT, join(e.parentPath, e.name)).split('\\').join('/'))
    .filter((f) => !f.split('/').includes('tools'));
}

/** What a reader says of a page: its one syntax error, or the checker's problems. */
function answer(parse: Parse, check: Check, text: string): unknown {
  try {
    return { problems: check(parse(text)) };
  } catch (e) {
    const err = e as { code?: string; detail?: string; position?: unknown };
    return { error: err.code, detail: err.detail, position: err.position };
  }
}

describe('the checker the playground runs', () => {
  it('is written as plain modules: no TypeScript imports, nothing from Node', () => {
    for (const name of Object.keys(CHECKER as Record<string, string>)) {
      const js = readFileSync(join(checkerDir, name), 'utf8');
      expect(js, name).not.toMatch(/from\s+'[^']*\.ts'/);
      expect(js, name).not.toMatch(/from\s+'node:|require\(/);
      expect(js, name).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
    }
  });

  it('answers as the sources do, for every conformance sample, example page, and the first page', () => {
    const files = [...holomlFiles('conformance'), ...holomlFiles('examples'), 'site/playground/first.holoml'];
    expect(files.length).toBeGreaterThan(150);
    let errors = 0;
    for (const file of files) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      const fromSource = answer(parseSource as Parse, checkSource as Check, text);
      expect(answer(parseModule, checkModule, text), file).toEqual(fromSource);
      if ('error' in (fromSource as object)) errors++;
    }
    // The syntax-error samples are among them, so a thrown error's code and place are compared too.
    expect(errors).toBeGreaterThan(10);
  });

  it("the playground's first page has no problems", () => {
    const text = readFileSync(join(ROOT, 'site/playground/first.holoml'), 'utf8');
    expect(answer(parseModule, checkModule, text)).toEqual({ problems: [] });
  });
});
