# AGENTS.md — Project instructions for AI agents

Read this file first. CLAUDE.md imports it, so Claude Code reads it
automatically.

## Project

HoloML: an open markup language for fully 3D websites. It is designed
alongside HyperSol HyperSpace 3D (short: HyperSpace 3D; called HyperSol
WebSurfer 3D until 2026-09-26), the browser that renders it. The
language keeps the name HoloML; its files use the extension `.holoml`
(owner, prompt 63; `.holo` and `.hlml` were already taken).

- This repo: https://github.com/srajpal/holoml
- Browser repo: https://github.com/srajpal/hypersol-hyperspace-3d
  (renamed from hypersol-websurfer-3d; GitHub redirects the old address)
- The brief, architecture, roadmap, prompt log, and handoff live in the
  browser repo: BRIEF.md, ARCHITECTURE.md (section 6 covers this repo),
  TODO.md, PROMPTS.md, HANDOFF.md.
- Local layout: this folder and the browser folder sit side by side
  (`holoml/` next to the browser folder, which on the owner's machine
  keeps its old name `hypersol-websurfer-3d/`). Never nest one in the
  other.
- License: Apache 2.0 for code, CC BY 4.0 for SPEC.md.

## Rules

The rules in the browser repo's AGENTS.md apply here in full. In short:

1. Work only in this folder, the sibling browser folder, and the session
   scratchpad. Caches that installs write elsewhere by design are allowed.
2. Build only what the owner has approved: first the milestone plan, then
   its build, which covers every task in that plan. Check in at marked
   decision points and at the end.
3. Use only agreed data and services. No new network calls or services
   without separate approval.
4. Ask before adding software, deleting work, resetting saved data,
   initialising or force-pushing git, or publishing anything.
5. Ask when a requirement is unclear.
6. Keep private data and secrets out of the repo, docs, and tests.
7. Never invent results. Report what actually ran.
8. Never remove or weaken a requirement, test, or assertion to get a pass.
9. Keep the README and other docs current with every change.
10. Mark run and test steps "not checked yet" until they have run here.
11. Commit after each completed, approved change with a clear message.
    Push before starting a milestone and after finishing one, as the
    browser repository does (owner, prompt 161); otherwise push only
    when asked. When five or more commits are waiting to be pushed,
    remind the owner. Never rewrite published history.
12. One active agent session per working tree at a time. Owner prompts
    are logged in the browser repo's PROMPTS.md; read its last heading
    before appending.

## Prompt log

Owner prompts are logged, lightly edited, in the browser repo's
PROMPTS.md, which is the single log for both projects. Do not keep a second log here.
Contributors do not log prompts. Owner-only session automation lives in
CLAUDE.local.md, which is gitignored.

## Language design principles

- Readable by a person, hand-writable, view-source friendly.
- Small core. Prefer a few composable elements over many special ones.
- Every element and attribute in SPEC.md has a conformance sample.
- Do not break published examples without a version bump and a note.

## Testing

Where tests live:
- Unit tests next to the code: `*.test.ts` in packages/parser/src,
  packages/schema/src, and packages/vscode/src; the site's in site/;
  those of the example sites' scripts and tools in examples/*/tools/ and
  examples/tools/.
- The VS Code extension (packages/vscode, browser milestone 23): its unit
  tests (above) include the grammar's tests (packages/vscode/syntaxes/tests,
  run by vscode-tmgrammar-test), the built extension's (no network code,
  the language server over every example site with the network refused,
  and the .vsix's contents), and the snippets'. Its tests inside a real VS
  Code are in packages/vscode/test/vscode, with the folder they open in
  packages/vscode/test/fixtures.
- The guides: docs/, organised as tutorials, how-to guides, reference,
  and explanation; docs.test.ts checks every HoloML example in them.
- Conformance samples: conformance/valid, conformance/syntax-errors, and
  conformance/problems, each `.holoml` with a `.expected.json`
  (SPEC.md section 8), usable by any renderer.
- Examples: examples/, checked by a unit test.

How to run (from the repository root; recorded 2026-09-26 on Windows 11
after they ran; on Windows and Linux in GitHub Actions,
.github/workflows/ci.yml):
- Toolchain: Node 24 or newer (the automatic builds run 24; owner,
  prompts 161 and 164); pnpm 12.4.1, pinned in package.json.
- Install: `pnpm install --frozen-lockfile`
- Unit, conformance, documentation, site, and extension tests: `pnpm
  test` (Vitest; 883 tests passed on 2026-10-07). The RELAX NG schema
  is checked by Jing (tools/jing/, its SHA-256 checked), which needs
  Java (run with Java 17 here; GitHub's machines have it): without Java
  those checks are skipped and say so, and in GitHub Actions (CI set) a
  missing Java fails the run (HyperSpace 3D milestone 25, prompt 170)
- Lint and type check: `pnpm lint` and `pnpm typecheck` (both clean)
- The VS Code extension: `pnpm --filter holoml-vscode package` makes
  packages/vscode/holoml-vscode.vsix (first run 2026-10-03); `pnpm
  --filter holoml-vscode test:vscode` runs its tests inside VS Code (10
  passed in VS Code 1.139.1 on 2026-10-05). On a
  developer's computer they use the VS Code installed there (HOLOML_VSCODE
  names its program; on Windows its usual place is found), and stop if
  there is none; only in GitHub Actions (CI set) is VS Code 1.96.0
  downloaded for the run. Each run starts a fresh profile whose settings
  turn off what in VS Code itself reaches the network (its AI features,
  telemetry, experiments, and update checks). A VS Code window opens
  while they run. VS Code
  will not start a second copy while it is waiting to finish an update:
  restart it first.
- After adding or changing a sample: `pnpm conformance:update` writes
  its `.expected.json`; read every changed file before committing, since
  the expected results are the specification's.
- After changing the checker's table, a code, the Web IDL, or a table of
  the scene API in SPEC.md: `pnpm grammar:update` (spec/holoml.rnc and
  SPEC.md's copies of the grammar files) and `pnpm reference:update`
  (docs/reference/elements.md, api.md, and codes.md, and SPEC.md's
  index). The tests fail until they are run.
- The site: `pnpm site:build` makes it in `_site/` (first run
  2026-09-29), checking every link within it; the Pages workflow builds
  it the same way on main (browser milestone 22), and publishes it only
  after lint, the type check, and the tests have passed there.

What to recheck after any change: all of the above (browser milestone
13 checks O1 to O8 in the browser repository's TODO.md). The tests hold
SPEC.md and the code together: every error and problem code, element,
and attribute in the code must be in SPEC.md with an example, and every
element and attribute must appear in a valid sample.
