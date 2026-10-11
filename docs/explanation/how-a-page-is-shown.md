# How a browser shows a page

This page follows a HoloML page from its text to the scene the viewer
walks through, and on to the next page. The specification's processing
model ([section 9](../../SPEC.md#9-processing-model)) gives the exact
rules; this is the story behind them.

## Finding a HoloML page

First the browser has to know that a file is HoloML. HyperSpace 3D
shows a page whose address ends in `.holoml`, or which a web server
sends with the media type `model/vnd.holoml`, the name of the kind of
file. It also opens a `.holoml` file from the computer, with Ctrl+O or
when the file is dropped on its window.

## Reading

The reader decodes the text as UTF-8 and reads it by the syntax rules
into a tree: elements, their attributes, and their text, each with the
line and column where it starts. At the first syntax error it stops, and
reports the error's code and place. It does not guess and carry on, so a
page with a syntax error shows no scene: HyperSpace 3D shows the mistake
and where it is instead.

## Checking

Next the tree is checked against the version the page declares, and
against the rules for each element: where it may stand, which
attributes it takes, and what values they may have. A version the
reader does not know is refused: a checker reports it, and a renderer
does not draw the page. Each problem is reported with its
place, but a problem does not stop the page as a syntax error does: the
renderer shows the scene as well as it can, and leaves out what it
cannot show.

## Building the scene

The renderer builds the scene in document order. Each element with a
place is put in its parent's space: moved, then turned, then scaled, as
in glTF, so that a model in a group moves with the group. `material`
elements change their models, and the renderer sets up the animations,
the click actions, the places to go to, and what is fixed to the
screen. Only then does it run a 0.2 page's scripts, in document order,
so that a script finds the scene already built.

## Loading

As the scene is built, its files load: models and their pictures, and
in 0.2 the sounds, a material's pictures, the surroundings' light, the
sky, and the floor plan. Scripts, sounds, and pictures come only from the page's own site
(see [Safety](safety.md)).

A file that cannot be loaded is left out, and the rest of the scene is
shown; a renderer should mark where a missing model would have been. So
is a model whose glTF file needs an extension the renderer does not
read. HyperSpace 3D reads compressed geometry and pictures (Draco,
meshopt, and KTX2) since its milestone 25; another renderer may not.
The page is ready (for its
scripts, `holoml.ready`) when every file it loads with the page (its
models, sounds, and pictures) has loaded or been left out.

A 0.2 page can also load by area: a `group` with `load="near"` loads
its models only while the viewer is near it, and lets them go when the
viewer walks away. A lighter model, its `stand-in`, shows in a model's
place until the model has loaded, so that a large site loads at first
only what is near the viewer.

## Limits

A renderer may limit what one page can use, so that a heavy or hostile
page cannot use up the viewer's memory or freeze the renderer. At a
limit, it shows as much of the scene as it can, leaves out what crossed
the limit, and tells the viewer what was left out and why. The limits
are the renderer's, not the language's: a valid page stays valid
whatever they are.

HyperSpace 3D allows one page 2 MB of text, 10,000 elements, 64 model
files, 32 MB for one model or sound file and 128 MB for all of them,
pictures up to 4096 by 4096 pixels, 2 million triangles in all, and 30
seconds for a file to load ([its limits](../reference/limits.md)).
Elements that a script adds count toward the same limits, and a group
that loads by area counts only while its models are loaded.

## Drawing

The renderer draws the scene from the viewer's eyes, with the page's
lights, materials, and animations, and in 0.2 its shadows, water, and
sky. It need not draw while nothing in the scene changes, so a still
scene costs the computer little. While a script listens for frames, it
keeps drawing, except while the page cannot be seen, such as when its
tab is behind another. A renderer may leave out shadows and the water's
moving light when it has to, for example on a computer that draws in
software, and should then say so where the author can see it. A page
means the same without them.

## Interacting

The viewer moves as the starting viewpoint says: orbiting a point, or
walking, in 0.2 with walls and gravity. A click or a tap follows a link,
or runs a click action, such as a door that swings open, and a 0.2
page's scripts hear clicks and keys. The renderer's outline, its list
of the page's links, named things, places, and click actions, gives the
same to the keyboard and to screen readers
([Accessibility in 3D](accessibility.md)).

## Going to other pages

Following a link opens its address: another HoloML page, or any web
page. Between HoloML pages of the same site, a renderer should move the
viewer as between rooms, with a short fade out and in, and a cut when
the viewer asked for reduced motion. A link can name a place on the page
it opens, as in `terrace.holoml#door`, and the viewer arrives there.
The page's scripts end with the page, and the next page starts again
from its own text.

## Read more

- The specification: [the processing model](../../SPEC.md#9-processing-model),
  [the syntax](../../SPEC.md#5-syntax), [checking](../../SPEC.md#8-checking),
  [loading by area](../../SPEC.md#loading-by-area), and
  [the scene API](../../SPEC.md#10-scripts-and-the-scene-api).
- How-to guides: [preparing glTF models](../how-to/preparing-models.md),
  and [a big site that loads as the viewer walks](../how-to/big-sites.md).
