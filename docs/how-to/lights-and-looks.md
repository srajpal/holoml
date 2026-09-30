# Light a scene: lights, shadows, pictures on materials, surroundings, and sky

This guide lights a scene: the four kinds of light, shadows, the light
of a panorama of the surroundings, a sky, evening made by dimming the
ambient lights, and lights and a background that change over time.
Everything after the first section needs a page that says
`version="0.2"`.

## Choose the lights

A `light` has a `type`, a `color` (white by default), and an
`intensity` (1 by default, and 0 or more). The four types:

| Type | How it shines | It also takes |
|---|---|---|
| `ambient` | Evenly on everything, from everywhere | |
| `directional` | From far away in one direction, like the sun: from `position` (by default `0 10 10`) toward `look-at` (by default `0 0 0`) | `position`, `look-at`, `shadows` |
| `point` | In every direction from `position` (by default `0 3 0`), like a bulb | `position`, `range`, `shadows` |
| `spot` | In a cone from `position` (by default `0 3 0`) toward `look-at`; `angle` is from the cone's centre to its edge, in degrees (30 by default) | `position`, `look-at`, `range`, `angle`, `shadows` |

`range` is how far a point or spot light reaches, in metres; 0, the
default, is no limit. The checker reports an attribute that a type does
not take, such as a `position` on an ambient light
(`attribute-not-for-type`).

Each example site's main page starts with an ambient light and a
directional one, the sun. The showroom's hall adds a spot over each
car, and Harbour Loft a point light for each lamp and ceiling light
(here the hall's, switched on):

```holoml-scene
<light type="ambient" intensity="0.3" />
<light type="directional" position="6 14 12" look-at="0 0 0" intensity="0.6" />
<light type="spot" position="-8.5 9 -3" look-at="-8.5 0 -3" angle="20" range="16" intensity="8" color="#fff4e0" />
<light type="point" position="0 2.1 -2.5" range="5" intensity="1.2" color="#ffd9a6" />
```

In a scene with no light at all, a renderer should still light it
softly, so that its models can be seen.

## Cast shadows

A light marked `shadows` (a directional, point, or spot light) casts
shadows from the models marked `shadows` onto the models marked
`shadows`: a marked model both casts and receives them. On a group, the
mark covers every model in it. The sofa studio's window and room:

```holoml-scene
<light type="directional" position="-3.4 3.3 1.6" look-at="0 0.3 -0.2" intensity="2" color="#fff3e2" shadows />
<group shadows>
  <model src="models/room.gltf" />
  <model src="models/rug.gltf" position="0 0 0.45" />
  <model src="models/sofa.gltf" position="0 0 -0.42" />
</group>
```

- Mark the floor as well, or the shadows have nothing to fall on.
- Leave glass unmarked to let the light through: Harbour Loft keeps its
  windows' glass out of its `shadows` groups, so that the sun comes in.
- A renderer chooses how soft and how detailed shadows are, and may
  leave them out, for example on a computer that draws in software
  (without a graphics card). HyperSpace 3D then says so in its console.
  A page means the same without its shadows.

## Light the scene from its surroundings, and draw a sky

The scene's `environment` is a panorama of the surroundings, a picture
of all the way round as seen from one point. It lights the scene: shiny
and soft materials alike take their light and reflections from it.
Without one, the renderer lights the scene softly with its own light.
The scene's `sky` is a panorama drawn behind everything, in place of the
background colour: the view out of the windows, or the sky over a
field. Each is an HDR, PNG, or JPEG file from the page's own site (an
HDR, or high dynamic range, picture keeps how bright its brightest
parts really are), and they may be the same file.

Harbour Loft draws a JPEG of its harbour through the windows, and
lights the rooms with an HDR panorama of the same place. The sofa
studio is lit by a photo studio's panorama, `light/studio.hdr`, and has
no sky.

```holoml
<holoml version="0.2">
  <scene background="#9fb4c4" sky="light/sky.jpg" environment="light/harbour.hdr">
    <viewpoint position="0 1.6 -2.9" look-at="0 1.45 3.75" mode="walk" />
    <light id="fill" type="ambient" intensity="1.7" />
    <light id="sun" type="directional" position="10.4 11.8 12.4" look-at="0 0 0" intensity="3.5" color="#fff1dc" shadows />
    <model src="models/floor.glb" shadows />
  </scene>
</holoml>
```

The surroundings and the sky count toward the renderer's limits, as
models and pictures do.

## Make it evening

The light from the surroundings (the `environment`, or the renderer's
own soft light) and the sky dim with the page's ambient lights. While
the ambient lights' intensities add up to 0.6 or more, they are at
full; below that, they are that much dimmer: at 0.3, half as bright.
Without ambient lights, they are at full. So a page makes evening or
night by dimming its ambient lights, with its sun and its background.

Harbour Loft's Light choice, a `choice` for the page's script, does
this in [`loft.js`](../../examples/harbour-loft/loft.js): by day its
fill, an ambient light, is at 1.7 and its sun at 3.5; in the evening the
fill is at 0.07 and the sun at 0, and the lamps are the viewer's to
switch on.

```holoml-scene
<light id="fill" type="ambient" intensity="1.7" />
<light id="sun" type="directional" position="10.4 11.8 12.4" look-at="0 0 0" intensity="3.5" shadows />
<choice id="time" corner="top-left" label="Light" value="day">
  <option value="day">Day</option>
  <option value="evening">Evening</option>
</choice>
```

```js
// The Light choice: by day the page's own light; in the evening a dim fill, no sun, and a dark background.
const time = holoml.find('time');
const fill = holoml.find('fill');
const sun = holoml.find('sun');
const day = { fill: fill.intensity, sun: sun.intensity, background: holoml.background };
holoml.on('change', (e) => {
  if (e.thing !== time) return;
  const evening = e.value === 'evening';
  fill.intensity = evening ? 0.07 : day.fill;
  sun.intensity = evening ? 0 : day.sun;
  holoml.background = evening ? '#141821' : day.background;
});
```

The sofa studio's evening also lights its table lamp, a spot light at 0
by day, and makes its text lighter, so that it can still be read.

## Change a light or the background over time

An `animate` can change a light's `intensity` (a number) or `color`,
the `position` of a light that has one, and the scene's `background`
(give the scene an `id`). The change is even over the `duration`, and
after the last run the value stays at `to`. A dusk of one minute, in
Blockworld's colours:

```holoml
<holoml version="0.2">
  <scene id="world" background="#87ceeb">
    <light id="daylight" type="ambient" intensity="0.55" />
    <light id="sun" type="directional" position="30 60 20" look-at="0 0 0" color="#fff4d6" />
    <animate target="#sun" attribute="intensity" from="1" to="0.1" duration="60s" />
    <animate target="#sun" attribute="color" to="#ff9a5c" duration="60s" />
    <animate target="#daylight" attribute="intensity" to="0.1" duration="60s" />
    <animate target="#world" attribute="background" to="#0b1030" duration="60s" />
  </scene>
</holoml>
```

An `animate` that begins on a click switches a lamp on and off with no
script (see
[Make doors that open and lamps that switch on](doors-and-lamps.md)).
A script can change the same values at any time, through a light's
`intensity` and `color` and through `holoml.background`: Blockworld
moves its sun and colours its sky every frame, through a day of four
minutes, and holds the time still when the viewer asks for reduced
motion (less movement on the screen, a setting of their system).

## Pictures on materials

Pictures on a material change how it takes the light: the fine bumps
of a normal map catch it, and a roughness map makes some parts shine
more than others. They are given with the material, in a 0.2 page: see
[Put pictures on a material](models-and-materials.md#put-pictures-on-a-material).

## See also

- The specification: [`light`](../../SPEC.md#light),
  [shadows](../../SPEC.md#shadows), [`scene`](../../SPEC.md#scene) (its
  `environment` and `sky`), and [`animate`](../../SPEC.md#animate).
- [Show a model and change its materials](models-and-materials.md), and
  [Make doors that open and lamps that switch on](doors-and-lamps.md).
- [Fill a tank or a pool with water](water.md): the water's moving
  light, which a renderer may also leave out.
- The sofa studio's [page](../../examples/sofa-studio/index.holoml),
  and Harbour Loft's [page](../../examples/harbour-loft/index.holoml)
  and [script](../../examples/harbour-loft/loft.js).
