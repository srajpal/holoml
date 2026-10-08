# Contributing to HoloML

HoloML is an open markup language for fully 3D websites, designed
alongside the HyperSpace 3D browser. Versions 0.1 and 0.2 are written
down in [SPEC.md](SPEC.md), with a parser, a checker, conformance
samples, and guides in [docs/](docs/index.md), all published at
https://srajpal.github.io/holoml/.

## Set up and test

You need Node.js 24 or newer (`.nvmrc` names the line) and pnpm
12.4.1 (pinned in package.json; `corepack enable` gives you that
version). The RELAX NG checks run Jing, which needs Java; without it
they are skipped. Then:

```
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
```

Every push and pull request runs these on Windows and Linux in GitHub
Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)). The site
is published from `main` by another workflow
([pages.yml](.github/workflows/pages.yml)), which runs the same checks
first and publishes nothing if one fails. Dependabot proposes newer
versions of the actions and the packages once a week.

## Changes

- Open an issue to discuss ideas for the language before sending changes
  to the specification.
- Keep the language small, readable, and hand-writable, like HTML (see
  the design principles in [AGENTS.md](AGENTS.md)).
- The guides in docs/ are plain Markdown, in the plain English and
  British spelling of the rest; every HoloML example in them is checked
  by the tests. Some files are made from others: after changing the
  checker's table, a code, the Web IDL, or a table of the scene API,
  run `pnpm grammar:update` and `pnpm reference:update`, and read what
  they changed. `pnpm site:build` makes the published site in `_site/`
  (named another folder, it builds only into a new or empty one, or one
  it made before).
- The example sites in examples/ are published as they are, without
  their `tools/` folders. Every model, picture, and sound in them is CC0
  or CC BY 4.0 (never "non-commercial", "no derivatives", or "share
  alike") and is credited in the example's `models/CREDITS.md`; where a
  file carries its own licence stamp, the stamp is what counts. Their
  scripts are tested in `examples/tools/`.
- Code is licensed under the Apache License 2.0 and the specification
  text under CC BY 4.0. By contributing, you agree that your contribution
  is licensed under the same terms; there is no separate agreement to
  sign. You may add yourself to [AUTHORS](AUTHORS).
- Report security problems privately, as described in
  [SECURITY.md](SECURITY.md).
- Be respectful: see the [code of conduct](CODE_OF_CONDUCT.md).
- `main` is protected: it cannot be force-pushed or deleted, and a pull
  request is merged once its automatic builds pass on Windows and Linux.

The rules for AI agents working here are in [AGENTS.md](AGENTS.md).
