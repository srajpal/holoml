# HoloML

A clean, open markup language for fully 3D websites. Write a scene the
way you write HTML: a 3D model, a place to stand, some lights, a few
labels and links. A HoloML-aware browser renders it as a space you can
walk or orbit around.

Apache 2.0 for code. CC BY 4.0 for the specification text.

**Status: experimental; versions 0.1 and 0.2 are written down.** HoloML
has one renderer so far, and until version 1.0 a later version may
change or remove what an earlier one has; what a page written for 0.1 or
0.2 means will not change.
[SPEC.md](SPEC.md) describes the language, in the form of W3C
specifications, with its grammar and its scene API in Web IDL; this
repository also has a parser, a checker, conformance samples, guides,
and example sites. The specification and the guides are published at
https://srajpal.github.io/holoml/ (the specification at
https://srajpal.github.io/holoml/spec/). HoloML is the
markup language of
[HyperSol HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)
(short: HyperSpace 3D), the open-source 3D browser built alongside it,
which shows HoloML pages. Version 0.2 grew with the browser's example
sites: scripts, sound, text on the screen, walls and gravity, the
animation of lights, shadows, textured materials, choices that change a
material in place, light from the surroundings, text of more than one
line on a board, doors and lamps that work with a click, places to go
to, a sky, a floor plan, models that load as the viewer comes near,
water, and sounds from a place. Files use the extension `.holoml`.

## Why a new language

HTML describes documents on a flat page. Existing 3D formats (glTF, USD,
X3D) describe assets and scenes for tools, not pages for people. HoloML
sits in between: a small, readable, view-source-friendly language that a
web author can hand-write, that links to other pages, and that a browser
can render without a game engine.

The name is the spirit: a markup language for things you look into, not
at. See the story in the browser repository's README.

## A page

```
<holoml version="0.1">
  <scene background="#0b0f1e">
    <viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
    <light type="directional" position="4 8 5" intensity="1.2" />
    <a href="coupe.holoml">
      <model src="models/coupe.glb" rotation="0 30 0">
        <material name="Paint" color="#c0182a" />
      </model>
    </a>
    <label position="0 2.1 0">The coupe: click to walk around it</label>
  </scene>
</holoml>
```

Version 0.1 covers 3D models (glTF 2.0), groups, where the viewer starts
(orbit or walk), lights, labels, links, changing a model's materials,
and simple animation. Version 0.2 adds scripts with a small
scene API, sound, text, sliders, and choices on the screen, walls and
gravity for walking, walking and turning speeds, a crosshair, shadows,
textured materials, light from a panorama of the surroundings, the
animation of lights and the background, text panels, things that act
when clicked (a door that opens, a light switch), several places to go
to on one page, a sky, a floor plan on the screen, groups of models
that load only while the viewer is near, with lighter stand-ins until
then, water that things are seen through, with light from its waves,
and sounds that come from a place; a page says `version="0.2"` to use
them. The syntax is strict: a mistake stops with its line and column.
Later versions: movement along paths, physics, and spaces shared by
several people.

## What is here

```
holoml/
  SPEC.md            the language: versions 0.1 and 0.2 (0.2's third edition)
  CHANGELOG.md       what changed with each release
  spec/              its grammar: the syntax in ABNF, the structure in RELAX NG, the scene API in Web IDL
  docs/              the guides: tutorials, how-to guides, reference, and explanation
  site/              makes the published site from SPEC.md, docs/, and examples/ (pnpm site:build)
  packages/
    parser/          @holoml/parser: text to a tree, with line and column; no dependencies
    schema/          @holoml/schema: checks a tree against the spec and lists problems
  conformance/       sample documents and the result any reader must give for each
  examples/
    showroom/        a HoloML 0.1 site: five cars in a hall, each to walk around
    blockworld/      a HoloML 0.2 game: a small island of blocks, sound, day and night, a speed slider
    sofa-studio/     a HoloML 0.2 shop page: a sofa whose fabric and wood change in place, shadows, a studio's light
    harbour-loft/    a HoloML 0.2 flat to tour: panels, doors and lamps to click, places, a sky, a floor plan, a roof terrace
    sneaker-store/   a HoloML 0.2 shop: a shoe in ten colourways on shelves that load as you come near, a turntable, a cart
    aquarium/        a HoloML 0.2 ocean tunnel: 30 fish swum by a script, water, light from the waves, bubbles, feeding
    tools/           what the examples' own tools share, and the tests of their scripts (not published)
```

The examples are published with GitHub Pages:
https://srajpal.github.io/holoml/showroom/,
https://srajpal.github.io/holoml/blockworld/,
https://srajpal.github.io/holoml/sofa-studio/,
https://srajpal.github.io/holoml/harbour-loft/,
https://srajpal.github.io/holoml/sneaker-store/, and
https://srajpal.github.io/holoml/aquarium/. Open an example's
`index.holoml` in a browser that shows HoloML, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d),
where they are also listed under "HoloML examples".

The packages are not published to npm yet.

## Testing

From the repository root (Node 22.13 or newer, pnpm 12.4.1):

```
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
```

409 unit, conformance, documentation, site, and example tests passed on
2026-09-30 on Windows 11. GitHub Actions runs them on Windows and Linux
for every push, and the site is published from `main` only after they
pass there too. `pnpm site:build` makes the site in `_site/` (open
`_site/index.html`); `pnpm grammar:update` and `pnpm reference:update`
write the files made from the checker's table and the specification
(the RELAX NG schema, the reference pages, and the specification's
index), which the tests check.

## Built with the Buildwright approach

Sunny Rajpal developed this project through agentic coding: directing AI
coding agents to implement software while retaining responsibility for
scope, decisions, review, and acceptance. It applies the concepts taught
in [Buildwright](https://buildwrightcourses.com), organized around five
repeatable moves:

| Move | What it means |
| --- | --- |
| **Brief** | Define who the software helps, the problem it solves, and the first useful result. |
| **Architect** | Decide how the parts fit together, including the screens, data, constraints, and boundaries. |
| **Decompose** | Break the work into small tasks, each with a result that can be checked. |
| **Delegate** | Give an AI coding agent a focused task, review its plan, and guide its implementation. |
| **Verify** | Try the result, inspect the evidence, and correct what does not meet the brief. |

For HoloML, the brief was a readable way to describe a 3D website. The
architecture kept the language independent of its companion browser,
with a [specification](SPEC.md), a parser that reads the markup, and a
checker that validates its meaning. The work was divided into the language
rules, reusable packages, sample scenes, and conformance cases: examples
with an agreed expected result. AI agents implemented those focused pieces
under project rules and owner-approved plans; unit tests and conformance
checks provided evidence to compare the implementation with the specification.
See the [shared owner prompt log](https://github.com/srajpal/hypersol-hyperspace-3d/blob/main/PROMPTS.md)
for the decisions behind the language and its browser integration.

HoloML demonstrates how the method can support language and tooling design
as well as applications. It is a sustained project informed by Sunny's
software engineering experience, not the scope promised to a beginner.
Buildwright starts with a small prototype and a repeatable way to make progress.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[code of conduct](CODE_OF_CONDUCT.md). Ideas for the language start as
issues. Rules for AI agents are in [AGENTS.md](AGENTS.md).

## License

Copyright 2026 The HoloML Authors (see [AUTHORS](AUTHORS)).
Code: [Apache License 2.0](LICENSE).
Specification text: [Creative Commons Attribution 4.0](LICENSE-SPEC).
See [NOTICE](NOTICE). What the examples use of other people's (models,
pictures, and sounds) is CC0 or CC BY 4.0, and credited in each
example's `models/CREDITS.md`.
