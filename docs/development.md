# Development

## Test a change

```bash
claude plugin validate .
```

Must end with `Validation passed`. The "no icon" notice is about the public plugin directory and can be ignored.

### Static rule copies

Generated copies of `rules/frugal.md` must stay in sync with the source file:

```bash
node scripts/build-rules.js          # regenerate static rule copies
node scripts/build-rules.js --check  # verify copies match rules/frugal.md (exits non-zero on drift)
node scripts/test-install.js         # test scripts/install.js in a temporary HOME/XDG dir
node scripts/test-hooks.js           # test hooks (Claude, Codex, Copilot, Cursor), Cursor merger, OpenCode, Pi
node scripts/test-bench-multi.js     # test multi-turn benchmark loop with a stub claude executable
agy plugin validate plugins/antigravity --strict
gemini extensions validate .
```

### Hooks

Run the script directly against a throwaway state directory, so your real `~/.claude/frugal/` is untouched:

```bash
export FRUGAL_DIR=$(mktemp -d)
echo '{"session_id":"s1","cwd":"/tmp/p","source":"startup"}' | node hooks/frugal.js session    # rules as JSON
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"hello"}'   | node hooks/frugal.js prompt     # nothing
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"/frugal off"}' | node hooks/frugal.js prompt # {"decision":"block",...}
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"hello"}'   | node hooks/frugal.js prompt     # "disregard" notice
echo '{"session_id":"s1","cwd":"/tmp/p","agent_type":"frugal:visual-verifier"}' | node hooks/frugal.js subagent  # nothing
echo 'not json' | node hooks/frugal.js session; echo $?                                        # 0, no output
unset FRUGAL_DIR
```

### In a real session

```bash
claude --plugin-dir .
```

Headless (run from another directory):

```bash
claude --plugin-dir /path/to/frugal --model haiku --debug-file /tmp/frugal-debug.log \
  -p "Quote the first line of any frugal mode instructions you were given, or say none."
grep -i 'plugin frugal\|hook' /tmp/frugal-debug.log | head
```

Expect `Loaded 4 agents`, `Loaded 4 skills` and the hooks registering.

The orchestration flow has no automated test. To exercise it, run `/frugal:orchestrate` on a small throwaway repo with `stops=each`.

## Benchmark

```bash
node bench/run.js --selftest                      # free: every test (single-turn and multi-turn) must pass its reference solution and fail its starter
node bench/run.js --multi --dry --model opus      # free: print multi-turn conversation plan and turn-session count
node bench/run.js --multi --stamp <name> --model opus --arms off,on --yes   # multi-turn tier (bench/conversations.js); counts each turn against the 20-session guard
node bench/run.js --stamp smoke --model haiku --runs 1 --tasks flatten,cache   # cheap wiring check; never quote it
node bench/run.js --stamp <name> --model opus --screen --arms off,on,v-<variant> --dry   # free: print how many new sessions it would start
node bench/run.js --stamp <name> --model opus --screen --arms off,on,v-<variant>         # screening: 1 run of 8 tasks per arm; never quote it
node bench/run.js --stamp <date>-<model> --model sonnet --runs 3 --workers 6   # full run, about 15 minutes
node bench/report.js <stamp>                      # free: re-render report.md from results.json
node bench/judge.js --out <stamp> --from <stamp>,<stamp> --arms off,on,ponytail,honey --dry   # blind quality review of saved results; one call per task per pass
node bench/judge.js --via agy --out <stamp> --from <stamp>,<stamp> --arms off,on,ponytail,honey --dry   # second judge through the Antigravity CLI
node bench/agree.js bench/results/<stamp-a>/judge.jsonl bench/results/<stamp-b>/judge.jsonl   # free: inter-judge rank agreement and Spearman correlation
node bench/draw.js assets                         # free: redraw the README banner and charts (numbers are typed in at the top of the file)
```

- Runs use the Claude subscription login; `ANTHROPIC_API_KEY` is removed from the child environment unless you pass `--api-key`.
- Arms are defined in `bench/run.js` (`ARMS`, `ARM_ENV`). To test a rules change, add a file under `bench/variants/` and an arm that points `FRUGAL_RULES` at it. The `full` arm does this for the long rules shipped before v0.4.
- Finished sessions are cached in `bench/.cache/` (git-ignored), keyed by model, task, arm, what the arm injects (rules file and hook, or rival commit), CLI version and run number. Re-running a command reuses them, so a stopped run resumes and an edited variant costs only its own arm. Delete the directory to force fresh sessions.
- A run that would start more than 20 new sessions stops unless you pass `--yes`. Screen variants first, then run the winner on all tasks, then 3 runs only for what ships.
- `bench/judge.js` reads the first run of each arm from the stamps given (reply plus the files the session wrote), shows them to the judge under shuffled letters and appends each verdict to `judge.jsonl` in the `--out` stamp. Pass `--via agy` (with `--model`, default `gemini-4-neon-high`) to send the same blind prompt and letter shuffle through `agy -p` in an empty temporary directory; it reports no cost, so `cost_usd` is null. Globally installed `agy` plugins and `~/.gemini/GEMINI.md` still load. Compare two judges with `bench/agree.js`. A rules change must be judged as well as measured: the 0.6 rules had the best savings and the worst review.
- A stamp directory is never overwritten. Commit `results.json` and `report.md`; any number in the README must come from a committed stamp.
- The method (paired medians, exact Wilcoxon test, arm-contamination check) is described at the top of `bench/report.js` and `bench/run.js`.

## Release

1. Update `.claude/CLAUDE.md` and `docs/` per the table in `.claude/CLAUDE.md`.
2. Bump `version` to the same value in `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.github/plugin/plugin.json`, `plugins/antigravity/plugin.json`, `gemini-extension.json` and `package.json` (semver). Do not add `version` to a marketplace entry.
3. `claude plugin validate .`
4. Commit and push to `main`.
5. On each machine: `claude plugin update frugal@frugal`, then `/reload-plugins` in open sessions.

## First install on a new machine

```bash
claude plugin marketplace add MateiSR/frugal
claude plugin install frugal@frugal
```
