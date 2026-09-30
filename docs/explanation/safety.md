# Safety

This page explains what a HoloML page can and cannot do on the viewer's
computer, and why. The exact rules are in the specification's security
considerations ([section 12](../../SPEC.md#12-security-considerations)),
with sound in section 7 and the limits in section 9.

## The aim

Opening a HoloML page should be no more of a risk than opening a web
page. Version 0.1 has no scripts: a page can only load glTF models and
link to other pages. Version 0.2 adds scripts, sounds, and pictures,
and with them the rules below, each of which keeps a page within what a
web page may do.

## Files from the page's own site

A page's own site is the origin of its address: its scheme, host, and
port, such as `https://example.com`. Scripts, sounds, and pictures (a
material's pictures, the surroundings' light, the sky, and a floor
plan) come from there and nowhere else. Models should come from there
too, or from sites the renderer permits.

Everything a page runs, plays, or shows then comes from the same place
as the page, so the site that serves the page answers for all of it. A
page cannot bring in code from a site the viewer never chose to visit,
or fetch sounds and pictures that would tell another site who is
looking. A renderer's protections for web pages, such as blocking
trackers, apply to HoloML pages as well.

A script's code is never written in the page: a `script` element names
a file, and holds nothing. The markup stays a description that a
checker can read in full.

A page opened from the computer has its folder for a site: HyperSpace
3D lets it load files only from its own folder and the folders inside
it. No page can read anything else from the viewer's computer.

## Scripts in the page's sandbox

A 0.2 page's scripts run as a web page's scripts do: in the page's own
sandbox, the walls a browser keeps around each page, with nothing more
than a web page may do. They get one object, `holoml`, for the scene;
the rest is ordinary web JavaScript, such as timers, and `fetch` from
the page's own site. A script that never stops cannot stop the renderer
itself: the viewer can still leave the page or close it.

What scripts learn is what happens in their own scene: where the viewer
is and which way they look, their clicks and keys on the page, sliders
and choices, whether they asked for reduced motion, and whether the
page's models have loaded. They learn nothing about the viewer's
computer, or about other pages, that a web page could not learn. HoloML
itself keeps nothing. A script may keep what a web page may, such as a
choice in the tab's session storage: Harbour Loft keeps its Light
choice there for the tour's other pages.

## Addresses and links

Every address in a page is relative to the page, or begins with `http:`
or `https:`. A `javascript:`, `data:`, or `file:` address is not
allowed, and a checker reports it as `unsafe-link`. A `javascript:` link
would run code written in the markup, a `data:` address would carry
content that comes from no site, and a `file:` address would reach into
the viewer's computer. A link to another site opens it as any web page
opens.

## Sound waits for the viewer

No sound plays before the viewer's first click, tap, or key on the page,
as web pages may not start sounds on their own either. A sound marked
`autoplay` starts then, and until then a script's `play()` does
nothing.

## Limits

A renderer's limits keep a heavy or hostile page from using up the
viewer's memory or freezing the renderer. A renderer chooses them, and
may count, for example, the page's text, its elements, the number and
size of its files, the size of its pictures, and its triangles. What a
script adds counts as the page's own does, and so do sound files, a
material's pictures, the surroundings, the sky, and a floor plan's
picture. What crosses a limit is left out, the rest of the scene is
shown, and the renderer should tell the viewer what was left out, and
why. [HyperSpace 3D's limits](../reference/limits.md) are one
renderer's.

## Read more

- The specification: [security](../../SPEC.md#12-security-considerations),
  [privacy](../../SPEC.md#13-privacy-considerations),
  [limits](../../SPEC.md#limits), [sound](../../SPEC.md#sound), and
  [the scene API](../../SPEC.md#10-scripts-and-the-scene-api).
- How-to: [publish a site](../how-to/publishing.md).
