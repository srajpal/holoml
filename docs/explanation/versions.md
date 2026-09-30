# Versions

This page explains HoloML's versions: what 0.1 and 0.2 hold, how a page
says which one it is written for, why a reader refuses a version it does
not know, what the editions of 0.2 changed, and what 0.3 plans.
The rules are in the specification's
[section 11](../../SPEC.md#11-versions).

## Two versions, both fixed

HoloML 0.1, of 2026-09-26, is the first: models, groups, lights,
labels, links, materials, the animation of position, rotation, and
scale, and orbiting and walking. HoloML 0.2, of 2026-09-29 (begun
2026-09-27), adds to it without changing it: every 0.1 page means the
same in 0.2. Both versions are fixed: what a page written for either
means will not change.

## Why HoloML is experimental

HoloML is marked experimental: its specification is published for
examination, experimental implementation, and evaluation. It has one
renderer so far, HyperSpace 3D, and a language is proved by more than
one; and until version 1.0, a later version may change or remove what
an earlier one has, where experience shows a better way. The versions
keep that safe for pages: each page says which version it is written
for, and keeps the meaning of that version. A page that moves to a
later version may need changes.

## How a page says its version

The root element's `version` names the version the page is written for.
Every page has one, written exactly, `"0.1"` or `"0.2"`, with no spaces
around it:

```holoml
<holoml version="0.1">
  <scene>
    <model src="models/coupe.glb" />
  </scene>
</holoml>
```

A page is checked against the version it declares, and may use only
what that version has. In a 0.1 page, an element or attribute from 0.2
is reported as unknown, and a value from 0.2, such as an `animate` of a
light's `intensity`, as a bad value. Here a 0.1 page has a sound:

```text
<holoml version="0.1">
  <scene>
    <sound src="sounds/birds.ogg" autoplay />
  </scene>
</holoml>
```

A checker reports `unknown-element` at line 3, column 5: `sound` is not
a HoloML 0.1 element, as it came in 0.2. The same page with
`version="0.2"` is valid.

Declaring the version says what the author wrote for, and tells a
reader which rules to read the page by, so a reader that knows several
versions reads each page by its own. A page's scripts can read it too,
as `holoml.version`.

## A version the reader does not know

A reader refuses a version it does not know, rather than guess. A
reader that knows only 0.1 refuses a 0.2 page with the problem
`unsupported-version`, and a reader that knows 0.1 and 0.2 refuses a
page that says `version="0.3"` in the same way.

What refusing is depends on the reader. A checker reports
`unsupported-version` and then checks the rest of the page by the
newest version it knows, so that the author sees the page's other
mistakes in the same pass. A renderer does not draw the page at all,
neither as the version it names nor as another, and tells the viewer
why. A page that declares no version is treated in the same way: there
is nothing to read it by but a guess.

A page written for a later version may hold elements, attributes, or
values whose meaning an older reader cannot know. A reader that guessed
could show a scene different from the one the author wrote, with no
sign that anything was missing. Refusing makes the gap plain: the page
needs a reader that knows its version.

## What 0.2 added

Version 0.2 grew with HyperSpace 3D's example sites, from Blockworld to
the ocean tunnel, each bringing what it needed; the specification marks
each addition "(0.2)". In all:

- Scripts and the scene API, with a model's animation speed.
- Sound (`sound`), and sounds from a place (a sound's `position` and
  `range`).
- On the screen: text (`hud`), a `slider`, a `choice`, which can change
  a material in place, and a floor plan (`plan`).
- Moving: walls and gravity (`solid`, `gravity`, `jump`), a crosshair,
  walking and turning speeds (`speed`, `turn-speed`), and places
  (several viewpoints, and `#name` in an address).
- Looks: shadows, textured materials (`map`, `normal-map`,
  `roughness-map`, `repeat`), light from the surroundings
  (`environment`), a `sky`, water (`water`), and the animation of a
  light's position, brightness, and colour, and of the background.
- Text of more than one line (`panel`), and click actions (`begin`,
  `trigger`, `toggle`).
- Loading by area (`load`, `near`, and stand-ins).

## The editions of 0.2

A version's specification can have more than one edition. An edition
changes the document, not the language: it says what was left unsaid,
and corrects what was wrong. The releases of HoloML's parser and
checker are numbered with it: 0.2.0 came with the first edition of 0.2,
0.2.1 with the second, and 0.2.2 with the third. The
[change log](../../CHANGELOG.md) lists what each release changed.

The second edition, of 2026-09-29, has the same language: no page
changes its meaning, and every page valid in the first edition is valid
in the second. What changed is the document, now written in the form of
W3C specifications. It has an
abstract and a status; conformance classes, which say what a page, a
checker, and a renderer each have to do; requirement words in capitals,
as BCP 14 (the IETF's rules for those words) defines them; terminology;
the processing model; considerations of security, privacy,
accessibility, and internationalization; a formal grammar, and the
scene API in Web IDL, the notation of web APIs; the media type's
registration; references; and an index.

Where the first edition left something unsaid, the second edition says
it, and marks it as a clarification:

- A renderer's behaviour, which the first edition wrote as a fact ("a
  renderer lets …"), is written with the requirement words, at the
  strength the text had.
- Which glTF extensions a renderer reads.
- Every event's `type`, and the key event's `repeat`.
- The renderer's limits, which moved to the processing model.

The third edition, of 2026-09-30, followed a review of the
specification against itself, against the checker, and against
HyperSpace 3D. It corrects the places where they disagreed, and says
exactly which mistake a reader reports and at which character, so that
a second reader can give the same results from the text alone. Most of
it changes nothing for a page. Two corrections make the checker
stricter:

- Whitespace in a value is the space, the tab, the line feed, and the
  carriage return, and nothing else. A vector whose numbers are
  separated by no-break spaces was taken before, and is now a
  `bad-value`.
- An address with a control character, or with a space of any kind, is
  a `bad-value`. Before, a control character could hide a scheme such
  as `javascript:` from the checker.

A few make it looser: a time may be written with any form of number
(`1e3ms`), and the `content` of a `meta` may be empty. No page that is
valid in the third edition means anything other than it did.

The first edition stays at the tag
[v0.2.0](https://github.com/srajpal/holoml/blob/v0.2.0/SPEC.md). Before
0.2, a release numbered 0.1.1 (2026-09-27) fixed HoloML's parser and
checker.

## What comes next

HoloML 0.3 is planned with HyperSpace 3D's milestone 23: names for
models and groups, the language and direction of text, a lighter model
shown far away, and more of the scene API. The first two fill the gaps
that [Accessibility in 3D](accessibility.md) describes. A page that uses
them will say `version="0.3"`, and readers that know only 0.1 and 0.2
will refuse it rather than guess.

Further off are ideas for later versions: movement along paths,
physics, named colours, styles shared between elements, and spaces
shared by several people.

## Read more

- The specification: [versions](../../SPEC.md#11-versions),
  [the changes](../../SPEC.md#appendix-c-changes),
  [checking](../../SPEC.md#8-checking), and
  [conformance](../../SPEC.md#2-conformance).
- [Why HoloML](why-holoml.md).
