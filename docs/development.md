# Development

## Test a change

```bash
claude plugin validate .
```

Must end with `Validation passed`. The "no icon" notice is about the public plugin directory and can be ignored.

### Hooks

Run the script directly against a throwaway state directory, so your real `~/.claude/frugal/` is untouched:

```bash
export CLAUDE_CONFIG_DIR=$(mktemp -d)
echo '{"session_id":"s1","cwd":"/tmp/p","source":"startup"}' | node hooks/frugal.js session    # rules as JSON
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"hello"}'   | node hooks/frugal.js prompt     # one-line reminder
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"/frugal off"}' | node hooks/frugal.js prompt # {"decision":"block",...}
echo '{"session_id":"s1","cwd":"/tmp/p","prompt":"hello"}'   | node hooks/frugal.js prompt     # "disregard" notice
echo '{"session_id":"s1","cwd":"/tmp/p","agent_type":"frugal:visual-verifier"}' | node hooks/frugal.js subagent  # nothing
echo 'not json' | node hooks/frugal.js session; echo $?                                        # 0, no output
unset CLAUDE_CONFIG_DIR
```

Check `rules/frugal.md` is still under the injection cap:

```bash
wc -m rules/frugal.md    # keep below 9900
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

Expect `Loaded 5 agents`, `Loaded 2 skills` and the hooks registering.

The orchestration flow has no automated test. To exercise it, run `/frugal:orchestrate` on a small throwaway repo with `stops=each`.

## Benchmark

```bash
node bench/run.js --selftest                      # free: every test must pass its reference solution and fail its starter
node bench/run.js --stamp smoke --model haiku --runs 1 --tasks flatten,cache   # cheap wiring check; never quote it
node bench/run.js --stamp <date>-<model> --model sonnet --runs 3 --workers 6   # full run, about 15 minutes
node bench/report.js <stamp>                      # free: re-render report.md from results.json
```

- Runs use the Claude subscription login; `ANTHROPIC_API_KEY` is removed from the child environment unless you pass `--api-key`.
- Arms are defined in `bench/run.js` (`ARMS`, `ARM_ENV`). To test a rules change, add a file under `bench/variants/` and an arm that points `FRUGAL_RULES` at it.
- A stamp directory is never overwritten. Commit `results.json` and `report.md`; any number in the README must come from a committed stamp.
- The method (paired medians, exact Wilcoxon test, arm-contamination check) is described at the top of `bench/report.js` and `bench/run.js`.

## Release

1. Update `.claude/CLAUDE.md` and `docs/` per the table in `.claude/CLAUDE.md`.
2. Bump `version` in `.claude-plugin/plugin.json` (semver). Do not add `version` to the marketplace entry.
3. `claude plugin validate .`
4. Commit and push to `main`.
5. On each machine: `claude plugin update frugal@frugal`, then `/reload-plugins` in open sessions.

## First install on a new machine

```bash
claude plugin marketplace add MateiSR/frugal
claude plugin install frugal@frugal
```
