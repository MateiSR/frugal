# Frugal mode

How the always-on rules are delivered, switched and measured. All of it is `hooks/frugal.js`, registered in `hooks/hooks.json`.

## Why hooks

- A skill loads only when Claude decides to invoke it, and subagents never see it.
- A global `CLAUDE.md` works but is copied by hand, drifts from the repo and outlives an uninstall.
- Hooks fire on every session and every subagent, and install, update and uninstall with the plugin.

## The rules are short on purpose

`rules/frugal.md` is about 230 words (roughly 330 tokens), plain sentences, no emphasis header.

Until v0.4 the plugin shipped a 1,700-token rule set with an "ACTIVE" header and a one-line reminder on every prompt. The first benchmark (`bench/results/2026-11-14-sonnet`) showed that version cutting output by 18% while raising session cost by 48% on short tasks, and the short rules cutting output by 31% at no cost change. The long rules are kept as `bench/variants/full.md` so the comparison can be re-run.

This matches Anthropic's guidance for current models: long instruction blocks and emphasis make Claude over-apply rules, and per-turn reminders are for measured problems, not style.

## Hook flow

| Hook | Subcommand | Behaviour |
| :--- | :--- | :--- |
| `SessionStart` (matcher `startup\|resume\|clear\|compact\|fork`) | `session` | Mode on: emit the rules as `additionalContext`. Mode off: emit nothing. Records what the session was told. |
| `SubagentStart` | `subagent` | Mode on: emit the rules, except to agents that only locate, plan or look (`Explore`, `Plan`, `web-fetch`, `statusline-setup`, `claude-code-guide`, `visual-verifier`). Session-start context does not reach subagents, so this is the only way they get the rules. |
| `UserPromptSubmit` | `prompt` | If the prompt is `/frugal ...`: run the command and block the prompt with the reply. Otherwise announce a mode switch, if there was one. |

The `compact` matcher is what restores the rules after compaction.

### Per-prompt logic

| Mode now | Session was last told | Injected |
| :--- | :--- | :--- |
| on | on | Nothing |
| on | off or nothing | The rules |
| off | on | One line telling Claude to disregard them |
| off | off or nothing | Nothing |

So in a normal session the prompt hook adds no tokens at all.

Output shapes:

```json
{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}
{"decision": "block", "reason": "text shown to the user"}
```

`additionalContext` is capped at 10,000 characters by Claude Code; past that it is spilled to a file and only a preview is injected.

## State

Everything is under `${CLAUDE_CONFIG_DIR:-~/.claude}/frugal/`. It is not in `CLAUDE_PLUGIN_DATA` because that variable is not available to the fallback skill's shell, and both must read the same files.

| File | Content | Scope |
| :--- | :--- | :--- |
| `global` | `on` or `off` | Machine |
| `projects/<sha1(project dir)[:16]>` | `on` or `off` | Project (`CLAUDE_PROJECT_DIR`, else the hook's `cwd`) |
| `sessions/<session_id>.json` | `{"override": "on"\|"off", "announced": "on"\|"off"}` | Session |
| `log.jsonl` | One line per hook event | Stats |

Effective mode: session override, else project, else global, else `on`.

`shortcut:` session files are never cleaned up; each is under 50 bytes. Add pruning if the folder ever matters.

Environment overrides, for tests and the benchmark only: `FRUGAL_DIR` (state directory) and `FRUGAL_RULES` (rules file).

## `/frugal`

Parsed from the raw prompt by the `UserPromptSubmit` hook (`/frugal` and `/frugal:frugal` both match). The reply is returned as a blocked prompt, so the model is not called and no tokens are spent. Claude learns about a switch on the next prompt, through the per-prompt logic above.

`skills/frugal/SKILL.md` exists so the command appears in autocomplete and still works if hooks are disabled. It has `disable-model-invocation: true` and runs `frugal.js cli --session <id> ...`.

## Stats

Source: Claude Code's session transcripts (`transcript_path` from hook input, and `<transcript minus .jsonl>/subagents/*.jsonl`). The transcript format is not documented by Anthropic and may change; the parser reads only `type`, `timestamp`, `message.id` and `message.usage`.

- An assistant message is written once per content block with the same `message.id` and the same usage. The parser keeps one entry per id; summing every line would roughly double the totals.
- `log.jsonl` records `{ts, sid, ev, mode, chars, ...}`. `chars` is the size of what was injected; overhead is reported as `chars / 4` and labelled an estimate.
- Each main-session message is attributed to the mode in effect at its timestamp, from the log's timeline.
- The on/off comparison is output tokens per message, shown only with at least 20 messages on each side. It is observational: the tasks differ between the two groups.

There is deliberately no modelled savings figure in `/frugal stats`. Caveman multiplies by a fixed 65%; Honey scales by benchmark ratios. Both produce a number without measuring the session in front of you. Controlled numbers come from `bench/`.

## Not done

- No statusline badge. Claude Code has no way for a plugin to contribute a statusline; it would have to be wired into the user's own script.
- No cost in dollars in `/frugal stats`. That needs a price table that goes stale; the statusline's `cost.total_cost_usd` already covers it.
- No hook that trims test and build output. One study measured about −3% cost for that technique with a confidence interval touching zero, and the current benchmark tasks do not run shell commands, so it cannot be tested here yet.
