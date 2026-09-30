import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, parse as parsePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MARKER, buildSite, highlightHoloml, isPublished, pages, refusal } from './build.mjs';

/** The site (browser milestone 22), built into a folder of its own for these checks. */
let out = '';
let built: { pages: string[]; problems: string[] } = { pages: [], problems: [] };
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
    expect(EXAMPLES).toHaveLength(6);
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
    for (const path of built.pages) {
      const page = html(path);
      expect(page, path).toContain('<html lang="en-GB">');
      expect(/<title>([^<]+)<\/title>/.exec(page)?.[1]?.trim(), path).toBeTruthy();
      expect(page.match(/<h1[\s>]/g)?.length, `${path}: one h1`).toBe(1);
      expect(page, path).toContain('<a class="skip" href="#main">');
      expect(page, path).toContain('<main id="main">');
    }
  });

  it('headings go down one level at a time', () => {
    for (const path of built.pages) {
      const levels = [...html(path).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      const skips = levels.flatMap((l, i) => (i > 0 && l > levels[i - 1]! + 1 ? [`h${levels[i - 1]} to h${l}`] : []));
      expect(skips, path).toEqual([]);
    }
  });

  it('every picture has its text, and ids are unique', () => {
    for (const path of built.pages) {
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
