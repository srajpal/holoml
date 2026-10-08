// Makes each fish's lighter version for far away (HyperSpace 3D milestone
// 25, Q6 a; HoloML 0.3's `far`): models/<fish>-far.glb, from
// models/<fish>.glb, with under a third of its triangles (about a fifth;
// the mackerel, whose seams hold on to its corners, 29 per cent) and its
// pictures at 256 pixels at most, by glTF Transform (`weld`, `simplify`,
// then `resize`). `simplify`'s ratio counts corners, not triangles, so a
// fish still too heavy is simplified again with a smaller ratio; a fish
// that never gets light enough stops the tool. It keeps the fish's
// skeleton and its "Swim" animation, so a far fish swims as a near one
// does. The fish's licences and credits are its model's
// (models/CREDITS.md).
//
//   node examples/aquarium/tools/far.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MODELS = join(here, '..', 'models');
const ROOT = join(here, '..', '..', '..');
const CLI = join(ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
export const FISH = ['shark', 'turtle', 'tuna', 'barramundi', 'bream', 'mackerel', 'snapper', 'clownfish', 'butterflyfish'];

const run = (...args) => execFileSync(process.execPath, [CLI, ...args], { stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });

/** A .glb file's triangles and animations' names. */
function facts(file) {
  const b = readFileSync(file);
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  let triangles = 0;
  for (const m of json.meshes ?? []) for (const p of m.primitives) triangles += json.accessors[p.indices].count / 3;
  return { triangles, animations: (json.animations ?? []).map((a) => a.name), skins: (json.skins ?? []).length };
}

const work = mkdtempSync(join(tmpdir(), 'far-fish-'));
try {
  for (const fish of FISH) {
    const near = join(MODELS, `${fish}.glb`);
    const far = join(MODELS, `${fish}-far.glb`);
    const welded = join(work, `${fish}-welded.glb`);
    const simpler = join(work, `${fish}.glb`);
    run('weld', near, welded);
    const a = facts(near);
    // Under a third of the triangles: a smaller ratio each time, down to 0.05.
    for (let ratio = 0.2; ; ratio = Math.round((ratio - 0.05) * 100) / 100) {
      run('simplify', welded, simpler, '--ratio', String(ratio), '--error', '0.01');
      if (facts(simpler).triangles < a.triangles / 3) break;
      if (ratio <= 0.05) throw new Error(`${fish}: not light enough at a ratio of ${ratio}`);
    }
    run('resize', simpler, far, '--width', '256', '--height', '256');
    const b = facts(far);
    // What a far fish must keep: its skeleton and its animation.
    if (b.skins !== a.skins || b.animations.join() !== a.animations.join()) throw new Error(`${fish}: the far version lost its skeleton or its animation`);
    console.log(`${fish}: ${a.triangles} triangles to ${b.triangles}; ${(statSync(near).size / 1024).toFixed(0)} KB to ${(statSync(far).size / 1024).toFixed(0)} KB`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
