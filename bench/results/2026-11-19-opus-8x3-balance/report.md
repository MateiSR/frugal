# Benchmark: 2026-11-19-opus-8x3-balance

Model `opus` · 8 tasks × 3 runs × 4 arms = 96 sessions · 2.1.332 (Claude Code) · plugin commit `3ec924b` · 2026-11-19

Arms: `off` is default Claude Code; `v-balance` is frugal with the rules in `bench/variants/balance.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 24/24 |
| v-balance | -46% (p=0.008) | -19% (p=0.039) | -41% (p=0.008) | 0% — | -57% (p=0.016) | 24/24 |
| ponytail | -28% (ns) | +1% (ns) | -23% (ns) | 0% — | -29% (ns) | 24/24 |
| honey | -50% (p=0.008) | -25% (p=0.008) | -41% (p=0.008) | 0% — | -43% (p=0.016) | 24/24 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-balance out | ponytail out | honey out | off $ | v-balance $ | ponytail $ | honey $ | off pass | v-balance pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| safe-join | 906 | 635 | 1015 | 713 | 0.0452 | 0.0430 | 0.0562 | 0.0420 | 3/3 | 3/3 | 3/3 | 3/3 |
| cache | 554 | 442 | 491 | 395 | 0.0376 | 0.0386 | 0.0444 | 0.0356 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-email | 1865 | 708 | 628 | 351 | 0.0695 | 0.0372 | 0.0397 | 0.0284 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-debounce | 1254 | 337 | 582 | 396 | 0.0524 | 0.0337 | 0.0437 | 0.0328 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-csv | 777 | 289 | 299 | 245 | 0.0434 | 0.0289 | 0.0333 | 0.0264 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-countdown | 1759 | 646 | 974 | 456 | 0.0691 | 0.0432 | 0.0556 | 0.0362 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-ratelimit | 1462 | 1182 | 1514 | 1084 | 0.0606 | 0.0595 | 0.0730 | 0.0535 | 3/3 | 3/3 | 3/3 | 3/3 |
| hn-lru-cache | 553 | 401 | 658 | 376 | 0.0364 | 0.0363 | 0.0474 | 0.0342 | 3/3 | 3/3 | 3/3 | 3/3 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-balance | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: |
| safe-join | 16 | 7 | 25 | 13 |
| cache | 2 | 2 | 2 | 2 |
| pt-email | 63 | 8 | 14 | 11 |
| pt-debounce | 48 | 7 | 9 | 8 |
| pt-csv | 12 | 5 | 5 | 5 |
| pt-countdown | 72 | 17 | 11 | 11 |
| pt-ratelimit | 28 | 20 | 29 | 20 |
| hn-lru-cache | 18 | 15 | 25 | 15 |
| Total | 259 | 81 | 120 | 85 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 25860 | baseline |
| v-balance | 25869 | +0% |
| ponytail | 30996 | +20% |
| honey | 23610 | -9% |
