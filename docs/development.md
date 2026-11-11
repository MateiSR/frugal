# Development

## Test a change

```bash
claude plugin validate .
```

Must end with `Validation passed`. The "no icon" notice is about the public plugin directory and can be ignored.

Load the working copy without installing it:

```bash
claude --plugin-dir .
```

Headless load check (run from any other directory):

```bash
claude --plugin-dir /path/to/streamkit --model haiku --debug-file /tmp/streamkit-debug.log \
  -p "Without calling any tool: list every subagent type and skill whose name starts with 'streamkit:'. Names only."
grep 'plugin streamkit' /tmp/streamkit-debug.log
```

Expect five agents and one skill, and `Loaded 5 agents` / `Loaded 1 skills` in the log.

The orchestration flow itself has no automated test. To exercise it, run `/streamkit:orchestrate` on a small throwaway repo with `stops=each`.

## Release

1. Update `.claude/CLAUDE.md` and `docs/` per the table in `.claude/CLAUDE.md`.
2. Bump `version` in `.claude-plugin/plugin.json` (semver). Do not add `version` to the marketplace entry.
3. `claude plugin validate .`
4. Commit and push to `main`.
5. On each machine: `claude plugin update streamkit@streamkit`, then `/reload-plugins` in open sessions.

## First install on a new machine

```bash
claude plugin marketplace add MateiSR/streamkit
claude plugin install streamkit@streamkit
```

Then the per-machine setup in the README (`templates/CLAUDE.md`, `templates/settings-snippet.json`).
