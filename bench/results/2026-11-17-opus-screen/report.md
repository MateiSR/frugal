# Benchmark: 2026-11-17-opus-screen

Model `opus` · 5 tasks × 1 runs × 4 arms = 20 sessions · 2.1.332 (Claude Code) · plugin commit `f20076f` · 2026-11-17

Arms: `off` is default Claude Code; `v-tight` is frugal with the rules in `bench/variants/tight.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 5/5 |
| v-tight | -70% — | -34% — | -59% — | 0% — | -82% — | 5/5 |
| ponytail | -64% — | -29% — | -64% — | -50% — | -72% — | 5/5 |
| honey | -67% — | -42% — | -59% — | 0% — | -74% — | 5/5 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-tight out | ponytail out | honey out | off $ | v-tight $ | ponytail $ | honey $ | off pass | v-tight pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| pt-countdown | 1729 | 515 | 815 | 590 | 0.0677 | 0.0408 | 0.0518 | 0.0394 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-csv | 812 | 272 | 206 | 198 | 0.0443 | 0.0325 | 0.0314 | 0.0254 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-email | 1666 | 166 | 593 | 337 | 0.0642 | 0.0273 | 0.0391 | 0.0281 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-debounce | 1158 | 277 | 313 | 383 | 0.0499 | 0.0331 | 0.0338 | 0.0326 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-ratelimit | 1581 | 1015 | 1845 | 1008 | 0.0638 | 0.0567 | 0.0827 | 0.0518 | 1/1 | 1/1 | 1/1 | 1/1 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-tight | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: |
| pt-countdown | 62 | 11 | 15 | 16 |
| pt-csv | 14 | 3 | 4 | 5 |
| pt-email | 58 | 3 | 16 | 11 |
| pt-debounce | 44 | 7 | 9 | 8 |
| pt-ratelimit | 28 | 17 | 25 | 17 |
| Total | 206 | 41 | 69 | 57 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 16841 | baseline |
| v-tight | 16519 | -2% |
| ponytail | 19054 | +13% |
| honey | 14441 | -14% |
