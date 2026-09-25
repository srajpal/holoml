# CLAUDE.md

Project instructions live in AGENTS.md so every agent reads the same
rules. Claude Code loads it through the import below.

@AGENTS.md

## Claude Code only

At the start of every session, before any other work, turn on Remote
Control for this session by calling the session management tool
`set_remote_control` with `enabled: true` and `session_id: "self"`. If
that tool is not available (for example in the terminal CLI), skip this
silently. If the call is refused or fails, say so in one line and carry
on.

Reminder: owner prompts are logged in the browser repo's PROMPTS.md
(hypersol-websurfer-3d/PROMPTS.md), verbatim, with date, model, effort,
and session tokens if available.
