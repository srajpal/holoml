// The aquarium's fish: where each file comes from (at a fixed version, with
// its checksum), who made it and under what licence, and how prepare.mjs
// fits it for the tank: its length in metres, which way its head faces in
// the file, and the swim it has (its own clip) or gets (made by rig.mjs).
//
// Every one is CC BY 4.0 or CC0 (owner, prompt 122, Q1 a); none is
// "non-commercial", "no derivatives", or "share alike". The Sketchfab
// models come from Objaverse, the Allen Institute for AI's copy of
// Sketchfab's free models on Hugging Face. Its records give each one's
// author and licence, and each file carries its own stamp from Sketchfab
// (asset.extras: author, license, source, title). The two can disagree
// (the record of a turtle used here before said CC BY, its file
// CC BY-NC), and the file's stamp is the one to believe: licence.mjs
// stops download.mjs and prepare.mjs when a stamp and the credit below
// differ, or when either is not CC BY 4.0 or CC0.
//
// The shark and the snapper come from the Babylon.js asset library
// (github.com/BabylonJS/Assets), and their files carry no stamp. The
// library's README, at the commit below, says: "This work is licensed
// under a Creative Commons Attribution 4.0 International License (Unless
// specified otherwise in the asset folder)"; its LICENSE file is that
// licence's text; and neither file's folder (meshes/ and
// meshes/Demos/UnderWaterScene/fish/) has a file that says otherwise
// (read 2026-09-30).

const OBJAVERSE_REVISION = '21e4e142159e2153706c23a3a02e55cec5591cea';
export const BABYLON_COMMIT = 'ddad48e7c2dfdaf1d09f53263f3f4116537e73bf';
const KHRONOS_COMMIT = 'f36bfdabd1031c3cf6689a50570b8cdf3678b49c';

const objaverse = (folder, uid) => `https://huggingface.co/datasets/allenai/objaverse/resolve/${OBJAVERSE_REVISION}/glbs/${folder}/${uid}.glb`;
const babylon = (path) => `https://raw.githubusercontent.com/BabylonJS/Assets/${BABYLON_COMMIT}/meshes/${path}`;
const sketchfab = (uid) => `https://sketchfab.com/3d-models/${uid}`;

/**
 * id       the file's name in models/ (id.glb)
 * url      where download.mjs gets it; sha256, the file's checksum
 * length   its length in the tank, in metres
 * forward  which way its head faces in the file (+x, -x, +z, -z)
 * clip     its own swimming clip, kept as "Swim" (others are dropped); without one, rig.mjs makes "Swim"
 * rig      how rig.mjs makes its swim, when it has no clip (riggedFish's options: beat, sway, bend)
 * turtle   a sea turtle without a clip: rig.mjs gives it a turtle's skeleton and swim (riggedTurtle)
 * triangles  at most this many for the whole fish: a more detailed file is made lighter (shapes.mjs thinTo); the
 *          tank has many fish, and drawn in software (a computer without a graphics card) each triangle counts
 * credit   for the about page and models/CREDITS.md: the licence is 'CC BY 4.0' or 'CC0 1.0' (licence.mjs checks it
 *          against the file's own stamp)
 */
export const FISH = [
  {
    id: 'shark',
    name: 'Great white shark',
    url: babylon('shark.glb'),
    sha256: '6c290b68c0d974591c29a623975156656e0ece2002cf65c09f0f4d209b4bb0c6',
    length: 3.2,
    forward: '+z',
    clip: 'swimming',
    triangles: 12000,
    credit: {
      title: 'shark.glb',
      author: 'the Babylon.js authors',
      source: 'https://github.com/BabylonJS/Assets/blob/master/meshes/shark.glb',
      licence: 'CC BY 4.0',
    },
  },
  {
    id: 'turtle',
    name: 'Hawksbill sea turtle',
    url: objaverse('000-028', 'bd6c9327fd52469782f055a182659bd2'),
    sha256: 'f4de0797735d6ee724bbae3db057974308f32dc65b89e44f523f164040f85c45',
    length: 1.1,
    forward: '+z',
    clip: null,
    turtle: true,
    credit: { title: 'Hawksbill Turtle', author: 'Bindestrek', source: sketchfab('bd6c9327fd52469782f055a182659bd2'), licence: 'CC BY 4.0' },
  },
  {
    id: 'bream',
    name: 'Gilt-head bream',
    url: objaverse('000-090', 'a3d0e1a597794a9bb74739a13cfc8b77'),
    sha256: 'ffd4f5597aaa099fc5855a5e3a046e9ea34dc37ca6bcae399e1536e0a43e07bc',
    length: 0.35,
    forward: '+z',
    clip: 'ArmatureAction',
    credit: { title: 'Bream Fish ( Dorade Royale)', author: 'BlueMesh', source: sketchfab('a3d0e1a597794a9bb74739a13cfc8b77'), licence: 'CC BY 4.0' },
  },
  {
    id: 'mackerel',
    name: 'Atlantic mackerel',
    url: objaverse('000-146', '4e73d0ba00744cd7af781ff44637b0a7'),
    sha256: '361df65a815edd188a6768db9950115098be1472ed0e1ee42c253c1541f51e22',
    length: 0.35,
    forward: '-x',
    clip: null,
    triangles: 4000,
    credit: { title: 'Mackerel', author: 'Amy Scott-Murray', source: sketchfab('4e73d0ba00744cd7af781ff44637b0a7'), licence: 'CC BY 4.0' },
  },
  {
    id: 'barramundi',
    name: 'Barramundi',
    url: `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${KHRONOS_COMMIT}/Models/BarramundiFish/glTF-Binary/BarramundiFish.glb`,
    sha256: 'ecc3bafb6b00f2c8b810863c388e3768a7b7ea0d0335e8cb8c574c266e571f4a',
    length: 0.9,
    forward: '+z',
    clip: null,
    credit: { title: 'Barramundi Fish', author: 'Microsoft', source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish', licence: 'CC0 1.0' },
  },
  {
    id: 'snapper',
    name: 'Grey snapper',
    url: babylon('Demos/UnderWaterScene/fish/greySnapper_vertColor.glb'),
    sha256: '4d81d3846ad368202edfaba094a0302353d8414035b2238a29e8cd1e5717e452',
    length: 0.45,
    forward: '+z',
    clip: null,
    credit: {
      title: 'greySnapper_vertColor.glb (from the underwater scene demo)',
      author: 'the Babylon.js authors',
      source: 'https://github.com/BabylonJS/Assets/tree/master/meshes/Demos/UnderWaterScene/fish',
      licence: 'CC BY 4.0',
    },
  },
  {
    id: 'tuna',
    name: 'Tuna',
    url: objaverse('000-098', 'c5fad940863f47f784d792ca95e16b42'),
    sha256: '6d0d719d5196c744b7813a6079c6fe245126f1c6963d91a5285d62cf5ede28c0',
    length: 1.5,
    forward: '+z',
    // Its own clip swings the whole body; a tuna swims with a stiff body and a quick tail, so its swim is made here.
    clip: null,
    rig: { beat: 0.55, sway: 24, bend: [-0.12, -0.42] },
    credit: { title: 'Tuna Fish', author: 'GoldenZtuff', source: sketchfab('c5fad940863f47f784d792ca95e16b42'), licence: 'CC BY 4.0' },
  },
  {
    id: 'clownfish',
    name: 'Clownfish',
    url: objaverse('000-121', '47ba2679d91a4f14b3fc0bf8e3805af5'),
    sha256: '132019550eea333821eb51fe8fb5cfe75f9453f7181ad76d59504d6dd342c31f',
    length: 0.11,
    forward: '+z',
    clip: null,
    credit: { title: 'Clownfish', author: 'zixisun02', source: sketchfab('47ba2679d91a4f14b3fc0bf8e3805af5'), licence: 'CC BY 4.0' },
  },
  {
    id: 'butterflyfish',
    name: 'Copperband butterflyfish',
    url: objaverse('000-056', 'f96d04dc6ccb4fe4861622ea24fae361'),
    sha256: '9af639e9c8c4717af7890cb3f8234c788d0c9e2a0e9f514d443d6bcb63a1247b',
    length: 0.18,
    forward: '-x',
    clip: null,
    credit: { title: 'Copperband Butterflyfish', author: 'Dsanchez13', source: sketchfab('f96d04dc6ccb4fe4861622ea24fae361'), licence: 'CC BY 4.0' },
  },
];
