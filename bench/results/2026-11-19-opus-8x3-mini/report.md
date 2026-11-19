# Benchmark: 2026-11-19-opus-8x3-mini

Model `opus` · 8 tasks × 3 runs × 5 arms = 120 sessions · 2.1.332 (Claude Code) · plugin commit `e353dde` · 2026-11-19

Arms: `off` is default Claude Code; `v-lean` is frugal with the rules in `bench/variants/lean.md`; `v-mini` is frugal with the rules in `bench/variants/mini.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 24/24 |
| v-lean | -53% (p=0.008) | -26% (p=0.008) | -45% (p=0.008) | 0% — | -64% (p=0.016) | 24/24 |
| v-mini | -59% (p=0.008) | -28% (p=0.008) | -48% (p=0.008) | 0% — | -64% (p=0.016) | 24/24 |
| ponytail | -33% (ns) | -3% (ns) | -25% (ns) | 0% — | -38% (ns) | 24/24 |
| honey | -51% (p=0.008) | -26% (p=0.008) | -43% (p=0.008) | 0% — | -46% (p=0.016) | 24/24 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-lean out | v-mini out | ponytail out | honey out | off $ | v-lean $ | v-mini $ | ponytail $ | honey $ | off pass | v-lean pass | v-mini pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| safe-join | 906 | 533 | 481 | 1015 | 713 | 0.0452 | 0.0399 | 0.0380 | 0.0562 | 0.0420 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| cache | 554 | 407 | 391 | 491 | 395 | 0.0376 | 0.0370 | 0.0364 | 0.0444 | 0.0356 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-email | 1865 | 245 | 237 | 628 | 340 | 0.0695 | 0.0273 | 0.0269 | 0.0397 | 0.0282 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-debounce | 1254 | 200 | 270 | 328 | 383 | 0.0524 | 0.0268 | 0.0311 | 0.0341 | 0.0326 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-csv | 812 | 172 | 115 | 270 | 245 | 0.0443 | 0.0260 | 0.0246 | 0.0327 | 0.0264 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-countdown | 1759 | 603 | 520 | 815 | 520 | 0.0691 | 0.0417 | 0.0390 | 0.0518 | 0.0380 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-ratelimit | 1467 | 1087 | 963 | 1562 | 1052 | 0.0612 | 0.0557 | 0.0524 | 0.0735 | 0.0531 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| hn-lru-cache | 553 | 385 | 344 | 658 | 376 | 0.0364 | 0.0354 | 0.0343 | 0.0474 | 0.0342 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-lean | v-mini | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: | ---: |
| safe-join | 16 | 7 | 7 | 25 | 13 |
| cache | 2 | 2 | 2 | 2 | 2 |
| pt-email | 63 | 4 | 4 | 16 | 11 |
| pt-debounce | 48 | 7 | 7 | 9 | 8 |
| pt-csv | 14 | 4 | 4 | 4 | 5 |
| pt-countdown | 72 | 11 | 11 | 15 | 16 |
| pt-ratelimit | 28 | 20 | 19 | 27 | 20 |
| hn-lru-cache | 18 | 15 | 15 | 25 | 15 |
| Total | 261 | 70 | 69 | 123 | 90 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 25946 | baseline |
| v-lean | 24709 | -5% |
| v-mini | 24462 | -6% |
| ponytail | 30545 | +18% |
| honey | 23638 | -9% |
