# HoloML

A clean, open markup language for fully 3D websites. Write a scene the
way you write HTML: a 3D model, a place to stand, some lights, a few
labels and links. A HoloML-aware browser renders it as a space you can
walk or orbit around.

Apache 2.0 for code. CC BY 4.0 for the specification text.

**Status: version 0.1, written down.** [SPEC.md](SPEC.md) describes
the language; this repository has a parser, a checker, conformance
samples, and a small example. HoloML is the markup language of
[HyperSol HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)
(short: HyperSpace 3D), the open-source 3D browser that is being built
alongside it; showing HoloML pages in that browser comes next. Files use
the extension `.holoml`.

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
and simple animation. The syntax is strict: a mistake stops with its
line and column. Later versions: scripting and interactivity
(configurators), sound, physics, and spaces shared by several people.

## What is here

```
holoml/
  SPEC.md            the language, version 0.1
  packages/
    parser/          @holoml/parser: text to a tree, with line and column; no dependencies
    schema/          @holoml/schema: checks a tree against the spec and lists problems
  conformance/       sample documents and the result any reader must give for each
  examples/
    showroom/        three cars to orbit around, and one to walk around
```

The packages are not published to npm yet.

## Testing

From the repository root (Node 22.13 or newer, pnpm 12.4.1):

```
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
```

121 unit and conformance tests passed on 2026-09-27 on Windows 11. GitHub
Actions runs them on Windows and Linux for every push.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ideas for the language start as
issues. Rules for AI agents are in [AGENTS.md](AGENTS.md).

## License

Copyright 2026 The HoloML Authors (see [AUTHORS](AUTHORS)).
Code: [Apache License 2.0](LICENSE).
Specification text: [Creative Commons Attribution 4.0](LICENSE-SPEC).
See [NOTICE](NOTICE).
