**What this changes, and why**

<!-- For a change to the language, link the issue where it was discussed. -->

**Checks** (see CONTRIBUTING.md)

- [ ] `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass here.
- [ ] A change to the language is in SPEC.md, with an example and a conformance sample (`pnpm conformance:update`, and its `.expected.json` read).
- [ ] After a change to the checker's table, a code, the Web IDL, or a table of the scene API: `pnpm grammar:update` and `pnpm reference:update` were run, and what they changed was read.
- [ ] The guides and the README say what is true after this change; `pnpm site:build` reports no problems.
- [ ] An example's models, pictures, and sounds are CC0 or CC BY 4.0, and credited in its `models/CREDITS.md`.
- [ ] No keys, passwords, or private details anywhere in it.

By sending this, you agree that your contribution is licensed under the
repository's terms (Apache 2.0 for code, CC BY 4.0 for the specification
text).
