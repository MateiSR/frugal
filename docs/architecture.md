# Architecture

## Goal

Run a multi-hour milestone without the main session's context filling up. The orchestrator plans, schedules and merges; it never reads full source files, raw logs or images. Subagents absorb that volume and reply in a fixed, line-capped format.

## Phases

0. **Project bootstrap** — automatic. Adds local git ignores and, if the repo has no Execution Constraints, schedules a researcher to draft them.
1. **Research** — parallel `researcher` agents in the main checkout, disjoint slices, shared yardstick.
2. **Plan** — the orchestrator synthesises the reports itself and writes `.orchestrate/PLAN.md`. Stops for approval unless `stops=end`.
3. **Warm stream execution** — one `stream-worker` per stream, resumed with `SendMessage` for each next package.
4. **Merge** — worktree branches merged one at a time; protected-file deltas applied here.
5. **Acceptance** — a fresh `reviewer` runs the real end-to-end commands; `visual-verifier` if artifacts are visual.

## Agents and why they are configured this way

| Agent | Model / effort | Notable frontmatter | Reason |
| :--- | :--- | :--- | :--- |
| `stream-worker` | `opus` / `high` | `experimental.cacheTtl: "1h"`, `autoCompactWindow: 250000`, no web tools | Resumed across packages, so a long cache TTL pays off; gaps between packages can exceed 5 minutes |
| `researcher` | `sonnet` / `high` | read-only tools plus web, `maxTurns: 25` | Cheap bulk reading; parallel calls in the main checkout share a cached prefix |
| `debugger` | `opus` / `high` | no edit tools, `maxTurns: 25` | Disposable, so dead-end hypotheses never enter the worker's long-lived context |
| `visual-verifier` | `opus` / `high` | `Read`, `Glob` only, `omitClaudeMd: true`, `maxTurns: 6` | Image tokens stay out of workers; coding rules are irrelevant to it |
| `reviewer` | `fable` / `medium` | no edit tools, `maxTurns: 30` | Independent of the code's author; strongest model where a miss is most expensive |

Only `stream-worker` sets a cache TTL. The others use the default, because they are single-use.

## Design decisions

- **Flat topology.** Nesting is allowed by Claude Code (three layers), but sub-orchestrators multiply context and hide state. Workers may spawn only `researcher`, `visual-verifier` and, after two failed fixes, `debugger`.
- **Warm streams over fresh agents.** Coupled packages go to the same worker in sequence. Rotate after 3–4 heavy packages, on `Rotate Worker: yes`, or when the transcript is gone.
- **Worktrees are the exception.** Only for substantial, disjoint work (target 2–5 streams, hard cap 16 concurrent subagents). Anything sharing a lock or a conflict-prone file is serialised in one stream.
- **Three-tier file boundary.** Owned files are edited freely; unclaimed supporting files get minimal wiring edits and are declared; protected files are never edited, the delta is returned for the merge phase. This keeps workers from stalling and from colliding.
- **Two-attempt debug circuit breaker.** Routine bugs are fixed inline. A second failed attempt on the same bug hands off to `debugger`.
- **Confidence-gated review.** The reviewer reports blockers only at confidence `>= 75`, so acceptance does not loop on nits.
- **No synthesis agent.** The orchestrator reads the short research reports directly; a middleman would lose detail.
- **Efficiency rules live outside the plugin.** Plugins cannot ship a `CLAUDE.md`, and rules inside the skill would reach only the orchestrator. `templates/CLAUDE.md` is copied to the user's global config so workers see it too.

## Project bootstrap

Two things used to be manual per repo and are now done by the skill at startup:

- **Ignores** are appended to `<git-common-dir>/info/exclude`, which is local, shared by all worktrees and touches no tracked file.
- **Execution Constraints** (locks, conflict-prone files, CLI wrappers, doc vaults, acceptance commands, paid-call policy) are drafted by a Phase 1 researcher into `.orchestrate/CONSTRAINTS.md` when the repo's `CLAUDE.md` has no such section. The draft is shown in the plan for approval. The skill never edits the repo's `CLAUDE.md` on its own; it offers to promote the section in the final report.

`templates/project-CLAUDE-snippet.md` remains for users who prefer to write the section by hand.
