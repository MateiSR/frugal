# Benchmark: 2026-11-19-opus-v0.6

Model `opus` · 23 tasks × 3 (the 8 tasks where code size varies most) or 1 (the other 15) runs × 4 arms = 156 sessions · 2.1.332 (Claude Code) · plugin commit `e353dde` · 2026-11-19

Arms: `off` is default Claude Code; `v-mini` is frugal with the rules in `bench/variants/mini.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 39/39 |
| v-mini | -40% (p<0.001) | -6% (p=0.004) | -30% (p<0.001) | 0% (ns) | -40% (p<0.001) | 39/39 |
| ponytail | +3% (ns) | +23% (p=0.021) | -3% (ns) | 0% (ns) | 0% (ns) | 39/39 |
| honey | -32% (p<0.001) | -9% (p<0.001) | -26% (p<0.001) | 0% — | -29% (p<0.001) | 39/39 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-mini out | ponytail out | honey out | off $ | v-mini $ | ponytail $ | honey $ | off pass | v-mini pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| safe-join | 906 | 481 | 1015 | 713 | 0.0452 | 0.0380 | 0.0562 | 0.0420 | 3/3 | 3/3 | 3/3 | 3/3 |
| cache | 554 | 391 | 491 | 395 | 0.0376 | 0.0364 | 0.0444 | 0.0356 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-email | 1865 | 237 | 628 | 340 | 0.0695 | 0.0269 | 0.0397 | 0.0282 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-debounce | 1254 | 270 | 328 | 383 | 0.0524 | 0.0311 | 0.0341 | 0.0326 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-csv | 812 | 115 | 270 | 245 | 0.0443 | 0.0246 | 0.0327 | 0.0264 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-countdown | 1759 | 520 | 815 | 520 | 0.0691 | 0.0390 | 0.0518 | 0.0380 | 3/3 | 3/3 | 3/3 | 3/3 |
| pt-ratelimit | 1467 | 963 | 1562 | 1052 | 0.0612 | 0.0524 | 0.0735 | 0.0531 | 3/3 | 3/3 | 3/3 | 3/3 |
| hn-lru-cache | 553 | 344 | 658 | 376 | 0.0364 | 0.0343 | 0.0474 | 0.0342 | 3/3 | 3/3 | 3/3 | 3/3 |
| flatten | 499 | 415 | 679 | 354 | 0.0336 | 0.0351 | 0.0487 | 0.0324 | 1/1 | 1/1 | 1/1 | 1/1 |
| dedupe | 305 | 177 | 381 | 185 | 0.0291 | 0.0288 | 0.0401 | 0.0281 | 1/1 | 1/1 | 1/1 | 1/1 |
| slugify | 497 | 471 | 644 | 280 | 0.0342 | 0.0367 | 0.0461 | 0.0302 | 1/1 | 1/1 | 1/1 | 1/1 |
| csv-total | 419 | 301 | 338 | 257 | 0.0335 | 0.0333 | 0.0393 | 0.0298 | 1/1 | 1/1 | 1/1 | 1/1 |
| retry | 632 | 416 | 729 | 525 | 0.0376 | 0.0365 | 0.0499 | 0.0383 | 1/1 | 1/1 | 1/1 | 1/1 |
| pager | 604 | 674 | 716 | 519 | 0.0383 | 0.0460 | 0.0512 | 0.0394 | 1/1 | 1/1 | 1/1 | 1/1 |
| shared-cause | 509 | 414 | 573 | 473 | 0.0365 | 0.0392 | 0.0485 | 0.0373 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rebase | 1201 | 711 | 898 | 705 | 0.0439 | 0.0366 | 0.0454 | 0.0356 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-default-arg | 286 | 167 | 237 | 203 | 0.0257 | 0.0259 | 0.0323 | 0.0257 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rerender | 784 | 572 | 588 | 582 | 0.0356 | 0.0338 | 0.0392 | 0.0332 | 1/1 | 1/1 | 1/1 | 1/1 |
| review-sql | 614 | 395 | 451 | 326 | 0.0324 | 0.0305 | 0.0366 | 0.0282 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-interval-merge | 524 | 263 | 631 | 341 | 0.0360 | 0.0329 | 0.0471 | 0.0336 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-format-bytes | 648 | 389 | 669 | 426 | 0.0392 | 0.0358 | 0.0481 | 0.0358 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-parse-pagination | 1118 | 635 | 1317 | 780 | 0.0513 | 0.0425 | 0.0653 | 0.0451 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-round-half-up | 953 | 482 | 757 | 670 | 0.0472 | 0.0382 | 0.0505 | 0.0404 | 1/1 | 1/1 | 1/1 | 1/1 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-mini | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: |
| safe-join | 16 | 7 | 25 | 13 |
| cache | 2 | 2 | 2 | 2 |
| pt-email | 63 | 4 | 16 | 11 |
| pt-debounce | 48 | 7 | 9 | 8 |
| pt-csv | 14 | 4 | 4 | 5 |
| pt-countdown | 72 | 11 | 15 | 16 |
| pt-ratelimit | 28 | 19 | 27 | 20 |
| hn-lru-cache | 18 | 15 | 25 | 15 |
| flatten | 13 | 11 | 20 | 11 |
| dedupe | 3 | 2 | 2 | 2 |
| slugify | 3 | 3 | 7 | 3 |
| csv-total | 10 | 4 | 4 | 4 |
| retry | 20 | 15 | 33 | 15 |
| pager | 2 | 2 | 2 | 2 |
| shared-cause | 2 | 1 | 1 | 1 |
| explain-rebase | 10 | 6 | 10 | 10 |
| explain-default-arg | 7 | 7 | 7 | 7 |
| explain-rerender | 11 | 5 | 7 | 7 |
| review-sql | 6 | 2 | 2 | 2 |
| hn-interval-merge | 10 | 8 | 15 | 8 |
| hn-format-bytes | 11 | 7 | 16 | 8 |
| hn-parse-pagination | 25 | 15 | 29 | 16 |
| hn-round-half-up | 15 | 3 | 12 | 3 |
| Total | 409 | 160 | 290 | 189 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 67594 | baseline |
| v-mini | 70346 | +4% |
| ponytail | 87882 | +30% |
| honey | 67556 | -0% |
