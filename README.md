# frugal

Token-saving mode for Claude Code. Install it and every session and subagent gets a short set of rules for writing less code and less prose, with a `/frugal` switch, measured token stats and a benchmark you can re-run. It also ships an orchestration skill for long, multi-package jobs.

## Benchmark

### Against Ponytail and Honey (Opus, v0.5 rules)

Ponytail's own five open-ended prompts ("write me an email validator", "build me a countdown timer in React", and so on), one run each on Opus. Change against default Claude Code is the median over the five tasks; code lines are the total over the five.

| | Output tokens | Session cost | Time | Code lines written |
| :--- | ---: | ---: | ---: | ---: |
| Default Claude Code | baseline | baseline | baseline | 206 |
| **frugal 0.5** | **−70%** | **−34%** | **−59%** | **41** |
| Honey 1.4.0 | −67% | −42% | −59% | 57 |
| Ponytail 5.3.3 | −64% | −29% | −64% | 69 |

Code lines per task:

| Task | Default | frugal | Honey | Ponytail |
| :--- | ---: | ---: | ---: | ---: |
| Email validator (Python) | 58 | 3 | 11 | 16 |
| Debounce (JavaScript) | 44 | 7 | 8 | 9 |
| Sum a CSV column (Python) | 14 | 3 | 5 | 4 |
| Countdown timer (React) | 62 | 11 | 16 | 15 |
| Rate-limit a FastAPI endpoint | 28 | 17 | 17 | 25 |

This is a small sample: 20 sessions, one run per task, too few for a significance test. It shows frugal in the same range as the other two, not a reliable ranking. Honey was the cheapest per session. Caveman was not run; its rules cover prose only, not how much code to write.

How it was run:

- Each session is a real headless Claude Code run (`claude -p`, `--model opus`, Claude Code 2.1.332) in a fresh empty workspace, with file tools only and no user settings, rules, output style or MCP servers (`--setting-sources project --strict-mcp-config`).
- Each arm loads exactly one plugin with `--plugin-dir`, at its default full level: Ponytail at commit `ebd8654`, Honey at `cc82b7e`, frugal with the rules that shipped in 0.5. Before the run, a probe session per plugin confirms its instructions reached the model.
- The prompts are copied verbatim from Ponytail's benchmark config. The Honey and frugal arms see the same prompts.
- Code lines are the non-blank, non-comment lines in every file the session wrote or changed, or the code blocks in its reply if it wrote no file. Cost is Claude Code's own `total_cost_usd`, so it includes the tokens each plugin injects.
- These tasks have no tests; every session produced code, and nothing here measures whether the shorter code is better. Separately, the frugal 0.5 rules passed 18 of 18 checks on the unit-tested and explanation tasks, one run each on Opus, including a path-traversal check where the guard is implied but not asked for.
- Raw results, with every reply: [`bench/results/2026-11-17-opus-screen`](bench/results/2026-11-17-opus-screen/report.md) and [`bench/results/2026-11-17-opus-checks`](bench/results/2026-11-17-opus-checks/results.json). To re-run it, clone the two plugins into a sibling `token-savers/` directory and run:

```bash
node bench/run.js --stamp <name> --model opus --runs 1 --arms off,on,ponytail,honey \
  --tasks pt-email,pt-debounce,pt-csv,pt-countdown,pt-ratelimit
```

### Against default Claude Code (Sonnet, v0.4 rules)

117 real headless Claude Code sessions on Sonnet: 13 small tasks (code writing, bug fixes, explanations, a review) × 3 runs per arm, each in a fresh workspace with no user settings. Median change per task against default Claude Code:

| | Output tokens | Session cost | Time | Checks passed |
| :--- | ---: | ---: | ---: | ---: |
| Default Claude Code | baseline | baseline | baseline | 39/39 |
| **frugal** | **−30%** | **−3%** | **−24%** | 39/39 |
| frugal with its old long rules | −7% (ns) | +55% | −10% (ns) | 39/39 |

An earlier run with a one-line "Be concise." control measured that at −10% output and −3% cost.

That table measured the v0.4 rules, on Sonnet.

How to read it:

- Output and time drop by a quarter to a third. Cost barely moves, because output is a small share of what a session bills; most of it is input and cache.
- Rule length matters more than rule content. frugal first shipped a 1,700-token rule set, which this benchmark showed costing more than it saved. The rules that run measured were about 250 tokens; v0.5's are about 450.
- Every arm passed every check (unit tests for code, required facts for explanations), so these tasks are too easy to show a quality difference in either direction.
- Not measured: long multi-turn sessions, tasks that run shell commands, and a multi-run benchmark of the 0.5 rules.

`(ns)` means not statistically significant. Cost is Claude Code's own figure for the whole session, including what frugal injects. Reports and raw results: [`bench/results/`](bench/results/). Reproduce with `node bench/run.js --stamp <name>`; see [`docs/development.md`](docs/development.md).

## Install

```bash
claude plugin marketplace add MateiSR/frugal
claude plugin install frugal@frugal
```

Requires Claude Code v2.1.296 or later and Node.js on your `PATH`. Frugal mode is on as soon as the plugin is installed.

## Frugal mode

### The rules

One short file, [`rules/frugal.md`](rules/frugal.md):

- **Least code** — take the first that works: no code, a helper already in the repo, the standard library, an installed dependency, one line, the minimum block.
- **Smallest version** — a vague request gets the version that does the core job. No options, wrappers, extra files, demo code or "for later" code nobody asked for; comments only for a why the code cannot show.
- **Finish the change, fix the cause** — update the callers and tests the change breaks, and check the other callers of the function you change.
- **Keep what makes code safe** — validation at trust boundaries, error handling that prevents data loss, security, accessibility, public names, anything the user asked for.
- **Brief replies** — answer first, no preamble or narration, no repeating code already written to a file, one closing line on what was left out or not checked, a fuller explanation when asked or when brevity would hide a risk. Code, identifiers, commands and errors stay exact.
- **Read less** — search before reading, never re-read unchanged files.

### When they are injected

| Moment | Hook | What is sent |
| :--- | :--- | :--- |
| Session start, resume, `/clear`, after compaction | `SessionStart` | The rules (about 450 tokens) |
| A subagent starts | `SubagentStart` | The rules, except to agents that only locate, plan or look |
| The mode was switched mid-session | `UserPromptSubmit` | The rules once (on), or a one-line "disregard them" (off) |

Nothing is added on ordinary prompts, and nothing at all when the mode is off. This is done with hooks rather than a skill or your `CLAUDE.md`, so it reaches subagents and is removed when you uninstall.

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

The most specific setting wins: session, then project, then global. With nothing set, the mode is on. The reply comes from a hook, so it spends no model tokens.

### Stats

```text
Frugal stats · this session
  main          41 msgs · out 52.0k · in 88 · cache write 128.8k · cache read 4.36M
  subagents     22 msgs · out 31.2k · in 44 · cache write 302.0k · cache read 1.20M
  frugal added ≈530 input tokens (rules ×1, subagent rules ×1, off notices ×0; estimated at 4 chars per token, before caching)
  savings: not enough data to compare (need 20+ messages each with frugal on and off; have 41 on, 0 off)
```

- Token counts are read from Claude Code's own session transcripts, so they are measured.
- "frugal added" is the plugin's own overhead, estimated from the size of the text it injected.
- Savings are shown only as an observed comparison of output tokens per message with the mode on and off, once there are at least 20 messages of each. There is no assumed percentage. The sessions being compared ran different tasks, so read it as an indication; the benchmark above is the controlled number.
- Nothing about stats is added to the model's context. The hook writes one short line per event to `~/.claude/frugal/log.jsonl` and computes the rest when you ask.

State and the log live in `~/.claude/frugal/` and are left in place if you uninstall.

## Orchestration

```text
/frugal:orchestrate <task> [models=all|opus,sonnet,haiku,fable] [top=few|none|free] [stops=plan|each|end] [commits=package|none]
```

Defaults: `models=all`, `top=few`, `stops=plan`, `commits=package`. Commits are local only; it never pushes. This part is not benchmarked.

0. **Bootstrap** — adds `.claude/worktrees/` and `.orchestrate/` to the clone's local `.git/info/exclude`. If the repo's `CLAUDE.md` has no Execution Constraints section, a researcher drafts one into `.orchestrate/CONSTRAINTS.md` for you to correct.
1. **Research** — parallel read-only `researcher` agents over disjoint slices.
2. **Plan** — written to `.orchestrate/PLAN.md` with streams, packages and Done Contracts; stops for approval by default.
3. **Warm streams** — each `stream-worker` takes a sequence of packages and is resumed with `SendMessage`, keeping its 1-hour prompt cache. Parallel worktrees only for substantial, disjoint work.
4. **Merge** — worktree branches merged one at a time.
5. **Acceptance** — a fresh `reviewer` runs the real end-to-end checks.

| Agent | Model / effort | Why it is a subagent |
| :--- | :--- | :--- |
| `frugal:stream-worker` | `opus` / `high`, 1h cache | Parallel work in its own worktree, isolated from the planner |
| `frugal:researcher` | `sonnet` / `medium` | Cheaper model, read-only tools, absorbs bulk reading |
| `frugal:visual-verifier` | `opus` / `medium` | Keeps image tokens out of the worker's context |
| `frugal:reviewer` | `fable` / `medium` | Independent of the code's author; blockers at confidence `>= 75` only |

`/frugal:debug` is a skill, not an agent: a root-cause method the worker follows when a bug survives two fixes. You can also invoke it yourself.

Optional: merge `templates/settings-snippet.json` into `~/.claude/settings.json` so worktrees branch from your local HEAD, and use `templates/project-CLAUDE-snippet.md` to write a repo's Execution Constraints by hand. Leave `subagentPromptCacheTtl` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` unset.

## Develop

```bash
claude plugin validate .
claude --plugin-dir .
node bench/run.js --selftest
```

See [`docs/`](docs/) for how the mode, the orchestration, the benchmark and the release process work.

## Update

```bash
claude plugin update frugal@frugal
```

Then `/reload-plugins` in any open session.

## License

MIT. The rules are adapted from the `honey` skill of [Honey for Devs](https://github.com/Green-PT/honey-for-devs) (MIT), with several sentences from [Ponytail](https://github.com/DietrichGebert/ponytail) (MIT); see `NOTICE`. The hook design follows the approach used by Honey, Caveman and Ponytail, and the benchmark method borrows from Honey's and Ponytail's.
