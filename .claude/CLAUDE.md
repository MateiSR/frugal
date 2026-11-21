# frugal

Claude Code plugin and single-repo marketplace with two parts:

1. **Frugal mode** — hooks that inject token-saving rules into every session and subagent, plus the `/frugal` toggle and stats.
2. **Orchestration** — the `/frugal:orchestrate` skill, four subagents and a `debug` skill.

The plugin runtime is `hooks/frugal.js` (Node, no dependencies, no build step); tooling under `scripts/` is also dependency-free Node. Everything else is Markdown and JSON.

This file lives at `.claude/CLAUDE.md` on purpose: a `CLAUDE.md` at the plugin root is not loaded for plugin users and makes `claude plugin validate` warn.

## Layout

- `.claude-plugin/plugin.json` — plugin manifest; the only place `version` is set.
- `.claude-plugin/marketplace.json` — marketplace manifest, plugin `source` is `./`.
- `rules/frugal.md` — the single source of truth for the rules text. Keep it short: every token here is paid in every session and subagent.
- `AGENTS.md` — generated copy of `rules/frugal.md` for tools that read a root `AGENTS.md` (regenerate with `node scripts/build-rules.js`).
- `gemini-extension.json` — Gemini CLI extension manifest pointing `contextFileName` at `AGENTS.md`.
- `scripts/build-rules.js` — generates static rule copies from `rules/frugal.md` (`--check` fails on drift).
- `scripts/install.js` — installs or removes static frugal rules (marked blocks) for Cursor, Windsurf, Cline, Copilot (VS Code), Kiro, Kilo, Qoder, Antigravity IDE, Codex, OpenCode, Grok, Goose and Amp.
- `scripts/test-install.js` — tests `scripts/install.js` in a throwaway temporary home directory.
- `hooks/hooks.json` — registers `SessionStart`, `SubagentStart`, `UserPromptSubmit`.
- `hooks/frugal.js` — all three hooks, the `/frugal` command and stats.
- `skills/frugal/SKILL.md` — fallback for `/frugal` if the hook did not run.
- `skills/orchestrate/SKILL.md` — the orchestrator's instructions.
- `skills/debug/SKILL.md` — root-cause method for a bug that survived two fixes.
- `agents/*.md` — `stream-worker`, `researcher`, `visual-verifier`, `reviewer`.
- `bench/` — on-versus-off benchmark: `tasks.js`, `run.js`, `report.js`, `judge.js` (blind quality review), `draw.js` (README images), `variants/`, committed `results/<stamp>/`.
- `templates/` — optional files users copy by hand.
- `assets/` — README images: `banner.svg` and the light and dark benchmark charts. Their numbers are typed in by hand; redraw them when the README table changes.
- `docs/` — reference for people and agents working on this repo; not loaded by the plugin.

## Reference docs (read when relevant, not up front)

- `docs/frugal-mode.md` — hook flow, state files, the `/frugal` command, how stats are computed. Read before touching `hooks/` or `rules/`.
- `docs/architecture.md` — orchestration phases, topology, why each agent is configured the way it is. Read before changing the orchestrate skill or an agent.
- `docs/frontmatter-reference.md` — frontmatter, hook and settings facts verified against the official docs, with minimum versions. Read before adding or changing a key or a hook.
- `docs/development.md` — how to test a change and cut a release.

## Commands

```bash
claude plugin validate .          # must end with "Validation passed"
claude --plugin-dir .             # interactive session with the working copy
```

The hook test script, headless checks and release steps are in `docs/development.md`.

## Rules

- A hook must never break a session: `hooks/frugal.js` exits 0 with no output on any error. Keep it dependency-free.
- Do not put tokens into context that the user did not ask for. `/frugal` replies and stats go out through a blocked prompt, never through `additionalContext`.
- Change the rules or the injection only with a benchmark run and a `bench/judge.js` review behind it, and quote only numbers from a committed stamp in `bench/results/`.
- Stats report measured numbers. Never add an assumed savings percentage or a benchmark constant.
- `rules/frugal.md` is adapted from Honey for Devs (MIT). Keep `NOTICE` accurate if it changes substantially.
- Refer to agents by their namespaced type, `frugal:<agent>`, in skill and agent bodies. Frontmatter `name` stays bare (no `:`).
- Do not add `hooks`, `mcpServers`, `permissionMode` or `initialPrompt` to agent frontmatter: plugin agents silently ignore them.
- Do not invent frontmatter, hook or settings keys. Check the official Claude Code docs first, then record the fact in `docs/frontmatter-reference.md`.
- Add a subagent only for isolation of bulky output, a different model or tool set, or parallel or independent work. Otherwise write a skill.
- Write instructions as plain sentences. No all-caps emphasis, no per-turn reminders, no "verify twice" scaffolding.
- Every agent keeps a hard reply-line cap and a fixed reply format.
- Keep the orchestration topology flat: workers spawn only leaf agents.
- Commits are small and single-purpose. Bump `version` in `plugin.json` for any change users should receive.

## Keeping this file and `docs/` current

Update them in the same commit as the change that makes them stale:

| If you change | Also update |
| :--- | :--- |
| `hooks/frugal.js` or `hooks/hooks.json` (injection, state, commands, stats) | `docs/frugal-mode.md`, README "Frugal mode" |
| `rules/frugal.md` | Run `node scripts/build-rules.js`; README "The rules"; run the benchmark and update the README table |
| A phase, option or rule in `skills/orchestrate/SKILL.md` | `docs/architecture.md`, README "Orchestration" |
| An agent's model, effort, tools, TTL or role | `docs/architecture.md`, README agents table, the roster table in the orchestrate skill |
| Any frontmatter, hook or settings key | `docs/frontmatter-reference.md`, README minimum version |
| Files added, moved or removed | "Layout" above |
| `bench/` tasks, arms or method | `docs/development.md` "Benchmark"; re-run before quoting numbers |
| Install, test or release steps | `docs/development.md`, README |

Before finishing a change, re-read the row that applies and confirm the listed files agree with the new behaviour.
