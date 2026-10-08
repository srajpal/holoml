# Prepare glTF models for a page

This guide gets 3D models ready for a HoloML page: the file format, the
size and the direction a model faces, materials a page can change, few
enough triangles and small enough pictures, the glTF extensions that a
renderer may not read, and a lighter model to stand in for a detailed
one. The example sites' tools, in each site's `tools/` folder, show
each step.

## Save glTF 2.0, as .glb or .gltf

A model's file is glTF 2.0, the Khronos Group's open format for 3D
models: a `.glb` file (binary, with everything in one file), or a
`.gltf` file (text, which may keep its data and pictures in files
beside it). A `model`'s `src` names a file ending in one of the two.

A `.glb` file is one request for each model: Harbour Loft keeps each
model in one `.glb` file with its pictures inside, so its page loads 56
files; as `.gltf` files with their pictures beside them, it took 200.
A `.gltf` file is text that can be read and compared, which suits
models that a tool writes, such as the showroom's hall.

Keep the files with the page, in its folder or a folder inside it:
HyperSpace 3D, opening a page from the computer, lets it load files only
from there. Published, the files stay on the page's own site (see
[Publish a site](publishing.md)).

## Make it its real size, with y up

HoloML's space is glTF's: distances are in metres, y is up, and the
floor is y = 0. Make a model its real size in its file, so that it
needs no `scale`: the aquarium's tools scale each fish to its length in
metres, 3.2 for the great white shark and 0.11 for a clownfish. Put its
base at y = 0 in the file, so that a `position` of `x 0 z` stands it on
the floor: the sneaker store's shoe has its sole there.

A model turns about its origin, the point `0 0 0` in its file. Put the
origin where the model should turn: the aquarium's tools centre each
fish on its middle, and Harbour Loft's door has its origin at its
hinge, so that turning a group around it swings it open (see
[Group models to move them together](models-and-materials.md#group-models-to-move-them-together)).

## Face one way

Choose which way models face in their files, and keep to it, so that
the middle number of a `rotation` turns each one alike. The aquarium's
tools turn every fish so that its head faces +z, whichever way it faced
in the file it came from (`forward` in
[`fish.mjs`](../../examples/aquarium/tools/fish.mjs): +z for the shark,
-x for the mackerel), and its script then turns each fish toward where
it swims. The sneaker store's shoe points its toe along +x.

## Name the materials a page will change

A page changes a material by its name in the file: a `material`'s
`name`, and a `choice`'s `material`. Give each part that a page will
change a material of its own, with a plain name:

- The showroom's cars came with one material, which took every colour
  from a small palette picture. Its tools split it into `Paint`,
  `Glass`, `Lights`, `Trim`, and `Wheels`, by the part of the picture
  each triangle uses, so that a page can change the paint alone
  ([`prepare-cars.mjs`](../../examples/showroom/tools/prepare-cars.mjs)).
- The sofa studio's tools split the sofa's one material into `Fabric`
  and `Wood`, by the colour of its picture under each triangle
  ([`prepare.mjs`](../../examples/sofa-studio/tools/prepare.mjs)).

A page's `color` multiplies a material's colour picture, so a colour
that a page sets exactly needs a material with a plain colour and no
picture, as the showroom's `Paint` has. Pictures that a page gives
(`map`, `normal-map`, and `roughness-map`) need texture coordinates on
the model: the places on a picture that its surface is mapped to. The
script in
[Find a material's name](models-and-materials.md#find-a-materials-name)
lists a file's materials.

Materials come in glTF's own form, metal and roughness. HyperSpace 3D
also reads the material extensions that the specification lists (see
[Loading](../../SPEC.md#loading)); the older specular and glossiness
form (KHR_materials_pbrSpecularGlossiness) is not among them, and the
aquarium's tools turn such materials into metal and roughness ones.

## Keep triangles and pictures small

A model's surface is made of triangles, with its pictures drawn on
them. A renderer may limit how much one page uses: past a limit, it
leaves out what crossed it, shows the rest, and should tell the viewer
what was left out, and why, as HyperSpace 3D does. HyperSpace 3D allows
a page 64 model files (a file that many models use is loaded once),
32 MB for one model or sound file and 128 MB for all of them, pictures
up to 4096 by 4096 pixels, 2 million triangles in all, and 30 seconds
for a file to load ([HyperSpace 3D's limits](../reference/limits.md)).
Well inside those limits, a page loads sooner, and draws well on a
computer without a graphics card, where each triangle counts. For comparison, the
showroom's hall loads about 0.8 MB and draws about 13,000 triangles;
the sofa studio about 12 MB and 100,000; Harbour Loft about 19 MB and
250,000.

How the example sites stay light:

- One file, many copies: Harbour Loft's walls are one box, `wall.glb`,
  stretched to each piece of wall, and the ocean tunnel places one
  boulder file sixteen times.
- A triangle budget for each model: the aquarium's `fish.mjs` gives
  each fish at most so many triangles (12,000 for the shark, 4,000 for
  the mackerel), and
  [`shapes.mjs`](../../examples/aquarium/tools/shapes.mjs) makes a more
  detailed file lighter. It joins the vertices (the triangles' corners)
  that lie within a small cell of each other into one, and drops the
  triangles that vanish; it tries cells of different sizes, and keeps
  the most detailed result within the budget.
- Pictures no bigger than they are seen: the ocean tunnel's fish have
  pictures of at most 1,024 pixels a side (512 for small fish), and the
  sneaker store's shoe has 1,024 on its own page and 512 on the shelves.
- JPEG for pictures, saved again at a quality for the web, and PNG only
  where a picture has see-through parts (the aquarium's
  [`prepare.mjs`](../../examples/aquarium/tools/prepare.mjs)). The sofa
  studio's tools keep normal maps at a little higher quality, as their
  errors show as bumps.

## Compress a model, if the renderers you aim for read it

A glTF file may use extensions, additions to glTF, which it lists in
`extensionsUsed`, and may need some of them to be drawn at all, which
it lists in `extensionsRequired`. A renderer leaves out a model whose
file needs an extension that the renderer does not read. Some
extensions compress a file, so that a viewer downloads less and must
decode it: Draco and meshopt for the shape (KHR_draco_mesh_compression,
EXT_meshopt_compression, and KHR_meshopt_compression), and KTX2 for the
pictures (KHR_texture_basisu). HyperSpace 3D reads all four since its
milestone 25 (the specification's [Loading](../../SPEC.md#loading)
lists what it reads); another renderer may not, so check the ones you
aim for. The script in
[Find a material's name](models-and-materials.md#find-a-materials-name)
prints the extensions a file needs.

The [glTF Transform](https://gltf-transform.dev/) command line makes a
compressed copy (Node.js; `npx @gltf-transform/cli --help`):

```text
gltf-transform draco shoe.glb shoe-draco.glb
gltf-transform meshopt shoe.glb shoe-meshopt.glb
```

Compressing the shape makes the file smaller to download; what the
renderer draws is the same, and counts toward its limits the same, as
the triangles and pictures it decodes to.

## Make a lighter version for far away

A model's `far` (0.3) is a lighter version of it, drawn instead while
the viewer is `far-from` metres or more away. Make it as a stand-in is
made (below): from the same model, with the same origin, size, and
direction, and fewer triangles; and, for a model that plays one of its
own animations, with the same skeleton and the animation of the same
name, so that it moves the same far away. Glue it on with
[A lighter model far away](big-sites.md#show-a-lighter-model-far-away).

## Give a detailed model a lighter stand-in

A model's `stand-in` (0.2) is a lighter model, shown in its place until
the model has loaded, and again once the model is let go when the
viewer walks away from its group (loading by area: a group that loads
its models only while the viewer is near). The stand-in is placed,
turned, and sized as the model, so make it from the same model, with
the same origin, size, and direction, and with fewer triangles and a
smaller picture. The sneaker store's stand-ins have 2,445 of the shoe's
22,700 triangles, and a picture of 64 pixels:

```holoml-scene
<group load="near" near="7.5" position="-5 0 -4" rotation="0 90 0">
  <model src="models/shoe-midnight.glb" stand-in="models/shoe-midnight-far.glb" position="0 0.98 0.25" />
</group>
```

A stand-in loads with its page, and counts toward the limits like any
model. While it stands in, it is solid and casts shadows if the model
is marked so, and a click on it is a click on the model; but the
model's own `material` changes do not reach it, so give it the look it
needs in its file. Loading by area is in
[Build a big site that loads as the viewer walks](big-sites.md).

To try a model, open its page in HyperSpace 3D: press Ctrl+O, use its
menu, or drop the file on its window.

## Check each model's licence

A model someone else made comes under a licence, and the page that uses
it must keep to it. The example sites take only models that are CC0 (no
conditions) or CC BY 4.0 (credit the author), and none that is
"non-commercial", "no derivatives", or "share alike".

- Read the licence where the file itself carries it. A file downloaded
  from Sketchfab has its author, its licence, and its address in its own
  `asset.extras`; a list or a record kept elsewhere can say something
  else, and then the file is right. The aquarium's tools compare each
  file's stamp with the licence its credit gives, and stop when they
  differ
  ([`licence.mjs`](../../examples/aquarium/tools/licence.mjs)).
- For a file without a stamp, find where its source states the licence
  (a repository's README or LICENSE file), and write down what it says
  and where.
- Credit each model beside the models (the examples use
  `models/CREDITS.md`): its title, its author, where it came from, its
  licence with the licence's address, and what you changed.
- Fix the version you download (a commit, or a checksum of the file), so
  that a source that changes a file cannot change your site unnoticed.

## See also

- The specification: [files](../../SPEC.md#4-files),
  [`model`](../../SPEC.md#model), [loading](../../SPEC.md#loading),
  [limits](../../SPEC.md#limits), and
  [loading by area](../../SPEC.md#loading-by-area).
- [Show a model and change its materials](models-and-materials.md)
- [Build a big site that loads as the viewer walks](big-sites.md)
- The aquarium's tools:
  [`fish.mjs`](../../examples/aquarium/tools/fish.mjs),
  [`prepare.mjs`](../../examples/aquarium/tools/prepare.mjs), and
  [`shapes.mjs`](../../examples/aquarium/tools/shapes.mjs); and the
  sneaker store's
  [`prepare.mjs`](../../examples/sneaker-store/tools/prepare.mjs).
