# Changelog

What changed in HoloML with each release: the specification (SPEC.md),
the parser and the checker (packages/), the conformance samples, and the
example sites. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

A release has two numbers. The language's version (0.1, 0.2) is what a
page declares, and what a page written for it means does not change.
The release's own number (0.2.2) counts the editions of the
specification and the fixes to the parser and the checker between
language versions; [Versions](docs/explanation/versions.md) explains
both. The specification's own list of changes is its
[appendix C](SPEC.md#appendix-c-changes).

## [0.2.2] - 2026-09-30

HoloML 0.2, third edition. Not tagged yet. The language is the same;
this release follows a review of the parser, the checker, the
specification, and the conformance samples (HyperSpace 3D's prompt 134).

### Security

- The checker's pattern for a number took time that grew with the
  square of a run of digits: a value of 160,000 digits that was almost a
  number took 42 seconds to refuse, and a renderer runs the checker on
  every page. It is refused in one pass now, as is every other kind of
  value.
- A control character before or inside an address could hide its scheme
  from `unsafe-link`: `href="&#1;javascript:alert(1)"` was valid. An
  address with a control character is now a `bad-value` (below).

- The example sites' tools stop when a model's own licence stamp
  disagrees with its credit, or is not CC BY 4.0 or CC0
  (examples/aquarium/tools/licence.mjs); the downloads of Harbour Loft
  and the sofa studio are checked against recorded SHA-256 sums.
- The site's builder refuses to empty a folder it did not make
  (`node site/build.mjs .` removed the working tree).
- The site is published only after lint, the type check, and the tests
  pass; the job that publishes holds the two permissions that needs and
  runs nothing else; every action is named by its commit.

### Changed

- **The aquarium's turtle is replaced.** The flatback sea turtle's file
  was licensed CC BY-NC 4.0 (non-commercial), though its record said
  CC BY and it was credited so. It is now a hawksbill sea turtle by
  Bindestrek, CC BY 4.0 by its record and its own stamp, with its
  board's text about the hawksbill. The shark's and the snapper's
  licence (CC BY 4.0, from the Babylon.js asset library's own
  statement) is recorded.

Stricter: a page that was valid can now have a problem.

- Whitespace in a value is the space, the tab, the line feed, and the
  carriage return, as the grammar always said. The checker also took
  the no-break space and Unicode's other spaces between the numbers of
  a vector and around a value; they are now a `bad-value`.
- An address with a control character (U+0000 to U+001F, U+007F to
  U+009F), with a space or another separator (Unicode's category Z), or
  with U+FEFF is a `bad-value`. Before, only JavaScript's whitespace
  inside an address was, and such characters around it were dropped.

Looser: a page that had a problem can now be valid.

- A time takes every form of number before its unit: `1e3ms` and `1.s`
  are valid, as the specification said.
- The `content` of `meta` may be empty, as in HTML.
- A `label` whose text is a no-break space has text.
- A toggle's `repeat="01"` is 1.

Reported differently, in pages that already had a mistake:

- Where the text ends inside a tag the error is `unexpected-end`, at
  the tag's `<`. It was `invalid-name` after `<`, `unquoted-value` after
  `=`, and `stray-slash` after `/`, each at the end of the text.
- After a byte order mark, the columns of line 1 count from the first
  character after the mark (they were one too many).
- Text where none may be is reported where its first character that is
  not whitespace is written, also when it begins with a character
  reference to whitespace (it was reported lines away).
- A 0.1 page that writes what 0.2 added is told it is unknown, and no
  longer held to 0.2's rules between attributes as well.
- An `id` inside an unknown or misplaced element counts: a reference to
  it is no longer an `unknown-target`, and a second element with the
  same id is a `duplicate-id`. A reference that is not written as one
  (`#no such`) is a `bad-value` only.
- A reader that knows fewer versions than the checker (its `versions`
  option) checks the rest of a page it refuses by the newest version it
  knows, not the checker's newest.

### Added

- SPEC.md, section 5, "Where a syntax error is reported", and section
  8, "Where a problem is reported": which code a reader gives and at
  which character, so that a second reader can pass the conformance
  samples from the text alone.
- SPEC.md says for the first time how a number is written, what
  reduced motion holds still, when a page is ready, the order of what a
  click does, and, in the scene API, what `holoml.add` takes, the space
  of a hit, that hidden things take no clicks, and how `dt` is bounded.
  Appendix C lists every change.
- 44 conformance samples: 6 valid, 23 syntax errors, and 15 problems;
  among them character references in values, numbers in every form,
  line ends of every kind, the byte order mark, and the end of the text
  in every part of a tag.
- The parser's text nodes carry `visible`, the place of their first
  character that is not whitespace.
- Tests: every syntax error code and every problem code has a
  conformance sample; no sample depends on the order of problems at one
  place; the RELAX NG schema and the checker take and refuse the same
  values.
- This change log, a code of conduct, issue and pull request templates,
  Dependabot, and line-end and editor settings.

### Fixed

- The aquarium: feeding no longer breaks when reduced motion is
  switched during a feed; only the main button feeds and adds to the
  cart (the sneaker store's too); the fish's script makes no garbage
  each frame. Blockworld: a torch gets its light back when one frees,
  and a block the limits leave out is no longer kept unseen.
- The examples' tools build into a separate folder and swap at the end,
  after checking their downloads are there; their shared code is in
  examples/tools/.
- The site: a code block takes the keyboard only when it scrolls (the
  specification's page had over a hundred Tab stops); the booking and
  checkout pages' status lines and focus ring.

- `serialize()` writes a tree that reads back the same: text beside a
  comment or an element, whitespace at the ends of text, and text that
  is whitespace from a character reference are kept.
- The RELAX NG schema's patterns (numbers, colours, times, ids, file
  extensions, the versions) are written from the checker's own, where
  they were copies by hand; its text attributes are not empty, and its
  addresses hold no control characters.
- SPEC.md against itself: a group does not hold `water`, and a second
  `water` is `too-many`; a `choice` without an `option` is a
  `missing-child`; a panel's `id` is not for `animate`; what refusing an
  unknown version is, for a checker and for a renderer.

## [0.2.1] - 2026-09-29

HoloML 0.2, second edition. Not tagged. The language is the same.

### Changed

- SPEC.md is written in the form of W3C specifications: an abstract,
  the status, conformance classes and requirement words (BCP 14),
  terminology, the processing model, considerations of security,
  privacy, accessibility, and internationalization, the media type's
  registration, references, and an index.
- HoloML is marked experimental, and 0.1 and 0.2 are called fixed (the
  first edition called them final).

### Added

- The formal grammar: the syntax in ABNF, the structure in RELAX NG,
  and the scene API in Web IDL (SPEC.md appendix A, and `spec/`).
- The guides in `docs/` (tutorials, how-to guides, reference, and
  explanation) and the site made from them and the specification.
- Clarified in SPEC.md: which glTF extensions a renderer reads, every
  event's `type`, and the key event's `repeat`.

## [0.2.0] - 2026-09-29

HoloML 0.2, first edition.

### Added

- Scripts and the scene API: `script`, and the `holoml` object for a
  page's scripts.
- Sound (`sound`), and sounds from a place (`position` and `range`).
- On the screen: text (`hud`), a `slider`, a `choice` that can change a
  material in place, and a floor plan (`plan`).
- Moving: walls and gravity (`solid`, `gravity`, `jump`), a crosshair,
  walking and turning speeds, and places (several viewpoints, and
  `#name` in an address).
- Looks: shadows, textured materials (`map`, `normal-map`,
  `roughness-map`, `repeat`), light from the surroundings
  (`environment`), a `sky`, water (`water`), and the animation of a
  light and of the background.
- Text of more than one line (`panel`), and click actions (`begin`,
  `trigger`, `toggle`).
- Loading by area (`load`, `near`, and stand-ins).
- The example sites: Blockworld, the sofa studio, Harbour Loft, the
  sneaker store, and the ocean tunnel, beside 0.1's showroom.

Everything in 0.1 means the same in a 0.2 page.

## [0.1.1] - 2026-09-27

### Fixed

- Issues #1 to #5 in the parser and the checker: names inherited from
  JavaScript's objects (`constructor`) are unknown, not a failure;
  elements nest at most 256 deep (`too-deep`); a number too large to
  represent is a `bad-value`; ids, references, and choices are written
  exactly; a null character in a comment is an error.
- Comments are read in time that grows with their length only.

## [0.1.0] - 2026-09-26

HoloML 0.1, the first version (tagged 2026-09-27): models, groups,
lights, labels, links, materials, the animation of position, rotation,
and scale, and orbiting and walking; the parser, the checker, and the
conformance samples.

[0.2.2]: https://github.com/srajpal/holoml/compare/v0.2.0...HEAD
[0.2.1]: https://github.com/srajpal/holoml/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/srajpal/holoml/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/srajpal/holoml/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/srajpal/holoml/releases/tag/v0.1.0
