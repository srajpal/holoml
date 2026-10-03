// Builds the extension into dist/: the hover's words from SPEC.md
// (docs.json), and esbuild's two bundles, the extension and the language
// server, so that the .vsix carries no node_modules. The licences of the
// packages bundled into them are gathered into THIRD-PARTY-NOTICES.txt.
// With --tests it also bundles the tests that run inside VS Code into
// dist-test/.
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = fileURLToPath(new URL('.', import.meta.url));
rmSync(join(here, 'dist'), { recursive: true, force: true });
execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', join(here, 'src/make-docs.ts')], { stdio: 'inherit' });

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  // VS Code 1.96, the oldest the extension asks for, runs Node 20.
  target: 'node20',
  external: ['vscode'],
  logLevel: 'warning',
  absWorkingDir: here,
  metafile: true,
};
const result = await build({ ...common, entryPoints: { extension: 'src/extension.ts', server: 'src/server.ts' }, outdir: 'dist' });

if (process.argv.includes('--tests')) {
  rmSync(join(here, 'dist-test'), { recursive: true, force: true });
  await build({ ...common, metafile: false, entryPoints: { 'extension.test': 'test/vscode/extension.test.ts' }, outdir: 'dist-test' });
}

// The licence and notice go in the .vsix with the extension (vsce reads them from this folder).
copyFileSync(join(here, '../../LICENSE'), join(here, 'LICENSE'));
copyFileSync(join(here, '../../NOTICE'), join(here, 'NOTICE'));
writeFileSync(join(here, 'THIRD-PARTY-NOTICES.txt'), notices(result.metafile));

/** Each package from node_modules in the bundles, with its version and its licence's text. */
function notices(metafile) {
  const packages = new Map();
  for (const input of Object.keys(metafile.inputs)) {
    const parts = input.split(/[\\/]/);
    const at = parts.lastIndexOf('node_modules');
    if (at < 0) continue;
    const name = parts[at + 1].startsWith('@') ? `${parts[at + 1]}/${parts[at + 2]}` : parts[at + 1];
    const dir = join(here, ...parts.slice(0, at + 1), ...name.split('/'));
    packages.set(name, dir);
  }
  const out = ['The HoloML extension bundles these packages. Their licences follow.', ''];
  for (const [name, dir] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
    const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const file = readdirSync(dir).find((f) => /^licen[sc]e/i.test(f));
    if (!file) throw new Error(`${name} has no licence file to carry with it`);
    out.push('-'.repeat(72), `${name} ${meta.version} (${meta.license})`, '', readFileSync(join(dir, file), 'utf8').trim(), '');
  }
  return out.join('\n');
}
