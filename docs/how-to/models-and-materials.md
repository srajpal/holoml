# Show a model and change its materials

This guide puts a 3D model in a scene, and places, turns, and sizes it.
It plays the model's own animation, groups models so that they move as
one, and changes the model's materials: their colour and shine, and, in
a page that says `version="0.2"`, the pictures on them.

## Put a model in the scene

A `model` shows a glTF 2.0 file. glTF is the Khronos Group's open format
for 3D models: a `.glb` file holds everything in one file, and a `.gltf`
file is text, which may keep its data and pictures in files beside it.
`src` is the file's address, relative to the page, as in HTML. One of
the showroom's cars, on its plinth:

```holoml-scene
<viewpoint position="2 1.7 9" look-at="0.6 1.1 0" mode="orbit" />
<model src="models/plinth.gltf" />
<model src="models/pippet.glb" position="0 0.25 0" rotation="0 25 0" scale="1.8" />
```

The viewer starts about 9 metres away and orbits the car: drag to go
around it, and scroll to come closer. A model that cannot be loaded is
left out, and the rest of the scene is still shown.

- `position`: where the model's origin (the point `0 0 0` in its file)
  goes, in metres. Space has y up, and the floor is y = 0; x is to the
  right, and z toward the side the viewer starts on. The plinth is
  0.25 m high, so the car stands at y = 0.25.
- `rotation`: three angles in degrees, about x, y, and z. To turn a
  model to face another way, change the middle number: `0 90 0` is a
  quarter turn.
- `scale`: one number, the same on every axis, or three. The showroom's
  cars are 1.8 times their file's size.

The model is moved, then turned about its origin, then scaled, as in
glTF, all in the space of its parent: the scene, or a group.

## Play the model's own animation

A glTF file may hold animations made with the model, such as a fish's
swim or a plant's sway. `animation` names one, as the file names it,
and `autoplay` plays it, repeating, from when the scene is shown:

```holoml-scene
<model src="models/kelp.glb" animation="Sway" autoplay />
```

Without `autoplay`, the model is shown in the first frame of that
animation, which poses it. A script can set how fast it plays (a model
thing's `animationSpeed`): the ocean tunnel's fish beat their tails
faster when they hurry to food.

## Group models to move them together

A `group` places several things as one: they move, turn, and scale with
it, and their own positions are in its space. The showroom's turntable
is a group of a plinth and a car, turned by an `animate`:

```holoml-scene
<group id="turntable">
  <model src="models/plinth.gltf" />
  <model src="models/veyl.glb" position="0 0.25 0" scale="1.8" />
</group>
<animate target="#turntable" attribute="rotation" from="0 0 0" to="0 360 0" duration="30s" repeat="indefinite" />
```

A turn from `0 0 0` to `0 360 0` ends as it starts, so, repeated, it
turns without a jump. A model turns about its origin; to turn it about
another point, put it in a group at that point, and move the model back
by as much. The sneaker store's
[shoe page](../../examples/sneaker-store/shoe.holoml) turns its shoe
over about its middle this way, and a door in a group at its hinge
swings open (see
[Make doors that open and lamps that switch on](doors-and-lamps.md)).

## Change a material

A model's materials are named in its file: the showroom's cars have
`Paint`, `Glass`, `Lights`, `Trim`, and `Wheels`. A `material` inside
the `model` changes the one it names, and only in what it gives:

```holoml-scene
<model src="models/quellis.glb" scale="1.8">
  <material name="Paint" color="#c8243a" metalness="0.5" roughness="0.45" />
  <material name="Glass" opacity="0.55" />
</model>
```

- `color`: the base colour, `#` and 3 or 6 hexadecimal digits. It
  multiplies the material's colour picture, if it has one: it tints the
  picture, and sets the colour exactly only on a plain material, such
  as the cars' `Paint`.
- `metalness`: from 0, not metal, to 1, metal.
- `roughness`: from 0, mirror-smooth, to 1, fully rough.
- `opacity`: from 0, invisible, to 1, solid.

A `material` changes its own model only, so one file can look different
in each place: Harbour Loft has one door file, and paints some of its
doors another colour. A name that matches no material changes nothing,
so a change that does not show is often a name spelt differently from
the file's; HyperSpace 3D's console says when a model has no material
of the name given.

## Find a material's name

A `.gltf` file is text: open it, and find its `"materials"` list, where
each material has a `"name"`. A `.glb` file holds the same text near
its start. This short Node.js script prints the names from either kind
of file, with the model's animations and the glTF extensions the file
needs:

```js
// names.mjs, run with Node: node names.mjs models/car.glb
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const bytes = readFileSync(file);
// A .glb file starts with 20 bytes of header, then its JSON, as many bytes long as the number at byte 12 says.
const json = file.endsWith('.glb') ? bytes.subarray(20, 20 + bytes.readUInt32LE(12)) : bytes;
const gltf = JSON.parse(json.toString('utf8'));
const list = (items) => items.join(', ') || 'none';
console.log('Materials:', list((gltf.materials ?? []).map((m) => m.name)));
console.log('Animations:', list((gltf.animations ?? []).map((a) => a.name)));
console.log('Extensions it needs:', list(gltf.extensionsRequired ?? []));
```

For the showroom's `models/quellis.glb` it prints
`Materials: Paint, Glass, Lights, Trim, Wheels`, and `none` for the
other two. Write each name in the page exactly as the file does. A
model made with one material for everything can only be changed as a
whole; to change one part alone, give that part a material of its own
in the file (see [Prepare glTF models for a page](preparing-models.md)).

## Put pictures on a material

In a 0.2 page, a `material` can also give pictures, PNG, JPEG, or WebP
files from the page's own site:

- `map`: a colour picture, such as a fabric's weave.
- `normal-map`: a picture of fine bumps (a normal map, as in glTF),
  which catch the light as an uneven surface would.
- `roughness-map`: a picture of how rough each point is (its green
  channel, as in glTF).
- `repeat`: how many times the pictures tile across the model's texture
  coordinates, the places on a picture that its surface is mapped to:
  one number, such as `"3"`, or two, one for each way, such as `"3 2"`.
  The default is `"1"`.

```holoml-scene
<model id="sofa" src="models/sofa.gltf">
  <material name="Fabric" map="textures/linen-color.jpg" normal-map="textures/linen-normal.jpg" roughness-map="textures/linen-rough.jpg" repeat="3" />
</model>
```

A picture given here takes the place of the model's own, and counts
toward the renderer's limits, as models do. To let the viewer choose
between fabrics in place, give each as an option of a `choice`, as the
sofa studio does (see [Offer sliders and choices](sliders-and-choices.md)).
A script can change a material's colour, metalness, roughness, and
opacity (a model thing's `material(name, change)`), and its pictures by
setting a choice's `value`.

## See also

- The specification: [`model`](../../SPEC.md#model),
  [`material`](../../SPEC.md#material), [`group`](../../SPEC.md#group),
  [`animate`](../../SPEC.md#animate),
  [space, units, and values](../../SPEC.md#6-space-units-and-values),
  and the scene API's [things](../../SPEC.md#things).
- [Prepare glTF models for a page](preparing-models.md),
  [Light a scene](lights-and-looks.md), and
  [Offer sliders and choices](sliders-and-choices.md).
- The showroom's [hall](../../examples/showroom/index.holoml) and the
  sofa studio's [page](../../examples/sofa-studio/index.holoml).
