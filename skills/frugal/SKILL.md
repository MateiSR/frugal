---
name: frugal
description: Toggle frugal mode or show its token stats. Runs only when the user types /frugal.
argument-hint: "[status | on|off [session|project|global] | stats [all]]"
disable-model-invocation: true
---

`/frugal` is normally answered by the plugin's `UserPromptSubmit` hook before it reaches you. You are reading this only because that hook did not run.

Run exactly this and relay its output verbatim, with no commentary:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/frugal.js" cli --session "${CLAUDE_SESSION_ID}" $ARGUMENTS
```

If the output says frugal mode is off, stop applying the frugal mode rules for the rest of this session. If it says on, apply them.
