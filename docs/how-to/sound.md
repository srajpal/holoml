# Add sound, and sound from a place

This guide adds sound to a page: sounds that play by themselves, sounds
that come from a place and grow quieter with distance, sounds that a
script plays, and a sound that a click plays without a script. Sound is
new in HoloML 0.2, so the page says `version="0.2"`.

## Add a sound

A `sound` stands in the scene or in a group. `src` is an Ogg (`.ogg`),
MP3 (`.mp3`), or WAV (`.wav`) file from the page's own site.
Blockworld's birdsong, and the sound of a block breaking:

```holoml-scene
<sound id="birds" src="sounds/birds.wav" loop autoplay volume="0.45" />
<sound id="break" src="sounds/break.ogg" volume="0.7" />
```

- `loop`: start again at the end, until stopped.
- `autoplay`: play as soon as sounds may play (below).
- `volume`: how loud, from 0, silent, to 1, full (the default).
- `id`: a name for scripts. A sound without `autoplay`, such as the
  breaking block, plays only when a script or a click plays it.

## Sound waits for the viewer

No sound plays before the viewer's first click, tap, or key on the
page: web pages may not start sounds on their own, and neither may
HoloML pages. `autoplay` sounds start then, and until then a script's
`play()` does nothing. So make the page work without its sounds, and
put what matters in words as well: when a gem is found, Blockworld
plays a sound and says so in the corner of the screen.

## Make a sound come from a place

A sound with a `position` comes from that place. It plays at its
`volume` within 1 metre of the viewer, grows quieter evenly as the
viewer moves away, and is silent from `range` metres on (20 by
default); and it comes from the viewer's left or right, as the place
is. The ocean tunnel's air stones bubble this way, each sound at its
stone, while the rush of the water, with no `position`, sounds the same
everywhere:

```holoml-scene
<model src="models/airstone.glb" position="-4.2 0.05 3.5" />
<sound id="bubbler-1" src="sounds/bubbles.wav" position="-4.2 0.35 3.5" range="9" volume="0.8" loop autoplay />
<sound id="water" src="sounds/water.wav" volume="0.3" loop autoplay />
```

- A `range` needs a `position`; the checker reports one without it.
- The position is in the parent's space, so a sound in a group moves
  with the group.
- A script can give a sound a place, or move it, through the sound's
  `position` (`null` for none).

## Play sounds from a script

A script finds a sound by its `id`, and then:

- `play()` plays it from the start, `stop()` stops it, and `playing`
  says whether it is playing;
- `volume` can be set at any time, also while it plays.

Blockworld plays a short sound as each thing happens, and, as night
falls, turns its birds down and its crickets up: both loop from the
start, the crickets at volume 0. In this page, the B key rings a bell,
and the Light choice swaps the birds for the crickets:

```holoml
<holoml version="0.2">
  <head>
    <title>Evening sounds</title>
    <script src="sounds.js" />
  </head>
  <scene>
    <model src="models/garden.glb" />
    <sound id="bell" src="sounds/bell.ogg" />
    <sound id="birds" src="sounds/birds.ogg" loop autoplay volume="0.45" />
    <sound id="crickets" src="sounds/crickets.ogg" loop autoplay volume="0" />
    <choice id="time" corner="top-left" label="Light" value="day">
      <option value="day">Day</option>
      <option value="evening">Evening</option>
    </choice>
  </scene>
</holoml>
```

```js
// sounds.js: B rings the bell; the birds sing by day, and the crickets in the evening.
const bell = holoml.find('bell');
const birds = holoml.find('birds');
const crickets = holoml.find('crickets');
const time = holoml.find('time');

holoml.on('key', (e) => {
  if (e.down && !e.repeat && e.key.toLowerCase() === 'b') bell.play();
});
holoml.on('change', (e) => {
  if (e.thing !== time) return;
  const day = e.value === 'day';
  birds.volume = day ? 0.45 : 0;
  crickets.volume = day ? 0 : 0.35;
});
```

## Play a sound on a click

A sound with `begin="click"` plays each time the viewer clicks its
`trigger`: a `model`, `group`, `label`, or `panel`, named by its id. It
needs no script, and has no `autoplay`. The trigger becomes a control
that the keyboard and screen readers reach, named by the sound's
`label`. The ocean tunnel's Feed button is a panel:

```holoml-scene
<panel id="feed" position="1.74 1.2 0.2" rotation="0 -90 0" width="0.6" size="0.07" color="#ffffff" background="#1d6fa5">Feed the fish</panel>
<sound id="plop" src="sounds/plop.wav" begin="click" trigger="#feed" label="Feed the fish" />
```

One click can start several actions: Harbour Loft's doors swing open
(an `animate`) and sound their latch (a `sound`) on the same trigger
(see [Make doors that open and lamps that switch on](doors-and-lamps.md)).
Scripts still hear the click: the ocean tunnel's script drops the food
when the Feed button is clicked.

## Keep sound files small

Sound files count toward the renderer's limits: in HyperSpace 3D, 32 MB
for one model or sound file, and 128 MB for all of them (see
[Limits](../../SPEC.md#limits)). The page is ready (`holoml.ready`) only
when every model and sound it loads has loaded or been left out, so a
large sound delays it. Ogg and MP3 files are compressed, and smaller
than a WAV file of the same sound.

## See also

- The specification: [`sound`](../../SPEC.md#sound),
  [click actions](../../SPEC.md#click-actions), the scene API's
  [things](../../SPEC.md#things) and [events](../../SPEC.md#events), and
  [accessibility](../../SPEC.md#14-accessibility-considerations).
- [Make doors that open and lamps that switch on](doors-and-lamps.md)
- [Put text in the scene and on the screen](text.md): words for what a
  sound says.
- [Offer sliders and choices](sliders-and-choices.md)
- Blockworld's [page](../../examples/blockworld/index.holoml) and
  [script](../../examples/blockworld/game.js), and the ocean tunnel's
  [page](../../examples/aquarium/index.holoml).
