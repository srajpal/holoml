// Writes the showroom's pages: the hall (index.holoml), a page for each
// car in each of its colours, and the about page. The pages are plain
// HoloML 0.3, with no scripts (a 0.1 site until HyperSpace 3D's
// milestone 25, which gave every model a screen reader reaches a name);
// this script only keeps fifteen similar car pages in step.
//
//   node examples/showroom/tools/make-pages.mjs
import { writeFileSync } from 'node:fs';

/** The cars. Names, lines, and numbers are made up; the models are Kenney's (see models/CREDITS.md). */
export const CARS = [
  {
    id: 'quellis',
    name: 'Quellis',
    line: 'A quiet four-door for long roads',
    facts: '4 doors · 5 seats · 0 to 100 km/h in 7.9 s',
    colours: [
      ['Red', '#c8243a'],
      ['Ocean blue', '#2c5fbf'],
      ['Silver', '#b8bcc6'],
    ],
  },
  {
    id: 'pippet',
    name: 'Pippet',
    line: 'A small hatchback that parks anywhere',
    facts: '3 doors · 4 seats · 3.6 m long',
    colours: [
      ['Mint', '#3aa56f'],
      ['Sunflower', '#f2c230'],
      ['Chalk', '#e8e8ec'],
    ],
  },
  {
    id: 'tallberg',
    name: 'Tallberg',
    line: 'A tall seven-seater for the mountains',
    facts: '5 doors · 7 seats · four-wheel drive',
    colours: [
      ['Amber', '#f09a3a'],
      ['Graphite', '#4a4d57'],
      ['Glacier', '#dfe7ee'],
    ],
  },
  {
    id: 'veyl',
    name: 'Veyl',
    line: 'A concept racer from the year 2101',
    facts: '1 seat · electric · 0 to 100 km/h in 2.1 s',
    colours: [
      ['Cobalt', '#3f6fd6'],
      ['Violet', '#8b5cf6'],
      ['Night', '#1b1c22'],
    ],
  },
  {
    id: 'strafe',
    name: 'Strafe',
    line: 'An open-wheel racer: one seat, no roof',
    facts: '1 seat · 6 gears · 310 km/h',
    colours: [
      ['Flame', '#e0472f'],
      ['Tangerine', '#ff8a1f'],
      ['Lagoon', '#1fa7a0'],
    ],
  },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
/** A car's page in one of its colours; the first colour is the car's own page. */
export const pageOf = (car, i) => (i === 0 ? `${car.id}.holoml` : `${car.id}-${slug(car.colours[i][0])}.holoml`);

const HEAD = (title, description) => `<holoml version="0.3" lang="en">
  <head>
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="The HoloML Authors" />
  </head>`;

/**
 * The car on its plinth, 1.8 times the kit's size (about 4.6 m long), facing +z like the kit's cars. A car on its
 * own page has a name for screen readers (`name`, HoloML 0.3); in the hall, each car is inside its link, which its
 * label names, and a name there would be heard twice.
 */
const car = (c, colour, indent, name) => `${indent}<model src="models/plinth.gltf"${name ? ' label="Plinth"' : ''} />
${indent}<model src="models/${c.id}.glb"${name ? ` label="${name}"` : ''} position="0 0.25 0" scale="1.8">
${indent}  <material name="Paint" color="${colour}" metalness="0.5" roughness="0.45" />
${indent}  <material name="Glass" opacity="0.55" />
${indent}</model>`;

// ---- The hall

// The middle car turns on a turntable; the other four stand around it.
// Each name sits clear of its car's roof, as seen from where the viewer starts.
const PLACES = [
  { position: '-8.5 0 -3', rotation: '0 50 0', labelY: 3.3 },
  { position: '-5 0 -7.5', rotation: '0 25 0', labelY: 3.7 },
  { position: '0 0 0', rotation: '0 0 0', labelY: 2.5 },
  { position: '5 0 -7.5', rotation: '0 -25 0', labelY: 3.7 },
  { position: '8.5 0 -3', rotation: '0 -50 0', labelY: 3.3 },
];
const ORDER = ['quellis', 'pippet', 'veyl', 'tallberg', 'strafe'];

const stands = ORDER.map((id, i) => {
  const c = CARS.find((x) => x.id === id);
  const { position, rotation, labelY } = PLACES[i];
  const [x, , z] = position.split(' ');
  const middle = i === 2;
  return `
    <!-- ${c.name}: ${c.line.toLowerCase()}. -->
    <light type="spot" position="${x} 9 ${z}" look-at="${position}" angle="20" range="16" intensity="8" color="#fff4e0" />
    <a href="${c.id}.holoml">
      <group${middle ? ' id="turntable"' : ''} position="${position}" rotation="${rotation}">
${car(c, c.colours[0][1], '        ')}
      </group>
      <label position="${x} ${labelY} ${z}" size="0.45">${c.name}</label>
    </a>
    <label position="${x} ${(labelY - 0.45).toFixed(2)} ${z}" size="0.26" color="#b8c4e0">${c.line}</label>`;
}).join('\n');

const hall = `${HEAD('HoloML showroom', 'Five cars in a round hall. Orbit around them, and choose one to walk around it.')}
  <scene background="#07090f">
    <viewpoint position="0 3 15" look-at="0 1.8 -3" mode="orbit" />
    <light type="ambient" intensity="0.3" />
    <light type="directional" position="6 14 12" look-at="0 0 0" intensity="0.6" />
    <model src="models/hall.gltf" label="The hall" />

    <label position="0 5.2 -13" size="1" color="#7fd8ff">HoloML showroom</label>
    <label position="0 4.2 -13" size="0.4">Choose a car to walk around it</label>
    <a href="about.holoml">
      <label position="0 3.55 -13" size="0.34" color="#7fd8ff">About this showroom</label>
    </a>
${stands}
    <animate target="#turntable" attribute="rotation" from="0 0 0" to="0 360 0" duration="30s" repeat="indefinite" />
  </scene>
</holoml>
`;
writeFileSync(new URL('../index.holoml', import.meta.url), hall);
console.log('wrote index.holoml');

// ---- A page per car and colour

for (const c of CARS) {
  c.colours.forEach(([colourName, colour], i) => {
    const others = c.colours
      .map(([n], k) => ({ n, k }))
      .filter(({ k }) => k !== i)
      .map(({ n, k }, j) => `    <a href="${pageOf(c, k)}">
      <label position="3.6 ${(1.75 - j * 0.4).toFixed(2)} 1" size="0.26" color="#7fd8ff">${n}</label>
    </a>`)
      .join('\n');
    const page = `${HEAD(`${c.name} in ${colourName.toLowerCase()} · HoloML showroom`, `${c.name}: ${c.line.toLowerCase()}. Walk around it.`)}
  <scene background="#07090f">
    <viewpoint position="2 1.7 9" look-at="0.6 1.1 0" mode="walk" />
    <light type="ambient" intensity="0.35" />
    <light type="directional" position="5 12 9" look-at="0 0 0" intensity="0.7" />
    <light type="spot" position="0 9 0" look-at="0 0 0" angle="22" range="16" intensity="9" color="#fff4e0" />
    <model src="models/hall.gltf" label="The hall" />

${car(c, colour, '    ', `${c.name} in ${colourName.toLowerCase()}`)}
    <label id="name" position="0 4 0" size="0.6">${c.name}</label>
    <label position="0 3.45 0" size="0.24" color="#b8c4e0">${c.line}</label>
    <label position="0 3.1 0" size="0.2" color="#b8c4e0">${c.facts}</label>

    <label position="3.6 2.2 1" size="0.24">${colourName}, shown. Also in:</label>
${others}
    <a href="index.holoml">
      <label position="3.6 0.75 1" size="0.26" color="#7fd8ff">Back to the hall</label>
    </a>
    <label position="3.6 0.3 1" size="0.16" color="#b8c4e0">Walk: W, A, S, D or the arrows · drag to look</label>
  </scene>
</holoml>
`;
    writeFileSync(new URL(`../${pageOf(c, i)}`, import.meta.url), page);
    console.log(`wrote ${pageOf(c, i)}`);
  });
}

// ---- About

const about = `${HEAD('About the HoloML showroom', 'What this showroom is, what it is made of, and where to find HoloML.')}
  <scene background="#07090f">
    <viewpoint position="0 2 9" look-at="0 2 0" mode="orbit" />
    <light type="ambient" intensity="0.6" />
    <model src="models/hall.gltf" label="The hall" />

    <label position="0 4.4 0" size="0.6" color="#7fd8ff">About this showroom</label>
    <label position="0 3.6 0" size="0.22">Every page here is HoloML 0.3: plain markup, like HTML, for 3D.</label>
    <label position="0 3.2 0" size="0.22">Models, lights, labels, links, colours, and the turntable are all written in the page.</label>
    <label position="0 2.8 0" size="0.22">The cars come from Kenney's Car Kit (kenney.nl, CC0). Their names and numbers are made up.</label>
    <label position="0 2.4 0" size="0.22">The hall and plinths were made for this showroom.</label>

    <a href="https://github.com/srajpal/holoml/blob/main/SPEC.md">
      <label position="0 1.7 0" size="0.24" color="#7fd8ff">The HoloML specification</label>
    </a>
    <a href="https://github.com/srajpal/holoml/tree/main/examples/showroom">
      <label position="0 1.3 0" size="0.24" color="#7fd8ff">This showroom's source</label>
    </a>
    <a href="https://github.com/srajpal/hypersol-hyperspace-3d">
      <label position="0 0.9 0" size="0.24" color="#7fd8ff">HyperSpace 3D, the browser that shows it</label>
    </a>
    <a href="index.holoml">
      <label position="0 0.4 0" size="0.24" color="#7fd8ff">Back to the hall</label>
    </a>
  </scene>
</holoml>
`;
writeFileSync(new URL('../about.holoml', import.meta.url), about);
console.log('wrote about.holoml');
