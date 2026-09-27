# HoloML

A clean, open markup language for fully 3D websites. Write a scene the
way you write HTML: a 3D model, a place to stand, some lights, a few
labels and links. A HoloML-aware browser renders it as a space you can
walk or orbit around.

Apache 2.0 for code. CC BY 4.0 for the specification text.

**Status: planning.** HoloML is the markup language of
[HyperSol HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)
(short: HyperSpace 3D), the open-source 3D browser that is being built
alongside it and will be its first renderer. No parser code exists yet.
(The browser was called HyperSol WebSurfer 3D until 2026-09-26; the
language keeps its name, HoloML, and its file extension, `.holo`.)

## Why a new language

HTML describes documents on a flat page. Existing 3D formats (glTF, USD,
X3D) describe assets and scenes for tools, not pages for people. HoloML
sits in between: a small, readable, view-source-friendly language that a
web author can hand-write, that links to other pages, and that a browser
can render without a game engine.

The name is the spirit: a markup language for things you look into, not
at. See the story in the browser repository's README.

## First version scope

Version 1 of the language will cover:

- Loading a 3D model file and placing it in a scene
- A viewer position, with walk and orbit movement
- Text labels and links, including links to other HoloML and HTML pages
- Lights, materials, and simple animation

Later: scripting and interactivity (configurators), physics, audio,
multi-user spaces.

## Planned layout

```
holoml/
  SPEC.md            the language, written like a small HTML spec
  packages/
    parser/          @holoml/parser: text to a node tree, zero dependencies
    schema/          @holoml/schema: element and attribute rules
  examples/
    showroom/        a car showroom demo
  conformance/       sample files and expected trees for any renderer
```

## Testing

Not checked yet. No tests exist. Commands will appear here once they
have actually run.

## Contributing

Rules for agents and contributors are in [AGENTS.md](AGENTS.md). Design
discussion happens in issues once the spec outline lands.

## License

Copyright 2026 The HoloML Authors (see [AUTHORS](AUTHORS)).
Code: [Apache License 2.0](LICENSE).
Specification text: [Creative Commons Attribution 4.0](LICENSE-SPEC).
See [NOTICE](NOTICE).
