# Benchmark: 2026-11-19-opus-8x3-lean

Model `opus` · 8 tasks × 3 runs × 5 arms = 120 sessions · 2.1.332 (Claude Code) · plugin commit `e353dde` · 2026-11-19

Arms: `off` is default Claude Code; `v-tight` is frugal with the rules in `bench/variants/tight.md`; `v-lean` is frugal with the rules in `bench/variants/lean.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 24/24 |
| v-tight | -58% (p=0.008) | -19% (p=0.023) | -52% (p=0.008) | 0% — | -67% (p=0.016) | 24/24 |
| v-lean | -53% (p=0.008) | -26% (p=0.008) | -45% (p=0.008) | 0% — | -64% (p=0.016) | 24/24 |
| ponytail | -33% (ns) | -3% (ns) | -25% (ns) | 0% — | -38% (ns) | 24/24 |
| honey | -51% (p=0.008) | -26% (p=0.008) | -43% (p=0.008) | 0% — | -46% (p=0.016) | 24/24 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-tight out | v-lean out | ponytail out | honey out | off $ | v-tight $ | v-lean $ | ponytail $ | honey $ | off pass | v-tight pass | v-lean pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| safe-join | 906 | 464 | 533 | 1015 | 713 | 0.0452 | 0.0398 | 0.0399 | 0.0562 | 0.0420 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| cache | 554 | 386 | 407 | 491 | 395 | 0.0376 | 0.0382 | 0.0370 | 0.0444 | 0.0356 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-email | 1865 | 203 | 245 | 628 | 340 | 0.0695 | 0.0281 | 0.0273 | 0.0397 | 0.0282 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-debounce | 1254 | 278 | 200 | 328 | 383 | 0.0524 | 0.0331 | 0.0268 | 0.0341 | 0.0326 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-csv | 812 | 264 | 172 | 270 | 245 | 0.0443 | 0.0324 | 0.0260 | 0.0327 | 0.0264 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-countdown | 1759 | 515 | 603 | 815 | 520 | 0.0691 | 0.0408 | 0.0417 | 0.0518 | 0.0380 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-ratelimit | 1467 | 1015 | 1087 | 1562 | 1052 | 0.0612 | 0.0567 | 0.0557 | 0.0735 | 0.0531 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| hn-lru-cache | 553 | 353 | 385 | 658 | 376 | 0.0364 | 0.0363 | 0.0354 | 0.0474 | 0.0342 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-tight | v-lean | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: | ---: |
| safe-join | 16 | 7 | 7 | 25 | 13 |
| cache | 2 | 2 | 2 | 2 | 2 |
| pt-email | 63 | 3 | 4 | 16 | 11 |
| pt-debounce | 48 | 7 | 7 | 9 | 8 |
| pt-csv | 14 | 3 | 4 | 4 | 5 |
| pt-countdown | 72 | 11 | 11 | 15 | 16 |
| pt-ratelimit | 28 | 17 | 20 | 27 | 20 |
| hn-lru-cache | 18 | 15 | 15 | 25 | 15 |
| Total | 261 | 65 | 70 | 123 | 90 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 25946 | baseline |
| v-tight | 26663 | +3% |
| v-lean | 24709 | -5% |
| ponytail | 30545 | +18% |
| honey | 23638 | -9% |
