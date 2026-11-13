# frugal

Token-saving mode for Claude Code. Install it and every session and subagent gets a compact set of rules for writing less code and less prose, with a `/frugal` switch and measured token stats. It also ships an orchestration skill for long, multi-package jobs.

## What you get

- **Frugal mode** — always-on rules injected by hooks, not by a skill Claude has to remember to load and not by editing your `CLAUDE.md`.
- **`/frugal`** — turn the mode on or off for a session, a project or the whole machine, and see what it costs and saves. Answered by a hook, so it spends no model tokens.
- **`/frugal:orchestrate`** — runs a large milestone as a planner plus five pinned subagents, keeping the main session's context small.

## Install

```bash
claude plugin marketplace add MateiSR/frugal
claude plugin install frugal@frugal
```

Requires Claude Code v2.1.296 or later and Node.js on your `PATH`. Frugal mode is on as soon as the plugin is installed.

## Frugal mode

### The rules

One file, [`rules/frugal.md`](rules/frugal.md):

- **Less code** — a ladder to walk before writing anything: does it need to exist, is it already in the repo, stdlib, language native, installed dependency, one line, minimum block. Fix the cause rather than the symptom, mark deliberate shortcuts with a `shortcut:` comment, generate bulk instead of typing it.
- **Never cut** — input validation, error handling that prevents data loss, security, accessibility, user-facing design, public names, anything explicitly asked for.
- **Less prose** — answer first, no wind-up or hedging, no narration of readable code. Code, identifiers, commands and error messages stay exact; no invented abbreviations.
- **Less input** — locate before reading, outline before bodies, never re-read unchanged files, aggregate in code.

### When they are injected

| Moment | Hook | What is sent |
| :--- | :--- | :--- |
| Session start, resume, `/clear`, after compaction | `SessionStart` | The full rules (about 1,700 tokens) |
| A subagent starts | `SubagentStart` | The full rules, except to `visual-verifier` |
| Every prompt | `UserPromptSubmit` | A one-line reminder (about 35 tokens) |
| The mode was switched mid-session | `UserPromptSubmit` | The full rules once (on), or a one-line "disregard them" (off) |

When the mode is off, nothing is injected.

### `/frugal`

```text
/frugal                    show whether the mode is on here, and why
/frugal off                off for this session
/frugal on                 on for this session
/frugal off project        off for this project, until changed
/frugal on project
/frugal off global         off on this machine, until changed
/frugal on global
/frugal stats              token usage for this session
/frugal stats all          token usage for every session frugal has seen
```

The most specific setting wins: session, then project, then global. With nothing set, the mode is on.

### Stats

```text
Frugal stats · this session
  main          41 msgs · out 52.0k · in 88 · cache write 128.8k · cache read 4.36M
  subagents     22 msgs · out 31.2k · in 44 · cache write 302.0k · cache read 1.20M
  frugal added ≈5308 input tokens (rules ×2, subagent rules ×1, reminders ×3; estimated at 4 chars per token, before caching)
  savings: not enough data to compare (need 20+ messages each with frugal on and off; have 41 on, 0 off)
```

- Token counts are read from Claude Code's own session transcripts, so they are measured.
- "frugal added" is the plugin's own overhead, estimated from the size of the text it injected.
- Savings are shown only as an observed comparison of output tokens per message with the mode on and off, once there are at least 20 messages of each. There is no assumed percentage. Sessions run on different tasks, so read it as an indication.
- Nothing about stats is added to the model's context. The hook writes one short line per event to `~/.claude/frugal/log.jsonl` and computes the rest when you ask.

State and the log live in `~/.claude/frugal/` and are left in place if you uninstall.

## Orchestration

```text
/frugal:orchestrate <task> [models=all|opus,sonnet,haiku,fable] [top=few|none|free] [stops=plan|each|end] [commits=package|none]
```

Defaults: `models=all`, `top=few`, `stops=plan`, `commits=package`. Commits are local only; it never pushes.

0. **Bootstrap** — adds `.claude/worktrees/` and `.orchestrate/` to the clone's local `.git/info/exclude`. If the repo's `CLAUDE.md` has no Execution Constraints section, a researcher drafts one into `.orchestrate/CONSTRAINTS.md` for you to correct.
1. **Research** — parallel read-only `researcher` agents over disjoint slices.
2. **Plan** — written to `.orchestrate/PLAN.md` with streams, packages and Done Contracts; stops for approval by default.
3. **Warm streams** — each `stream-worker` takes a sequence of packages and is resumed with `SendMessage`, keeping its 1-hour prompt cache. Parallel worktrees only for substantial, disjoint work.
4. **Merge** — worktree branches merged one at a time.
5. **Acceptance** — a fresh `reviewer` runs the real end-to-end checks.

| Agent | Model / effort | Role |
| :--- | :--- | :--- |
| `frugal:stream-worker` | `opus` / `high`, 1h cache | Implements a sequential stream of packages |
| `frugal:researcher` | `sonnet` / `high` | Read-only code, docs, web and log sweeps |
| `frugal:debugger` | `opus` / `high` | Root-cause investigation after a worker fails twice on one bug |
| `frugal:visual-verifier` | `opus` / `high` | Inspects screenshots and renders |
| `frugal:reviewer` | `fable` / `medium` | Independent acceptance review; blockers at confidence `>= 75` only |

Optional: merge `templates/settings-snippet.json` into `~/.claude/settings.json` so worktrees branch from your local HEAD, and use `templates/project-CLAUDE-snippet.md` to write a repo's Execution Constraints by hand. Leave `subagentPromptCacheTtl` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` unset.

## Develop

```bash
claude plugin validate .
claude --plugin-dir .
```

See [`docs/`](docs/) for how the mode, the orchestration and the release process work.

## Update

```bash
claude plugin update frugal@frugal
```

Then `/reload-plugins` in any open session.

## License

MIT. `rules/frugal.md` is adapted from the `honey` skill of [Honey for Devs](https://github.com/Green-PT/honey-for-devs) (MIT); see `NOTICE`. The hook design follows the approach used by Honey, Caveman and Ponytail.
