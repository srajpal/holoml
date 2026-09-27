// Copies Blockworld's sound effects from Kenney's sound packs (CC0,
// https://kenney.nl): Impact Sounds, Interface Sounds, and Music Jingles.
// Download and unpack them into one folder, and run from the repository
// root:
//
//   node examples/blockworld/tools/copy-sounds.mjs "<folder with the unpacked packs>"
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const packs = process.argv[2];
if (!packs) throw new Error('Give the folder that holds impact-sounds/, interface-sounds/, and music-jingles/');

/** The page's name for each sound, and where it comes from. */
const SOUNDS = {
  'step-1.ogg': 'impact-sounds/Audio/footstep_grass_000.ogg',
  'step-2.ogg': 'impact-sounds/Audio/footstep_grass_003.ogg',
  'break.ogg': 'impact-sounds/Audio/impactMining_001.ogg',
  'place.ogg': 'impact-sounds/Audio/impactPlank_medium_000.ogg',
  'gem.ogg': 'interface-sounds/Audio/confirmation_001.ogg',
  'chest.ogg': 'interface-sounds/Audio/drop_002.ogg',
  'won.ogg': 'music-jingles/Audio/Pizzicato jingles/jingles_PIZZI00.ogg',
};

for (const [name, from] of Object.entries(SOUNDS)) {
  copyFileSync(join(packs, from), new URL(`../sounds/${name}`, import.meta.url));
  console.log(`${from} -> sounds/${name}`);
}
