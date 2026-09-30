# Your first HoloML page

In this lesson you make a small site of two HoloML pages and open it in
HyperSpace 3D. The first page shows a car that you walk around, with
light, a label, and a link to the second page, which shows another car.
Each step adds one thing, and you open the page after it to see what
changed.

## Make the folder

You need [HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d),
the browser that shows HoloML pages, and a text editor that saves plain
text as UTF-8. You also need two cars from the `models` folder of
HoloML's [showroom](../../examples/showroom/README.md) example:
`pippet.glb`, `quellis.glb`, and `colormap.png`, the picture that gives
both their colours. They are from Kenney's Car Kit, free for any use
(CC0), and they are glTF files: glTF is the Khronos Group's open file
format for 3D models.

Make a folder named `my-first-site`, with a folder named `models` in
it, and copy the three files into `models`:

```text
my-first-site/
  models/
    colormap.png
    pippet.glb
    quellis.glb
```

## Step 1: a page with a model

In `my-first-site`, make a file named `index.holoml` with this text:

```holoml
<holoml version="0.2">
  <head>
    <title>The Pippet</title>
  </head>
  <scene>
    <model src="models/pippet.glb" />
  </scene>
</holoml>
```

A page is one `holoml` element. Its `version` says which version of
HoloML the page is written for. It holds a `head`, with facts about the
page such as its `title`, and a `scene`, which holds everything that is
shown. A `model` shows the model in a glTF file; its `src` is an
address relative to the page, as in HTML.

Open the page: in HyperSpace 3D, press Ctrl+O and choose
`index.holoml`, or drop the file on its window. The tab says "The
Pippet", and the car stands in front of you. The page has no light of
its own yet, so HyperSpace 3D lights it softly. Without a `viewpoint`,
you start 5 metres in front of the middle of the floor and orbit: drag
to go round the car, and scroll to come closer or move away.

HoloML is strict. If the page has a mistake in its syntax, such as a
tag that is never closed or a name in capitals, HyperSpace 3D shows the
mistake, with its line and column, instead of the scene. Put it right,
save the file, and open the page again.

## Step 2: walk around the car

At the start of the `scene`, add a `viewpoint`, and give the model the
flag `solid`:

```holoml-scene
<viewpoint position="3 1.6 6" look-at="0 0.5 0" mode="walk" />
<model src="models/pippet.glb" solid />
```

The viewpoint says where you start. `position` is where your eyes are,
in metres: x to the right, y up, and z toward you, with the floor at
y = 0. `look-at` is the point you look at, and `mode="walk"` lets you
walk instead of circling. A flag is an attribute written alone, with no
value: `solid` means that you cannot walk through the car.

Open the page again. You stand a few metres in front of the car and to
one side, with your eyes 1.6 metres above the floor. Walk with the
arrow keys or W, A, S, D, and drag to look around. Walk round the car:
when you walk into it, it stops you.

## Step 3: light

Add two lights to the scene:

```holoml-scene
<light type="ambient" intensity="0.3" />
<light type="directional" position="4 8 5" intensity="1.5" />
```

An `ambient` light lights everything a little, evenly, from everywhere.
A `directional` light comes from far away in one direction, like the
sun: from its `position` toward the middle of the floor, where the car
stands. `intensity` is how bright each one is.

Open the page again. The page lights the car itself now, from above and
in front, so the top and the front are bright. Walk round to the back:
it is turned away from the light, and darker.

## Step 4: a label

Add a `label` to the scene:

```holoml-scene
<label position="0 1.5 0">The Pippet: walk around it</label>
```

A label is text in the scene, centred on its `position`. Open the page
again: the words float over the car's roof, and turn to face you as you
walk round it.

## Step 5: a second page, and links

Make a second page, `quellis.holoml`, in the same folder:

```holoml
<holoml version="0.2">
  <head>
    <title>The Quellis</title>
  </head>
  <scene>
    <viewpoint position="-3 1.6 6" look-at="0 0.5 0" mode="walk" />
    <light type="ambient" intensity="0.3" />
    <light type="directional" position="4 8 5" intensity="1.5" />
    <model src="models/quellis.glb" solid />
    <label position="0 1.5 0">The Quellis</label>
    <a href="index.holoml">
      <label position="-2 1.2 0" size="0.15" color="#7fd8ff">Back to the Pippet</label>
    </a>
  </scene>
</holoml>
```

It is made like the first page, with the other car and one new thing:
the `a` element, a link, as in HTML. Everything inside it opens the
page its `href` names when you click it, or when you reach it with the
keyboard and press Enter. Here it holds a smaller label (`size` is the
height of a line of text, in metres) in light blue (`color`).

Then, in `index.holoml`, add a link to the second page after the label:

```holoml-scene
<a href="quellis.holoml">
  <label position="2 1.2 0" size="0.15" color="#7fd8ff">Next: the Quellis</label>
</a>
```

Open `index.holoml` again, and click "Next: the Quellis". The second
page opens, with the Quellis, its name, and a link beside it; click
"Back to the Pippet" to come back. You have a site of two pages.

## The first page, whole

```holoml
<holoml version="0.2">
  <head>
    <title>The Pippet</title>
  </head>
  <scene>
    <viewpoint position="3 1.6 6" look-at="0 0.5 0" mode="walk" />
    <light type="ambient" intensity="0.3" />
    <light type="directional" position="4 8 5" intensity="1.5" />
    <model src="models/pippet.glb" solid />
    <label position="0 1.5 0">The Pippet: walk around it</label>
    <a href="quellis.holoml">
      <label position="2 1.2 0" size="0.15" color="#7fd8ff">Next: the Quellis</label>
    </a>
  </scene>
</holoml>
```

## What next

- [Your first script](first-script.md): a page that answers a click,
  with a lamp, a sound, and words on the screen.
- How-to guides: [models and materials](../how-to/models-and-materials.md),
  such as a new colour of paint; [walking](../how-to/walking.md);
  [lights and looks](../how-to/lights-and-looks.md);
  [text](../how-to/text.md); and [publishing a site](../how-to/publishing.md).
- The [showroom](../../examples/showroom/index.holoml) is this site
  grown larger: five cars in a hall, each on a page of its own.
- The specification: what each element holds and means
  ([section 7](../../SPEC.md#7-elements)), and how space and values are
  written ([section 6](../../SPEC.md#6-space-units-and-values)).
