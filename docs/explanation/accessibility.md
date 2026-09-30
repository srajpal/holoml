# Accessibility in 3D

This page explains how a HoloML page reaches people who use the
keyboard, screen readers, or reduced motion, what an author can do to
help, and what version 0.2 cannot yet say. The specification gathers
the rules in its accessibility considerations
([section 14](../../SPEC.md#14-accessibility-considerations)).

## A second way in

A 3D scene is a picture, drawn again many times a second. Someone who
cannot see it, or cannot drag and click in it with a mouse, needs
another way to the same things: the links, what can be clicked, the
places to go to, and the words. A HoloML renderer gives every page that
second way, made from the page's own markup: an outline, a list of the
page's links, named things, places, and click actions, which the
keyboard and screen readers reach. HyperSpace 3D also has a text view,
a text-only view of the whole page. Because a page says in markup what
it holds, the renderer can make these itself.

## The keyboard

Everything the mouse does, the keyboard can do. Walking and turning
work from the keys: in HyperSpace 3D, W and S or the up and down arrows
walk, A and D step to the side, the left and right arrows turn, Page Up
and Page Down look up and down, Shift runs, and Space jumps where the
page allows it.

Through the outline, the keyboard reaches the page's links, its click
actions (a door, a lamp), and its places, and it reaches the sliders and
choices on the screen as well. In HyperSpace 3D, Tab moves through them; Enter follows a
link, and Enter or Space presses a click action's button. A slider moves
with the arrow keys, Home, End, Page Up, and Page Down, and a choice
works as a group of radio buttons. On a page with a crosshair, a script
can act on what is in the middle of the view when a key is pressed, so
a game such as Blockworld can be played from the keyboard alone.

## Screen readers

Text in a page is read as text. The title, labels, panels, and what is
fixed to the screen (a `hud`'s words, sliders, and choices) reach
screen readers, Find in page, and the text view. In HyperSpace 3D,
Ctrl+Shift+V shows the text view, with no 3D at all. The outline names
what it lists: a click action by its `label`, such as "Bedroom door",
and a place by its `label`, such as "Kitchen". A floor plan is a
picture, which screen readers name by its `label`.

The renderer's own controls around the scene (its outline, its text
view, and what it fixes to the screen) are ordinary web content. The
Web Content Accessibility Guidelines (WCAG), the W3C's guidelines for
accessible web pages, apply to them as to any web page.

## Reduced motion

Some people ask their computer for less movement, a setting that web
pages see as `prefers-reduced-motion`. With it, a click action shows its
end at once, so a door is simply open; an animation that begins with
the page shows its end; a model's own animation holds at its first
frame; a fade between pages becomes a cut; the water's moving light
holds still; and scripts are told
(`holoml.reducedMotion`), so that they can keep still what would only
move for effect. With reduced motion, Blockworld's clock stands still,
and in the ocean tunnel the fish, the bubbles, and the light hold
still.

## Sound

Sound waits for the viewer's first click, tap, or key on the page. A
page should not depend on its sounds: people who cannot hear them, or
who have turned them off, still need to be able to use it.

## What authors can do

- Give ids and labels to what matters: a `label` on each click action
  ("Study door"), each place ("Kitchen"), and a floor plan ("Floor plan
  of the loft").
- Write words as text, in labels and panels, rather than as pictures:
  text reaches screen readers, Find in page, and the text view, and a
  picture of words does not.
- Put the things to use first. In HyperSpace 3D, Tab follows the order
  of the page: Harbour Loft puts its places, doors, lamps, and links
  before its walls and furniture, so that Tab reaches them first.
- Give the keyboard a way to whatever a script does on a click: a key,
  a crosshair with `holoml.aim()`, or a click action on the same thing,
  which the keyboard reaches as a button and whose click the script
  still hears.
- Keep still, with reduced motion, what moves only for effect, and keep
  the page usable without its sounds.

## What 0.2 lacks

HoloML 0.2 cannot yet say two things. A model or a group has no name
of its own for screen readers: they hear its id, or its file's name,
such as `boulder.glb`, so an id that reads well, such as `study-door`,
helps until then. And a page cannot say which language its text is in,
or that it runs right to left, as `lang` and `dir` do in HTML; a
renderer shows text with the fonts and writing directions of the
viewer's system. Both are planned for version 0.3.

## Read more

- The specification: [accessibility](../../SPEC.md#14-accessibility-considerations),
  [click actions](../../SPEC.md#click-actions),
  [places](../../SPEC.md#viewpoint), [`hud`](../../SPEC.md#hud),
  [`slider`](../../SPEC.md#slider), [`choice`](../../SPEC.md#choice),
  [`plan`](../../SPEC.md#plan), and
  [internationalization](../../SPEC.md#15-internationalization-considerations).
- How-to guides: [text](../how-to/text.md),
  [doors and lamps](../how-to/doors-and-lamps.md),
  [places and a floor plan](../how-to/places-and-plans.md), and
  [sliders and choices](../how-to/sliders-and-choices.md).
