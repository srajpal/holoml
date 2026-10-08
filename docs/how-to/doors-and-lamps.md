# Make doors that open and lamps that switch on

This guide makes things work with a click (0.2): a door that swings
open and shut, and a lamp that a switch turns on and off, each with its
sound. They are click actions, written in the markup, with no script.
[Harbour Loft](../../examples/harbour-loft/index.holoml) has three doors
and seven lights built this way.

## How a click action works

An `animate` or a `sound` with `begin="click"` is a click action: it
runs each time the viewer clicks its trigger, the thing that its
`trigger` attribute names.

- `begin="click"`: run on each click, instead of when the scene is
  shown.
- `trigger`: the thing to click, by its id: a `model`, `group`, `label`,
  or `panel`. An `animate` of a model or a group may leave it out, and
  its target is then the trigger. A light cannot be clicked, so an
  animation of a light names a trigger, and so does every sound.
- `toggle` (on an `animate`): one click runs it forward and the next
  back, from wherever it is, so that a door opens and shuts. Without it,
  each click runs it again from `from`.
- `label`: its name for the keyboard and screen readers (below).

A click on something a trigger holds, such as a model in a group, is a
click on the trigger; where one trigger holds another, the innermost
runs.

## Hang a door on a hinge

An animation turns a thing about its own position, and a door turns
about its hinge. So put the door in a group that stands at the hinge,
and turn the group:

```holoml-scene
<group id="bedroom-hinge" position="1 0 0">
  <model id="bedroom-door" src="models/door.glb" position="0.45 0 0" solid />
</group>
<animate target="#bedroom-hinge" attribute="rotation" to="0 90 0" duration="0.8s" begin="click" trigger="#bedroom-door" toggle label="Bedroom door" />
<sound src="sounds/door.ogg" begin="click" trigger="#bedroom-door" />
```

- The door here is 0.9 m wide with its origin at its middle, so it sits
  0.45 m along from the hinge. Harbour Loft's door model has its origin
  at its edge already, and needs no `position` in its group
  ([preparing models](preparing-models.md#make-it-its-real-size-with-y-up)).
- The door is the trigger, and the group turns. With no `from`, the
  swing starts from the group's own rotation; `to` is how it stands when
  open. Harbour Loft's study door starts turned to fit its wall
  (`rotation="0 -90 0"` on its hinge) and opens to `"0 -180 0"`.
- `solid`: shut, the door stops the walker
  ([walking](walking.md)).
- The sound has the same trigger, so the latch sounds with each click,
  opening and shutting. No sound plays before the viewer's first click,
  tap, or key on the page ([sound](sound.md)).

## Switch a lamp on

Give the light `intensity="0"`, so that it starts off, and let a switch
turn it up:

```holoml-scene
<light id="hall-light" type="point" position="0 2.1 -2.5" range="5" intensity="0" color="#ffd9a6" />
<group position="0 1.827 -2.5">
  <model src="models/pendant.glb" />
  <model id="hall-glow" src="models/glow.glb" position="0 0.42 0" scale="0.001" />
</group>
<model id="hall-switch" src="models/switch.glb" position="-0.8 1.1 -3.75" />
<animate target="#hall-light" attribute="intensity" from="0" to="1.2" duration="0.2s" begin="click" trigger="#hall-switch" toggle label="Hall light" />
<animate target="#hall-glow" attribute="scale" from="0.001 0.001 0.001" to="1 1 1" duration="0.2s" begin="click" trigger="#hall-switch" toggle />
<sound src="sounds/switch.wav" begin="click" trigger="#hall-switch" volume="0.6" />
```

One trigger may start several actions at once. Harbour Loft's switch
turns up the light, grows its bulb's glow from almost nothing (a scale
of 0.001) to its size, and clicks.

To make the lamp itself the switch, put its models in a group with an
id, and make the group the trigger: a click on any model in it is a
click on the group. Harbour Loft's reading lamp:

```holoml-scene
<light id="living-light" type="point" position="0.55 1.15 3.05" range="4" intensity="0" color="#ffd9a6" />
<group id="living-lamp" position="0.55 0.761 3.22" rotation="0 180 0">
  <model src="models/pipe-lamp.glb" />
  <model id="living-glow" src="models/glow.glb" position="0 0.3 0.062" scale="0.001" />
</group>
<animate target="#living-light" attribute="intensity" from="0" to="1" duration="0.2s" begin="click" trigger="#living-lamp" toggle label="Living room lamp" />
<animate target="#living-glow" attribute="scale" from="0.001 0.001 0.001" to="0.7 0.7 0.7" duration="0.2s" begin="click" trigger="#living-lamp" toggle />
```

## Reach every trigger from the keyboard

A renderer makes each trigger's actions a control in its outline, the
list of a page's links, places, and named things that the keyboard and
screen readers reach, named by its actions' `label`. In HyperSpace 3D
each is a button that Tab reaches and Enter or Space presses, as a
click would.

- Give one action of each trigger a `label` that says what it is, such
  as "Bedroom door" or "Hall light"; without one, the control is named
  by the trigger's id. Harbour Loft puts it on each trigger's first
  action.
- Harbour Loft writes its doors, lamps, and links before its walls and
  furniture, so that Tab reaches them first.

A sound alone makes a button as well, named by the sound's `label`,
and scripts still hear the click. The sneaker store's "Add to cart" is
a panel whose click plays a chime; its script hears the click, from the
mouse or the keyboard, and adds the shoe to the cart
([sound on a click](sound.md#play-a-sound-on-a-click)).

## Start and stop an animation from a script

In a 0.3 page, an `animate` with an `id` is a thing a script starts
and stops:

```holoml-scene
<model id="fan" src="models/fan.glb" position="0 2.6 0" />
<animate id="spin" target="#fan" attribute="rotation" to="0 360 0" duration="2s" repeat="indefinite" />
```

```js
const spin = holoml.find('spin');
holoml.on('key', (e) => {
  if (e.down && e.key === 'f') (spin.running ? spin.stop() : spin.start());
});
```

`start()` runs it from its beginning, as when it begins by itself;
`stop()` leaves it where it is. A click action still runs on its
clicks, also after a script stopped it.

## Reduced motion

When the viewer has asked for reduced motion (their system's setting
for less movement on screen), the renderer shows an action's end at
once: the door stands open, or the lamp is lit, with no swing or fade.
The page needs nothing more for it.

## Try it

- Click each door and switch, and click again.
- Tab through the page, and press Enter or Space on each control.
- Turn on your system's setting for less motion, and click again.

The checker reports the usual slips: `trigger`, `toggle`, or `label`
without `begin="click"`, a sound on a click with no `trigger`, a
trigger that cannot be clicked, such as a light, and a `toggle` with a
`repeat` other than 1.

## See also

- The specification: [click actions](../../SPEC.md#click-actions),
  [`animate`](../../SPEC.md#animate), [`sound`](../../SPEC.md#sound),
  [`group`](../../SPEC.md#group), and
  [accessibility](../../SPEC.md#14-accessibility-considerations).
- [Add sound, and sound from a place](sound.md)
- [Walk around, with walls and gravity](walking.md)
- [Light a scene](lights-and-looks.md)
- [Give a page places to go to, and a floor plan](places-and-plans.md)
- Harbour Loft's [page](../../examples/harbour-loft/index.holoml) and
  [notes](../../examples/harbour-loft/README.md).
