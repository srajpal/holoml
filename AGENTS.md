# AGENTS.md — Project instructions for AI agents

Read this file first. CLAUDE.md imports it, so Claude Code reads it
automatically.

## Project

HoloML: an open markup language for fully 3D websites. It is designed
alongside HyperSol HyperSpace 3D (short: HyperSpace 3D; called HyperSol
WebSurfer 3D until 2026-09-26), the browser that renders it. The
language keeps the name HoloML and the extension `.holo`.

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
    Do not push unless asked. When five or more commits are waiting to
    be pushed, remind the owner.
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

Where tests will live (nothing exists yet):
- Parser and schema unit tests: `*.test.ts` next to the code.
- Conformance fixtures: conformance/ (sample .holo files with expected
  node trees), usable by any renderer.

How to run: not checked yet.

What to recheck after any change: nothing yet. This repo's first result
(browser milestone 13 in TODO.md, HoloML v0.1) is a SPEC.md, a schema,
a parser package, and conformance samples, with checks that the parser
round-trips every sample and the schema rejects every invalid one.
