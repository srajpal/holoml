import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildSite, highlightHoloml, pages } from './build.mjs';

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

const EXAMPLES = readdirSync(new URL('../examples/', import.meta.url), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

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
  });

  it('asks nothing of another site: every picture, style, and script is its own', () => {
    for (const path of built.pages) {
      const page = html(path);
      const fetched = [...page.matchAll(/<(?:img|script|link|source|iframe|video|audio)\b[^>]*\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]!);
      expect(fetched.filter((u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u)), path).toEqual([]);
      expect(page, path).not.toMatch(/<script\b/);
      expect(page, path).not.toMatch(/\sstyle="[^"]*url\(/);
    }
    const css = readFileSync(join(out, 'style.css'), 'utf8');
    expect(css).not.toMatch(/@import|url\(/);
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
