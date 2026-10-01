import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The automatic builds' files (.github/workflows), read as text: what review 134 asked of them (E3, H3). */
const FOLDER = new URL('../.github/workflows/', import.meta.url);
const workflows = readdirSync(FOLDER).filter((f) => f.endsWith('.yml'));
const read = (name: string) => readFileSync(new URL(name, FOLDER), 'utf8').replace(/\r\n/g, '\n');

/** A job's own lines: from its name, two spaces in under "jobs:", to the next job or the file's end. */
function job(text: string, name: string): string {
  const jobs = text.slice(text.indexOf('\njobs:\n') + '\njobs:\n'.length);
  const start = jobs.search(new RegExp(`^ {2}${name}:\\n`, 'm'));
  expect(start, `the job ${name}`).toBeGreaterThanOrEqual(0);
  const rest = jobs.slice(start + name.length + 4);
  const next = rest.search(/^ {2}[a-z][a-z0-9_-]*:\n/m);
  return next < 0 ? rest : rest.slice(0, next);
}

describe('E3: the automatic builds', () => {
  it('name every action by its commit, with its version beside it', () => {
    expect(workflows.sort()).toEqual(['ci.yml', 'pages.yml']);
    let actions = 0;
    for (const name of workflows) {
      for (const line of read(name).split('\n').filter((l) => /^\s*(?:- )?uses:/.test(l))) {
        expect(line, name).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+(?:\.\d+)*$/);
        actions++;
      }
    }
    expect(actions).toBe(8);
  });

  it('give each workflow no more than reading the repository, except the job that publishes', () => {
    for (const name of workflows) {
      const text = read(name);
      // For the whole workflow: reading only.
      expect(/^permissions:\n((?: {2}.*\n)+)/m.exec(text)?.[1], name).toBe('  contents: read\n');
    }
    const pages = read('pages.yml');
    expect(pages.match(/^\s*(?:pages|id-token): write$/gm)).toHaveLength(2);
    const deploy = job(pages, 'deploy');
    expect(deploy).toMatch(/^ {4}permissions:\n {6}pages: write\n {6}id-token: write\n/m);
    // It publishes what "build" made, and does nothing else: no checkout, no install, no other action.
    expect(deploy).toMatch(/^ {4}needs: build$/m);
    expect(deploy.match(/uses: ([\w.-]+\/[\w.-]+)@/g)).toEqual(['uses: actions/deploy-pages@']);
    expect(deploy).not.toMatch(/\brun:/);
    const build = job(pages, 'build');
    expect(build).not.toMatch(/permissions:|: write/);
  });

  it('publish the site only after lint, types, and the tests have passed', () => {
    const build = job(read('pages.yml'), 'build');
    const steps = [...build.matchAll(/^ {8}run: (.+)$/gm)].map((m) => m[1]);
    expect(steps).toEqual(['pnpm install --frozen-lockfile', 'pnpm lint', 'pnpm typecheck', 'pnpm test', 'pnpm site:build']);
    // The site is handed over after them, and only by this job.
    expect(build.indexOf('actions/upload-pages-artifact@')).toBeGreaterThan(build.indexOf('pnpm site:build'));
    // At whatever version Dependabot has pinned it: the order of the steps and the path are the requirement.
    expect(build).toMatch(/upload-pages-artifact@[0-9a-f]{40} # v\d+(?:\.\d+)*\n {8}with:\n {10}path: _site\n/);
  });

  it('keep the names the rule on GitHub asks for: CI on windows-latest and ubuntu-latest', () => {
    const ci = read('ci.yml');
    expect(ci).toMatch(/^name: CI$/m);
    expect(job(ci, 'test')).toMatch(/^ {4}name: \$\{\{ matrix\.os \}\}\n[\s\S]*^ {8}os: \[windows-latest, ubuntu-latest\]$/m);
    expect([...job(ci, 'test').matchAll(/^ {8}run: (.+)$/gm)].map((m) => m[1])).toEqual(['pnpm install --frozen-lockfile', 'pnpm lint', 'pnpm typecheck', 'pnpm test']);
  });
});

describe('H3: Dependabot', () => {
  it('looks weekly at the actions and the packages, minor and patch updates together, five open at most', () => {
    const text = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(text).toMatch(/^version: 2$/m);
    const entries = text.split(/^ {2}- package-ecosystem: /m).slice(1);
    expect(entries.map((e) => e.split('\n')[0])).toEqual(['github-actions', 'npm']);
    for (const entry of entries) {
      expect(entry).toMatch(/^ {4}directory: \/$/m);
      expect(entry).toMatch(/^ {4}schedule:\n {6}interval: weekly$/m);
      expect(entry).toMatch(/^ {4}open-pull-requests-limit: 5$/m);
      expect(entry).toMatch(/^ {4}groups:\n {6}[a-z]+:\n {8}patterns: \['\*'\]\n {8}update-types: \[minor, patch\]$/m);
    }
  });
});
