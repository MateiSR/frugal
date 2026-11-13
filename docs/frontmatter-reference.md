# Frontmatter and settings reference

Keys this plugin relies on, checked against the official Claude Code docs on 2026-11-26 (CLI 2.1.332). Re-check and update the date when adding or changing a key.

Sources: [sub-agents](https://code.claude.com/docs/en/sub-agents.md), [skills](https://code.claude.com/docs/en/skills.md), [settings reference](https://code.claude.com/docs/en/settings-reference.md), [worktrees](https://code.claude.com/docs/en/worktrees.md), [manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference.md), [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md), [plugin CLI](https://code.claude.com/docs/en/plugins/cli-reference.md).

## Agent frontmatter

| Key | Values used here | Notes |
| :--- | :--- | :--- |
| `name` | bare name | Must not contain `:`; the plugin prefix is added automatically |
| `model` | `opus`, `sonnet`, `fable` | Aliases, a full model ID, or `inherit` |
| `effort` | `high`, `medium` | Also `low`, `xhigh`, `max`; availability depends on the model |
| `tools`, `disallowedTools` | comma-separated string | A YAML list also works |
| `maxTurns` | 6–30 | At the limit the reply is marked partial (v2.1.246+) and the agent can be resumed |
| `color` | `blue`, `cyan`, `yellow`, `purple`, `red` | Also `green`, `orange`, `pink` |
| `autoCompactWindow` | `250000` | Minimum 100000; v2.1.296+ |
| `omitClaudeMd` | `true` | Skips user, project and local `CLAUDE.md`; v2.1.271+ |
| `experimental.cacheTtl` | `"1h"` | Must be nested under `experimental`; `5m` or `1h`; v2.1.248+; `1h` is ignored while usage credits are in use |

**Ignored for plugin agents (silent no-ops):** `hooks`, `mcpServers`, `permissionMode`, `initialPrompt`.

Minimum Claude Code version for the plugin as a whole: **v2.1.296**.

## Skill frontmatter

`name`, `description`, `argument-hint` are all valid for plugin skills. The command is `/<plugin>:<skill>`.

## Agent tool behaviour the skill depends on

- `isolation: "worktree"` on an Agent call runs the agent in its own git worktree.
- `SendMessage` with the agent's ID or name as `to` resumes it with its context.
- Subagents can spawn subagents up to three layers below the main conversation (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` changes this).

## Settings

| Key | Use |
| :--- | :--- |
| `worktree.baseRef` | `"fresh"` (default) or `"head"`. `"head"` branches worktrees from local HEAD, including unpushed commits. Recommended. |
| `subagentPromptCacheTtl` | Leave unset; agents set their own TTL. |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Leave unset; when enabled, named subagents launch as teammates. |

## Manifests

- A plugin at the marketplace root uses `"source": "./"`.
- Set `version` only in `plugin.json`. If the marketplace entry also sets it, `plugin.json` wins and validation warns.
- A `CLAUDE.md` at the plugin root is not loaded and triggers a validation warning.

## Commands

- `claude plugin update <plugin>@<marketplace>` is shell-only; there is no `/plugin update` inside a session.
- `/reload-plugins` applies changed plugins to a running session.

## Hooks

Source: [hooks reference](https://code.claude.com/docs/en/hooks).

- Plugin hooks are auto-loaded from `hooks/hooks.json`, which must wrap the event map in `{"hooks": {...}}`; without the wrapper the file fails to load.
- Hook commands get `CLAUDE_PLUGIN_ROOT` (changes on every update; never write state there), `CLAUDE_PLUGIN_DATA` and `CLAUDE_PROJECT_DIR`. These are not set in the Bash tool's environment.
- Common stdin fields: `session_id`, `transcript_path`, `cwd`, `hook_event_name`.
- `SessionStart`: `source` is `startup`, `resume`, `clear`, `compact` or `fork`, and is also the matcher value. Context via plain stdout or `hookSpecificOutput.additionalContext`.
- `SubagentStart`: stdin has `agent_id` and `agent_type`; the matcher is a regex on the agent type. Context must use the JSON `hookSpecificOutput.additionalContext` form. It cannot block the subagent.
- `UserPromptSubmit`: stdin has `prompt`, the line as typed (a slash command is not expanded). `{"decision": "block", "reason": "..."}` stops the prompt and shows the reason to the user; a blocked slash command does not run.
- `additionalContext` is capped at 10,000 characters; larger text is saved to a file and Claude gets the path plus a 2,000-character preview.
- `PreCompact` and `PostCompact` exist but cannot inject context; `SessionStart` with `compact` is the way to re-inject.
- No hook input carries token usage, apart from narrow cases. The transcript JSONL format is not documented.
- A plugin cannot contribute a statusline; only the user's `settings.json` `statusLine` can.

## Skills in plugins

- Invoked as `/<plugin>:<skill>`; the bare `/<skill>` also works unless another command uses that name.
- `disable-model-invocation: true` keeps a skill for the user's explicit use.
- Substituted in skill content: `$ARGUMENTS`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_PROJECT_DIR}`.
