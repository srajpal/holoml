// Compresses the sneaker store's shoes (HyperSpace 3D milestone 25, Q6 a):
// each shoe's shape, with Draco (KHR_draco_mesh_compression), by glTF
// Transform, so the store downloads less. The pictures stay as they are.
// prepare.mjs runs it last; it can also be run alone, from the repository
// root, on the shoes already made:
//
//   node examples/sneaker-store/tools/compress.mjs
//
// A shoe already compressed is left alone, so running it twice changes
// nothing.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MODELS = join(here, '..', 'models');
const ROOT = join(here, '..', '..', '..');
/** glTF Transform's command, run with this Node (no shell). */
const CLI = join(ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');

/** Whether a .glb file says it needs Draco already. */
function compressed(file) {
  const bytes = readFileSync(file);
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return (json.extensionsRequired ?? []).includes('KHR_draco_mesh_compression');
}

let before = 0;
let after = 0;
// The output's extension says what glTF Transform writes: a .glb, in a folder of its own, then copied over the shoe.
const work = mkdtempSync(join(tmpdir(), 'shoes-'));
for (const name of readdirSync(MODELS).filter((n) => /^shoe(-[a-z]+)?(-far)?\.glb$/.test(n))) {
  const file = join(MODELS, name);
  if (compressed(file)) continue;
  before += statSync(file).size;
  const out = join(work, name);
  // Under Electron (prepare.mjs), its own program runs as Node only when told to.
  execFileSync(process.execPath, [CLI, 'draco', file, out], { stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
  // Only a whole .glb that says it needs Draco replaces the shoe.
  if (!compressed(out)) throw new Error(`${name}: glTF Transform did not write a Draco .glb`);
  copyFileSync(out, file);
  after += statSync(file).size;
}
rmSync(work, { recursive: true, force: true });
console.log(before ? `shoes compressed: ${(before / 1048576).toFixed(1)} MB to ${(after / 1048576).toFixed(1)} MB` : 'shoes already compressed');
