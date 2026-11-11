# streamkit

Claude Code plugin and single-repo marketplace. One skill (`/streamkit:orchestrate`) plus five subagents. Everything shipped is Markdown and JSON; there is no build step and no code.

This file lives at `.claude/CLAUDE.md` on purpose: a `CLAUDE.md` at the plugin root is not loaded for plugin users and makes `claude plugin validate` warn.

## Layout

- `.claude-plugin/plugin.json` — plugin manifest; the only place `version` is set.
- `.claude-plugin/marketplace.json` — marketplace manifest, plugin `source` is `./`.
- `skills/orchestrate/SKILL.md` — the orchestrator's instructions.
- `agents/*.md` — `stream-worker`, `researcher`, `debugger`, `visual-verifier`, `reviewer`.
- `templates/` — files users copy by hand (global `CLAUDE.md`, settings snippet, project snippet).
- `docs/` — reference for people and agents working on this repo; not loaded by the plugin.

## Reference docs (read when relevant, not up front)

- `docs/architecture.md` — phases, topology, why each agent is configured the way it is. Read before changing the skill or any agent's role, model or tools.
- `docs/frontmatter-reference.md` — which frontmatter and settings keys are verified against the official docs, with minimum versions. Read before adding or changing a key.
- `docs/development.md` — how to test a change and cut a release.

## Commands

```bash
claude plugin validate .          # must end with "Validation passed"
claude --plugin-dir .             # interactive session with the working copy
```

Headless load check, release steps and the install round-trip are in `docs/development.md`.

## Rules

- Refer to agents by their namespaced type, `streamkit:<agent>`, everywhere in the skill and agent bodies. Frontmatter `name` stays bare (no `:`).
- Do not add `hooks`, `mcpServers`, `permissionMode` or `initialPrompt` to agent frontmatter: plugin agents silently ignore them.
- Do not invent frontmatter or settings keys. Check the official Claude Code docs first, then record the key in `docs/frontmatter-reference.md`.
- Every agent keeps a hard reply-line cap and a fixed reply format. The orchestrator's context depends on it.
- Keep the topology flat: workers spawn only leaf agents, never another worker or reviewer.
- `templates/CLAUDE.md` is adapted from Honey for Devs (MIT). Keep `NOTICE` accurate if that file changes substantially.
- Commits are small and single-purpose. Bump `version` in `plugin.json` for any change users should receive.

## Keeping this file and `docs/` current

Update them in the same commit as the change that makes them stale:

| If you change | Also update |
| :--- | :--- |
| A phase, option or rule in `skills/orchestrate/SKILL.md` | `docs/architecture.md`, README "What it does" / "Usage" |
| An agent's model, effort, tools, TTL or role | `docs/architecture.md`, README agents table, the roster table in `SKILL.md` |
| Any frontmatter or settings key | `docs/frontmatter-reference.md`, README minimum version |
| Files added, moved or removed | "Layout" above |
| Install, test or release steps | `docs/development.md`, README |

Before finishing a change, re-read the row that applies and confirm the listed files agree with the new behaviour.
