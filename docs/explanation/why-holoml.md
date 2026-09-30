# Why HoloML

This page is about what HoloML is for, and why it is made as it is: it
looks like HTML, it is strict about mistakes, it leaves models to glTF,
and it is small.

## What it is for

The web has HTML for documents on a flat page. There are formats for
3D as well, such as glTF, USD, and X3D, but they describe models and
scenes for tools, not pages for people. HoloML sits between the two: a
small language for 3D web pages, which an author can write by hand,
which links to other pages, and which a browser can show without a game
engine.

A HoloML page describes a scene: 3D models, where the viewer starts,
lights, text, links, sound, and animation. A browser that knows HoloML,
such as HyperSpace 3D, shows it as a space to orbit or walk around, and
a link in it opens the next page, as on the web. The example sites show
the range: a showroom of cars, a block game, a shop page where a sofa
changes its fabric in place, a flat to tour, a sneaker store, and an
aquarium to walk through.

## Why it looks like HTML

A HoloML page is written as a web page is: elements, attributes, and
text; a `head` with a `title`; comments; links written `<a href="…">`;
and addresses relative to the page. Anyone who has written HTML can read
one. It is plain text, so it can be written in any editor, read by
anyone who opens the file, and kept in version control. The elements
name what is in the scene (`model`, `light`, `label`), not how to draw
it, and the numbers are in everyday units: metres, degrees, and
seconds.

## Why it is strict

A web browser does its best with a broken HTML page, and guesses what
was meant. A HoloML reader does not guess. It stops at the first
mistake in the syntax, such as a name in capitals, a value without
quotes, or an element that is never closed, and reports it with its
line and column:

```text
<holoml version="0.2">
  <scene>
    <model src="models/coupe.glb">
  </scene>
</holoml>
```

Here the `model` is never closed. A reader stops at line 4, column 3,
where it expected `</model>` and found `</scene>`, and reports the
error `mismatched-end-tag`. There are three reasons for this:

- The author finds a mistake at once, where it is, rather than later,
  as a scene that looks wrong in one browser and right in another.
- Every reader reads a page the same way. The conformance samples,
  pages with the results that any reader must give, pin down the one
  tree of each correct page and the one error of each broken page, so
  a second renderer cannot guess differently from the first.
- The rules stay short enough to read: the syntax fits in one section
  of the specification, with a formal grammar beside it.

Strict syntax does not mean that one problem hides a page. Past the
syntax, a checker reports every problem it finds, such as an unknown
element or a value out of range, each with its place, and a renderer
shows the rest of the scene as well as it can. A model file that cannot
be loaded is left out, and the rest is shown.

## Why glTF

HoloML does not describe shapes. A `model` names a glTF file, and the
page puts the model in place, turns it, sizes it, and changes its
materials. glTF 2.0 is the Khronos Group's open file format for 3D
models, made for sending them to where they are shown: one file holds
a model's shapes, materials, pictures, and animations, or names the
files that do.

- It is an open standard, so HoloML needs no model format of its own,
  and pages can use models that tools and collections already make.
  The example sites' come from Poly Haven, Kenney's kits, and the
  Khronos Group's sample models, among others.
- HoloML's space is glTF's: metres, with y up and right-handed axes. A
  model arrives the right way up and at the size it was made.
- A page can reach inside a model: `material` changes a material by its
  name in the file, and `animation` plays one of the model's own.
- The heavy data stays in files that the browser loads, so the page
  stays short enough to read: a model is one line.

## Why it is small

HoloML 0.1 has 13 elements, and 0.2 has 22. Each does one thing, and
they combine: a door that opens is a `group` at its hinge and an
`animate` that begins on a click, and a lamp is a `light` and a click
action. What markup cannot say, a script can: a 0.2 page runs ordinary
web JavaScript, with one object, `holoml`, for its scene, rather than
gaining an element for each new need.

A small language is quick to learn and to write by hand, and easier to
build readers for, in full and alike. Every element and attribute in the
specification appears in at least one conformance sample, and HoloML's
own parser needs no other package. New things come when a real page
needs them: version 0.2 grew with HyperSpace 3D's example sites, each
adding what it needed. Ideas such as physics, and spaces shared by
several people, wait for later versions.

## Read more

The specification's [files](../../SPEC.md#4-files),
[syntax](../../SPEC.md#5-syntax), [checking](../../SPEC.md#8-checking),
and [versions](../../SPEC.md#11-versions); and
[How a browser shows a page](how-a-page-is-shown.md) and
[Versions](versions.md).
