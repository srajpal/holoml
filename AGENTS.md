# AGENTS.md — Project instructions for AI agents

Read this file first. CLAUDE.md imports it, so Claude Code reads it
automatically.

## Project

HoloML: an open markup language for fully 3D websites. It is designed
alongside HyperSol WebSurfer 3D, the browser that renders it.

- This repo: https://github.com/srajpal/holoml
- Browser repo: https://github.com/srajpal/hypersol-websurfer-3d
- The brief, architecture, and prompt log live in the browser repo:
  BRIEF.md, ARCHITECTURE.md (section 6 covers this repo), PROMPTS.md.
- Local layout: this folder and the browser folder sit side by side
  (`holoml/` next to `hypersol-websurfer-3d/`).
- License: Apache 2.0 for code, CC BY 4.0 for SPEC.md.

## Rules

The rules in the browser repo's AGENTS.md apply here in full. In short:

1. Work only in this project (and the browser folder when approved).
2. Build only the part the owner has approved, one step at a time.
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
11. Do not commit or push without being asked.

## Prompt log

Owner prompts are logged verbatim in the browser repo's PROMPTS.md, which
is the single log for both projects. Do not keep a second log here.

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

What to recheck after any change: nothing yet. The first milestone will
add: parser round-trips every conformance sample; schema rejects every
invalid sample.
