---
name: debug
description: Root-cause method for a bug that has already survived two fix attempts. Use when the same failure persists after two distinct fixes, or when the user asks to find a root cause.
---

Two fixes have failed, so the working theory is wrong. Stop editing and find the cause first.

1. **Reproduce** with one command. Send its output to a log file and read only the failing lines.
2. **List what the two failed fixes ruled out.** Do not retry a variant of either.
3. **Trace to the cause, not the symptom.** Check, in this order: the callers of the failing function, state mutated elsewhere, ordering and async assumptions, config and environment drift, and recent commits (`git log -p` on the files involved).
4. **Prove it** with a probe that would fail if the theory were wrong: a one-line assertion, a minimal repro, or a bisect.
5. **Fix at the cause**, including sibling callers that share it, then re-run the reproduction.

Do not edit source files during steps 1 to 4. Never kill processes you did not start, and make no paid external calls.

Report in at most 10 lines: root cause as `path:line` with the mechanism, the evidence, what was ruled out, the fix, and the command that verifies it.
