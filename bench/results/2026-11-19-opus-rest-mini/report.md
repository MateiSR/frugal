# Benchmark: 2026-11-19-opus-rest-mini

Model `opus` · 15 tasks × 1 runs × 5 arms = 75 sessions · 2.1.332 (Claude Code) · plugin commit `e353dde` · 2026-11-19

Arms: `off` is default Claude Code; `v-lean` is frugal with the rules in `bench/variants/lean.md`; `v-mini` is frugal with the rules in `bench/variants/mini.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 15/15 |
| v-lean | -25% (p=0.002) | +1% (ns) | -16% (ns) | 0% (p=0.016) | -33% (p<0.001) | 15/15 |
| v-mini | -36% (p<0.001) | -3% (ns) | -20% (p=0.002) | 0% — | -36% (p<0.001) | 15/15 |
| ponytail | +13% (ns) | +27% (p<0.001) | -2% (ns) | 0% (p=0.031) | 0% (ns) | 15/15 |
| honey | -30% (p<0.001) | -7% (p=0.002) | -26% (p<0.001) | 0% — | -27% (p<0.001) | 15/15 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-lean out | v-mini out | ponytail out | honey out | off $ | v-lean $ | v-mini $ | ponytail $ | honey $ | off pass | v-lean pass | v-mini pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| flatten | 499 | 438 | 415 | 679 | 354 | 0.0336 | 0.0375 | 0.0351 | 0.0487 | 0.0324 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| dedupe | 305 | 264 | 177 | 381 | 185 | 0.0291 | 0.0327 | 0.0288 | 0.0401 | 0.0281 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| slugify | 497 | 462 | 471 | 644 | 280 | 0.0342 | 0.0368 | 0.0367 | 0.0461 | 0.0302 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| csv-total | 419 | 317 | 301 | 338 | 257 | 0.0335 | 0.0343 | 0.0333 | 0.0393 | 0.0298 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| retry | 632 | 477 | 416 | 729 | 525 | 0.0376 | 0.0380 | 0.0365 | 0.0499 | 0.0383 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pager | 604 | 681 | 674 | 716 | 519 | 0.0383 | 0.0465 | 0.0460 | 0.0512 | 0.0394 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| shared-cause | 509 | 632 | 414 | 573 | 473 | 0.0365 | 0.0448 | 0.0392 | 0.0485 | 0.0373 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rebase | 1201 | 750 | 711 | 898 | 705 | 0.0439 | 0.0376 | 0.0366 | 0.0454 | 0.0356 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-default-arg | 286 | 161 | 167 | 237 | 203 | 0.0257 | 0.0260 | 0.0259 | 0.0323 | 0.0257 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rerender | 784 | 488 | 572 | 588 | 582 | 0.0356 | 0.0324 | 0.0338 | 0.0392 | 0.0332 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| review-sql | 614 | 322 | 395 | 451 | 326 | 0.0324 | 0.0292 | 0.0305 | 0.0366 | 0.0282 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-interval-merge | 524 | 392 | 263 | 631 | 341 | 0.0360 | 0.0357 | 0.0329 | 0.0471 | 0.0336 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-format-bytes | 648 | 448 | 389 | 669 | 426 | 0.0392 | 0.0376 | 0.0358 | 0.0481 | 0.0358 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-parse-pagination | 1118 | 944 | 635 | 1317 | 780 | 0.0513 | 0.0526 | 0.0425 | 0.0653 | 0.0451 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-round-half-up | 953 | 650 | 482 | 757 | 670 | 0.0472 | 0.0432 | 0.0382 | 0.0505 | 0.0404 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-lean | v-mini | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: | ---: |
| flatten | 13 | 12 | 11 | 20 | 11 |
| dedupe | 3 | 2 | 2 | 2 | 2 |
| slugify | 3 | 3 | 3 | 7 | 3 |
| csv-total | 10 | 4 | 4 | 4 | 4 |
| retry | 20 | 15 | 15 | 33 | 15 |
| pager | 2 | 2 | 2 | 2 | 2 |
| shared-cause | 2 | 1 | 1 | 1 | 1 |
| explain-rebase | 10 | 6 | 6 | 10 | 10 |
| explain-default-arg | 7 | 5 | 7 | 7 | 7 |
| explain-rerender | 11 | 7 | 5 | 7 | 7 |
| review-sql | 6 | 2 | 2 | 2 | 2 |
| hn-interval-merge | 10 | 8 | 8 | 15 | 8 |
| hn-format-bytes | 11 | 8 | 7 | 16 | 8 |
| hn-parse-pagination | 25 | 15 | 15 | 29 | 16 |
| hn-round-half-up | 15 | 3 | 3 | 12 | 3 |
| Total | 148 | 93 | 91 | 167 | 99 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 41648 | baseline |
| v-lean | 47126 | +13% |
| v-mini | 45884 | +10% |
| ponytail | 57337 | +38% |
| honey | 43918 | +5% |
