# HyperSpace 3D's limits

A renderer may limit what one page can use, so that a heavy or hostile
page cannot use up the viewer's memory or freeze the renderer
([section 9, "Limits"](../../SPEC.md#limits) of the specification). The
limits are each renderer's own choice, not part of the language: a valid
page stays valid whatever they are. These are the limits of HyperSol
HyperSpace 3D, the first renderer, for one page.

| What | Limit |
|---|---|
| The page's own text | 2 MB |
| Elements | 10,000 |
| Model files | 64 different files; a file that many models use is loaded once |
| One file: a model, a file a model names, a sound, or a picture | 32 MB |
| All the page's model, sound, and picture files together | 128 MB |
| A picture's width and height | 4096 pixels each |
| All the page's pictures together, once decoded | 134,217,728 pixels (eight pictures of 4096 by 4096) |
| All the page's sounds together, once decoded | 600 seconds |
| Triangles, in all the page's models | 2 million, each model counted as it is drawn, once it is decoded |
| Lights that shine from a place or a direction, those in model files included | 32; later ones are left out |
| Lights that cast shadows | 4; later ones shine without shadows |
| A place, a size, or a scale | within 1,000,000; beyond it the default is used |
| One file's loading (a model with the files it names, or a sound) | 30 seconds |
| A text that a script sets (a label's, a panel's, or one on the screen) | 10,000 characters |

## What happens at a limit

- A page whose text is larger than 2 MB is not read at all. HyperSpace
  3D shows a card that says how large it is.
- Elements after the 10,000th are left out.
- A model, sound, or picture that would cross a limit is left out, and
  the rest of the scene is shown. A notice on the page says how many
  things were left out, and what and why for each. The Scene section of
  the instrument panel lists them too, at their places in the page's
  text.
- (0.2) The limits count only what is loaded now. When a group that
  loads by area lets its models go, their bytes and triangles stop
  counting, and a model in such a group that had to wait for room can
  load ([Build a big site that loads as the viewer walks](../how-to/big-sites.md)).
- (0.2) Of a text that a script sets, the first 10,000 characters are
  kept ([section 10, "Things"](../../SPEC.md#things)).
- (0.2) What a script adds with `holoml.add` counts as well. What would
  cross a limit is left out, and the console says why
  ([section 10, "Limits for scripts"](../../SPEC.md#limits-for-scripts)).

## Without a graphics card

Where Chromium draws in software (a computer without a graphics card, a
virtual machine, some remote desktops), HyperSpace 3D draws a scene with
half as many pixels each way and without smoothed edges, and leaves out
shadows and the water's moving light, so that the scene still moves. The
console says so once.

## Staying within them

- Keep each model's triangles and pictures to what the viewer can see:
  [Prepare glTF models for a page](../how-to/preparing-models.md).
- Use one file for things that look the same. The file loads once,
  however many models use it, though each model counts its own
  triangles.
- Split a large site into groups that load as the viewer comes near,
  with light stand-ins in their place until then.
- Open the page in HyperSpace 3D and look at the instrument panel's
  Scene section, which gives the page's bytes and triangles as they
  stand.
