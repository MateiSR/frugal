# streamkit

Claude Code plugin for running a large, multi-package milestone as a flat, warm-stream orchestration: the main session plans and schedules, a small set of pinned subagents do the reading, coding, debugging, visual checks and acceptance review.

## What it does

`/streamkit:orchestrate` runs a bootstrap step and five phases:

0. **Bootstrap** — adds local git ignores and, if the repo has no Execution Constraints, schedules a researcher to draft them.
1. **Research** — parallel read-only `researcher` agents over disjoint slices.
2. **Plan** — the orchestrator writes `.orchestrate/PLAN.md` with streams, packages and Done Contracts, then stops for approval (by default).
3. **Warm streams** — each `stream-worker` takes a sequence of packages and is resumed with `SendMessage`, so it keeps its 1-hour prompt cache. Parallel worktrees only for substantial, disjoint work.
4. **Merge** — worktree branches merged one at a time.
5. **Acceptance** — a fresh `reviewer` runs the real end-to-end checks against the Done Contracts.

## Agents

| Agent | Model / effort | Cache TTL | Role |
| :--- | :--- | :--- | :--- |
| `streamkit:stream-worker` | `opus` / `high` | `1h` | Implements a sequential stream of packages; resumed via `SendMessage` |
| `streamkit:researcher` | `sonnet` / `high` | default | Read-only code, docs, web and log sweeps |
| `streamkit:debugger` | `opus` / `high` | default | Read-only root-cause investigation, only after a worker fails twice on one bug |
| `streamkit:visual-verifier` | `opus` / `high` | default | Inspects screenshots and renders; skips `CLAUDE.md` (`omitClaudeMd: true`) |
| `streamkit:reviewer` | `fable` / `medium` | default | Independent acceptance review; reports only blockers with confidence `>= 75` |

## Install

```bash
claude plugin marketplace add MateiSR/streamkit
claude plugin install streamkit@streamkit
```

Or, inside a session: `/plugin marketplace add MateiSR/streamkit`, then `/plugin install streamkit@streamkit`.

Requires Claude Code v2.1.296 or later (for the `autoCompactWindow`, `omitClaudeMd` and `experimental.cacheTtl` agent fields).

### Per-machine setup

Plugins cannot ship a `CLAUDE.md` or user settings, so two things are copied by hand:

- `templates/CLAUDE.md` → `~/.claude/CLAUDE.md` (append if you already have one). Always-on rules for writing less code and less prose, seen by every session and subagent.
- `templates/settings-snippet.json` → merge into `~/.claude/settings.json`. Sets `worktree.baseRef` to `head`, so worktree streams branch from your local HEAD, including unpushed commits.

Leave `subagentPromptCacheTtl` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` unset: the agents set their own cache TTL, and agent teams would launch named subagents as teammates.

### Per-project setup

None required. On each run the skill:

- adds `.claude/worktrees/` and `.orchestrate/` to the clone's local `.git/info/exclude` (no tracked file changes);
- if the repo's `CLAUDE.md` has no **Execution Constraints** section, has a researcher draft one into `.orchestrate/CONSTRAINTS.md`, shows it in the plan for correction, and offers to add it to `CLAUDE.md` at the end.

To set the constraints yourself instead, copy `templates/project-CLAUDE-snippet.md` into the repo's `CLAUDE.md` and fill it in. `templates/gitignore-snippet` is there if you want the ignores committed.

## Usage

```text
/streamkit:orchestrate <task> [models=all|opus,sonnet,haiku,fable] [top=few|none|free] [stops=plan|each|end] [commits=package|none]
```

Defaults: `models=all`, `top=few`, `stops=plan`, `commits=package`. Commits are local only; the plugin never pushes.

## Develop

```bash
claude plugin validate .
claude --plugin-dir .
```

## Update

Bump `version` in `.claude-plugin/plugin.json` on every release, push, then on each machine:

```bash
claude plugin update streamkit@streamkit
```

Run `/reload-plugins` in any session that is already open.

## License

MIT. `templates/CLAUDE.md` is adapted from the `honey` skill of [Honey for Devs](https://github.com/Green-PT/honey-for-devs) (MIT); see `NOTICE`.
