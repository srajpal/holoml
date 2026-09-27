# Contributing to HoloML

HoloML is an open markup language for fully 3D websites, designed
alongside the HyperSpace 3D browser. Version 0.1 is written down in
[SPEC.md](SPEC.md), with a parser, a checker, and conformance samples.

## Set up and test

You need Node.js 22.13 or newer and pnpm 12.4.1 (pinned in package.json;
`corepack enable` gives you that version). Then:

```
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
```

Every push and pull request runs these on Windows and Linux in GitHub
Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Changes

- Open an issue to discuss ideas for the language before sending changes
  to the specification.
- Keep the language small, readable, and hand-writable, like HTML (see
  the design principles in [AGENTS.md](AGENTS.md)).
- Code is licensed under the Apache License 2.0 and the specification
  text under CC BY 4.0. By contributing, you agree that your contribution
  is licensed under the same terms; there is no separate agreement to
  sign. You may add yourself to [AUTHORS](AUTHORS).
- Report security problems privately, as described in
  [SECURITY.md](SECURITY.md).

The rules for AI agents working here are in [AGENTS.md](AGENTS.md).
