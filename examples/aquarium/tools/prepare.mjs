// Makes the aquarium's files from what download.mjs saved in tools/cache/
// (the fish that tools/fish.mjs lists, with their licences):
//
// - models/<fish>.glb: each fish fitted for the tank (fit.mjs: materials
//   three.js can draw, its head to +z, its length in metres, its own swim
//   kept as "Swim"), or, for a fish whose file has no swim, given a
//   skeleton and one (rig.mjs); its pictures at most 1,024 pixels a side
//   (512 for small fish);
// - models/CREDITS.md.
//
// It uses Electron's picture decoder and encoder, so run it with Electron
// (any recent version) from the repository root:
//
//   electron examples/aquarium/tools/prepare.mjs
import { app, nativeImage } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FISH } from './fish.mjs';
import { fitFish, fitMaterials } from './fit.mjs';
import { readGlb, readImage } from './glb.mjs';
import { placedFish, riggedFish } from './rig.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const site = join(here, '..');
const MODELS = join(site, 'models');

/** A picture at most `side` pixels a side: JPEG, or PNG where it has see-through parts. */
function picture(bytes, side, keepAlpha) {
  let image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) throw new Error('a picture Electron cannot read');
  const { width, height } = image.getSize();
  if (Math.max(width, height) > side) {
    const k = side / Math.max(width, height);
    image = image.resize({ width: Math.round(width * k), height: Math.round(height * k), quality: 'best' });
  }
  return keepAlpha ? { bytes: image.toPNG(), mimeType: 'image/png' } : { bytes: image.toJPEG(88), mimeType: 'image/jpeg' };
}

/** Which of the file's images a see-through material uses as its colour (kept as PNG). */
function seeThrough(g) {
  const out = new Set();
  for (const m of fitMaterials(g)) {
    const t = m.pbrMetallicRoughness?.baseColorTexture?.index;
    if (t !== undefined && m.alphaMode && m.alphaMode !== 'OPAQUE') out.add(g.textures[t].source);
  }
  return out;
}

function fish() {
  mkdirSync(MODELS, { recursive: true });
  const sizes = [];
  for (const f of FISH) {
    const { json: g, bin } = readGlb(join(cache, `${f.id}.glb`));
    const side = f.length < 0.3 ? 512 : 1024;
    const alpha = seeThrough(g);
    const pictures = (i) => {
      const { bytes } = readImage(g, bin, i);
      return picture(bytes, side, alpha.has(i));
    };
    let out;
    if (f.clip || f.turtle) {
      out = fitFish(f.id, g, bin, f, pictures);
    } else {
      const prims = placedFish(g, bin, f);
      out = riggedFish(f.id, prims, { materials: fitMaterials(g), length: f.length, ...(f.rig ?? {}) });
      if (g.images) {
        out.json.images = g.images.map((_, i) => {
          const p = pictures(i);
          return { mimeType: p.mimeType, bufferView: out.writer.bytes(p.bytes) };
        });
        out.json.textures = g.textures;
        out.json.samplers = g.samplers ?? [];
      }
    }
    const bytes = out.writer.write();
    writeFileSync(join(MODELS, `${f.id}.glb`), bytes);
    sizes.push([f.id, bytes.length]);
    console.log(`models/${f.id}.glb: ${(bytes.length / 1e6).toFixed(2)} MB`);
  }
  return sizes;
}

function credits() {
  const lines = [
    '# The aquarium\'s fish',
    '',
    'Each fish was fitted for the tank by tools/prepare.mjs: its materials',
    'made drawable by three.js, turned, sized, and centred, its pictures made',
    'smaller, and, where its file had no swim, given a skeleton and one (made',
    'here). The Sketchfab models come from Objaverse, the Allen Institute for',
    "AI's copy of Sketchfab's free models (huggingface.co/datasets/allenai/objaverse),",
    'whose records give their authors and licences.',
    '',
  ];
  for (const f of FISH) {
    lines.push(`- ${f.id}.glb, ${f.name}: "${f.credit.title}" by ${f.credit.author}, ${f.credit.source}, ${f.credit.licence}.`);
  }
  writeFileSync(join(MODELS, 'CREDITS.md'), `${lines.join('\n')}\n`);
}

app.whenReady().then(() => {
  try {
    fish();
    credits();
  } catch (e) {
    console.error(e);
    app.exit(1);
    return;
  }
  app.quit();
});
