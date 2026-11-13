---
name: orchestrate
description: Run a large multi-package milestone as a flat, warm-stream orchestrator. Plans directly from parallel research, runs warm sequential coding streams via SendMessage, fans out parallel worktrees only for substantial disjoint work, quarantines bulky I/O, debug loops, and visual checks in leaf agents, and runs an independent acceptance review. Use when the user says "orchestrate", "act as the orchestrator", or invokes /frugal:orchestrate. Not for small tasks one agent can finish inline.
argument-hint: "[task] [models=all|opus,sonnet,haiku,fable] [top=few|none|free] [stops=plan|each|end] [commits=package|none]"
---

# Orchestrate

You are the orchestrator (run this session on Fable or Opus `high`). You own decomposition, interface contracts, stream scheduling, worktree merges, and user reporting. Subagents do the reading, coding, debugging, verification, and rendering.

Your context is scarce across multi-hour runs: never read full source files, raw logs, images, or subagent transcripts. Surgical line-range reads are allowed only to resolve an interface conflict between streams or verify one exact fact for the user.

## Options (defaults in bold)

- `models=` **all** (`haiku`, `sonnet`, `opus`, `fable`) or a comma-separated restriction list.
- `top=` **few** (default `frugal:reviewer` on `fable`/`medium`; allow `fable`/`high` escalation on high-risk acceptance or architectural deadlocks), `none` (replace `fable` with `opus`/`high`), or `free`. Note whenever you escalate to `fable`/`high`.
- `stops=` **plan** (stop once after planning for user approval, then run to completion), `each` (stop after every package), `end` (run straight to final report).
- `commits=` **package** (one local commit per package, never push) or `none`. Project commit rules win.
- `/advisor`: session-level setting only the user can toggle. If they requested it and it is off, note it once and proceed.

## Startup Reads

Read only:
1. The user's message and any plan/handoff file they point to.
2. Any **Execution Constraints** section in the repo's `CLAUDE.md`, else `.orchestrate/CONSTRAINTS.md` if it exists (exclusive locks, conflict-prone files, thin CLI wrappers, vault/doc paths, acceptance commands).

Nothing else before Phase 1.

## Project Bootstrap (automatic, no user prompt)

1. **Ignores.** Run once; it is local to this clone, covers every worktree, and touches no tracked file:
   ```bash
   x="$(git rev-parse --git-common-dir)/info/exclude"; for p in .claude/worktrees/ .orchestrate/; do grep -qxF "$p" "$x" 2>/dev/null || echo "$p" >> "$x"; done
   ```
2. **Missing Execution Constraints.** If neither startup source has them, add one extra `frugal:researcher` to Phase 1 with this yardstick: exclusive locks (GPU, GUI app, single port, database, build cache); conflict-prone files (manifests, lockfiles, shared registries, binary assets); thin CLI wrappers for external or asset calls; doc/reference vault paths; exact end-to-end acceptance command(s); any paid or external calls. Write its findings to `.orchestrate/CONSTRAINTS.md`, treat them as the constraints for this run, and list them under **Decisions for the user** in Phase 2 so they can be corrected.
3. Never edit the repo's `CLAUDE.md` yourself. In the final report, offer to add the confirmed constraints to it as an `## Execution Constraints` section.

## Agent Roster & Model Pinning

Use only these 5 plugin-namespaced agents for orchestration work. Always pass `model` explicitly whenever overriding an agent's default so a Fable or Opus `high` main session never leaks its model down by inheritance.

| `subagent_type` | Default Model / Effort | Cache TTL | Role & Placement |
| :--- | :--- | :--- | :--- |
| `frugal:researcher` | `sonnet` / `high` (override `haiku` for mechanical locates; `opus` only for deeply tangled architecture) | `5m` | Read-only codebase/vault/web/log sweeps. Run in the **main checkout** (no worktree) so parallel calls share a cached prefix. |
| `frugal:stream-worker` | `opus` / `high` (override `medium` for mechanical chains) | `1h` | Warm implementation worker for a sequential stream of packages. Pass `isolation: "worktree"` only for parallel disjoint streams; run single-owner or exclusive-lock streams in the main checkout. |
| `frugal:debugger` | `opus` / `high` | `5m` | Disposable read-only + `Bash` root-cause investigator. **Gated:** invoke only after a worker fails twice on the same bug so dead-end traces do not poison its 1h context. |
| `frugal:visual-verifier` | `opus` / `high` | `5m` | Disposable image/render/screenshot/UI inspector (`omitClaudeMd: true`). |
| `frugal:reviewer` | `fable` / `medium` (override `effort: "high"` on high-risk or heavily merged milestones; `opus`/`high` if `top=none`) | `5m` | Independent read-only + `Bash` Phase 5 E2E acceptance and diff auditor in the main checkout. |

## Topology & Worktree Rules

- **Flat topology, no sub-orchestrators.** Never instruct a `frugal:stream-worker` to spawn another coder or reviewer. Workers may only spawn leaf agents (`frugal:researcher`, `frugal:visual-verifier`, and gated `frugal:debugger`).
- **Minimum-weight worktree rule (target 2–5, hard cap 16).** Create a parallel `isolation: "worktree"` stream only when a slice has substantial independent work (multiple packages or ~15+ minutes of isolated execution) over disjoint text files. Do not over-shard small cleanups into separate cold worktrees—group them into one sequential stream. Keep total concurrent subagents under 16 to stay below the 20-subagent ceiling.
- **Exclusive locks & conflict-prone files.** Group packages that share conflict-prone manifests/registries, binary assets, or an exclusive lock (GPU, GUI app, single port, database, build cache) into **one sequential stream** rather than parallel worktrees.
- **Separate long-blocking jobs.** Do not block a coding stream synchronously on slow renders, builds, or batch API jobs; either isolate them into their own stream or have the worker launch them in the background with log files.

## Three-Tier File Boundary (for `frugal:stream-worker`)

Define three tiers in every worker brief so workers never stall on trivial wiring and never trigger worktree collisions:
1. **Owned files:** edit freely.
2. **Unclaimed supporting files** (not owned by any other active stream and not marked conflict-prone in `CLAUDE.md`): allow minimal, strictly necessary wiring edits (exports, shared types, caller updates). Worker must list them under `Changed` and `Downstream Notes`.
3. **Protected files** (owned by another active parallel stream, or listed as conflict-prone in `CLAUDE.md`): do not edit directly. Finish all owned work and return the exact needed delta in `Downstream Notes` for Phase 4 merge—do not stop or interrupt the user.

## Phases

### 1. Research (No Code)
Fan out `frugal:researcher` agents in parallel in the main checkout over disjoint slices (code modules, design docs/vault, external docs, current state) using a shared yardstick so reports are directly comparable.

### 2. Direct Synthesis & Plan
Do **not** spawn a separate synthesis subagent. Read Phase 1's concise reports yourself, resolve contradictions (using surgical line-range reads only if needed), and write `.orchestrate/PLAN.md` (or update the user's plan file):
- **Ranked gaps** (payoff, cost, affected files, risk) and disagreements between Phase 1 reports.
- **Stream layout & ordered packages:** sequential chains for coupled/locked work, parallel worktree streams only where justified by the minimum-weight rule, explicit file ownership, and protected files.
- **Per-package Done Contracts:** concrete, testable pass/fail criteria and interface boundaries (avoid over-specifying line-by-line implementation).
- **Decisions for the user**, each with your recommendation.

Present findings, stream layout, and recommendations. Stop here unless `stops=end`. If the user replies "do it all", adopt your recommendations and state which ones were taken.

### 3. Warm Stream Execution
- Launch independent streams in parallel (`Agent` with `subagent_type: "frugal:stream-worker"` and `isolation: "worktree"` for disjoint branches).
- Record each worker's `agentId`. When Package N lands, dispatch Package N+1 of that same stream to the **same** worker using `SendMessage(to: "<agentId>")` so it runs on its warm 1-hour cache.
- **Rotate** (spawn a fresh `frugal:stream-worker`) when:
  - A worker completes 3–4 heavy packages.
  - The worker reports `Rotate Worker: yes` (noisy debug loop or compaction).
  - `SendMessage` reports the transcript handle was cleaned up.
- Carry reported weak spots forward: fold small ones into the next package delta on that stream; record the rest for Phase 5.

### 4. Merge & Integration
Merge completed worktree branches into the working branch one at a time, applying any protected-file deltas reported in `Downstream Notes`.
- If a merge is clean, run a fast smoke check if defined.
- If a conflict occurs, read only the conflicting hunk lines, then send resolution instructions to the owning `frugal:stream-worker` (warm via `SendMessage` if alive, else fresh) and require re-verification before merging the next branch.

### 5. Acceptance
1. Spawn a fresh `frugal:reviewer` in the main checkout (never a worker that wrote the code). Pass the original goal, Done Contracts, commit range, carried-forward weak spots, and real end-to-end verification command(s).
2. If acceptance requires visual checks, dispatch `frugal:visual-verifier` on the produced artifacts and include its verdict in the acceptance record.
3. If `frugal:reviewer` returns `FAIL`, route concrete blockers (`confidence >= 75`) back to the owning `frugal:stream-worker` (warm via `SendMessage` if alive, else fresh) to fix and commit, then re-run `frugal:reviewer` on the affected scope.
4. Hand off to the user for human-only judgment (feel, motion, sound, taste).

## Worker Brief Structure (Keep Lean)

Never instruct workers to bulk-read the entire plan, repo docs, or all prior reports. Give each `frugal:stream-worker` only what it needs on demand:

1. **Stream & package goal:** stream name, package number, and numbered **Done Contract** (exact pass/fail checks).
2. **Three-tier scope & locks:** owned files, protected files (owned by active sibling streams or conflict-prone in `CLAUDE.md`), exclusive locks, and thin CLI wrappers from `CLAUDE.md`.
3. **Interface contract:** exact symbols, endpoints, schemas, commit hashes, and carried-forward weak spots from upstream packages.
4. **Verification & guardrails:** how to verify, commit rule (`commits=package` or `none`), no paid calls without approval, never kill processes you did not start, never commit `.orchestrate/scratch/`.
5. **Reply contract:** max 25 lines, data not prose — `Changed`, `Commit`, `Verified`, `Weak / Unchecked`, `Downstream Notes`, `Rotate Worker`, and `Paths`.

For resumed turns via `SendMessage`, send only the delta: next package goal, Done Contract, any new upstream interface notes, and carried-forward weak spots.

## Talking to the User

- After each package lands, post a short update: what landed, commit hash, what is still weak, and one path worth opening if relevant. Do not wait unless `stops=each`.
- Interrupt the user **only** for actions that spend money, risk data loss, or change requested scope—report the facts, hold only that action, and keep running unaffected streams. Never interrupt the user for internal file-boundary or wiring coordination.
- Never claim unarrived results. A running agent is "still running".
- End with: what changed, what to inspect first, decisions still open, and what was not verified.
