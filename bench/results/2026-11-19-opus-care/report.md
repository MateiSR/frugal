# Benchmark: 2026-11-19-opus-care

Model `opus` · 23 tasks × 1 runs × 5 arms = 115 sessions · 2.1.332 (Claude Code) · plugin commit `3ec924b` · 2026-11-19

Arms: `off` is default Claude Code; `v-mini` is frugal with the rules in `bench/variants/mini.md`; `v-care` is frugal with the rules in `bench/variants/care.md`; `ponytail` is Ponytail at `ebd8654`, full mode; `honey` is Honey at `cc82b7e`, full mode. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines written | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 23/23 |
| v-mini | -40% (p<0.001) | -6% (p=0.004) | -30% (p<0.001) | 0% (ns) | -40% (p<0.001) | 23/23 |
| v-care | -14% (p=0.020) | +5% (ns) | -13% (ns) | 0% (ns) | -29% (p<0.001) | 23/23 |
| ponytail | +3% (ns) | +23% (p=0.003) | -3% (ns) | 0% (ns) | 0% (ns) | 23/23 |
| honey | -33% (p<0.001) | -9% (p<0.001) | -29% (p<0.001) | 0% — | -33% (p<0.001) | 23/23 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | v-mini out | v-care out | ponytail out | honey out | off $ | v-mini $ | v-care $ | ponytail $ | honey $ | off pass | v-mini pass | v-care pass | ponytail pass | honey pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| flatten | 499 | 415 | 582 | 679 | 354 | 0.0336 | 0.0351 | 0.0400 | 0.0487 | 0.0324 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| dedupe | 305 | 177 | 306 | 381 | 185 | 0.0291 | 0.0288 | 0.0322 | 0.0401 | 0.0281 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| slugify | 497 | 471 | 548 | 644 | 280 | 0.0342 | 0.0367 | 0.0392 | 0.0461 | 0.0302 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| csv-total | 419 | 301 | 502 | 338 | 257 | 0.0335 | 0.0333 | 0.0385 | 0.0393 | 0.0298 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| retry | 632 | 416 | 535 | 729 | 525 | 0.0376 | 0.0365 | 0.0399 | 0.0499 | 0.0383 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| safe-join | 906 | 459 | 780 | 1015 | 729 | 0.0452 | 0.0375 | 0.0448 | 0.0562 | 0.0424 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| cache | 554 | 407 | 511 | 466 | 391 | 0.0376 | 0.0368 | 0.0400 | 0.0439 | 0.0356 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pager | 604 | 674 | 711 | 716 | 519 | 0.0383 | 0.0460 | 0.0456 | 0.0512 | 0.0394 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| shared-cause | 509 | 414 | 573 | 573 | 473 | 0.0365 | 0.0392 | 0.0438 | 0.0485 | 0.0373 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rebase | 1201 | 711 | 884 | 898 | 705 | 0.0439 | 0.0366 | 0.0408 | 0.0454 | 0.0356 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-default-arg | 286 | 167 | 250 | 237 | 203 | 0.0257 | 0.0259 | 0.0283 | 0.0323 | 0.0257 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| explain-rerender | 784 | 572 | 602 | 588 | 582 | 0.0356 | 0.0338 | 0.0352 | 0.0392 | 0.0332 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| review-sql | 614 | 395 | 380 | 451 | 326 | 0.0324 | 0.0305 | 0.0309 | 0.0366 | 0.0282 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-email | 1642 | 223 | 610 | 602 | 351 | 0.0634 | 0.0266 | 0.0352 | 0.0392 | 0.0284 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-debounce | 1152 | 163 | 298 | 582 | 416 | 0.0498 | 0.0258 | 0.0293 | 0.0437 | 0.0334 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-csv | 777 | 106 | 311 | 299 | 243 | 0.0434 | 0.0244 | 0.0293 | 0.0333 | 0.0263 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-countdown | 1745 | 525 | 730 | 991 | 456 | 0.0681 | 0.0391 | 0.0449 | 0.0565 | 0.0362 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| pt-ratelimit | 1462 | 975 | 1118 | 1514 | 1122 | 0.0606 | 0.0527 | 0.0569 | 0.0730 | 0.0547 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-lru-cache | 553 | 344 | 504 | 616 | 371 | 0.0364 | 0.0343 | 0.0384 | 0.0462 | 0.0341 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-interval-merge | 524 | 263 | 369 | 631 | 341 | 0.0360 | 0.0329 | 0.0358 | 0.0471 | 0.0336 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-format-bytes | 648 | 389 | 708 | 669 | 426 | 0.0392 | 0.0358 | 0.0447 | 0.0481 | 0.0358 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-parse-pagination | 1118 | 635 | 784 | 1317 | 780 | 0.0513 | 0.0425 | 0.0459 | 0.0653 | 0.0451 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |
| hn-round-half-up | 953 | 482 | 1127 | 757 | 670 | 0.0472 | 0.0382 | 0.0553 | 0.0505 | 0.0404 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 |

## Code lines per task

Median non-blank, non-comment lines the session wrote (files it added or changed, else the code blocks in its reply).

| Task | off | v-mini | v-care | ponytail | honey |
| :--- | ---: | ---: | ---: | ---: | ---: |
| flatten | 13 | 11 | 12 | 20 | 11 |
| dedupe | 3 | 2 | 2 | 2 | 2 |
| slugify | 3 | 3 | 3 | 7 | 3 |
| csv-total | 10 | 4 | 4 | 4 | 4 |
| retry | 20 | 15 | 17 | 33 | 15 |
| safe-join | 16 | 7 | 7 | 25 | 13 |
| cache | 2 | 2 | 2 | 2 | 2 |
| pager | 2 | 2 | 2 | 2 | 2 |
| shared-cause | 2 | 1 | 2 | 1 | 1 |
| explain-rebase | 10 | 6 | 4 | 10 | 10 |
| explain-default-arg | 7 | 7 | 5 | 7 | 7 |
| explain-rerender | 11 | 5 | 10 | 7 | 7 |
| review-sql | 6 | 2 | 2 | 2 | 2 |
| pt-email | 57 | 4 | 10 | 14 | 11 |
| pt-debounce | 45 | 7 | 7 | 8 | 8 |
| pt-csv | 12 | 4 | 5 | 5 | 5 |
| pt-countdown | 67 | 15 | 15 | 11 | 11 |
| pt-ratelimit | 28 | 20 | 20 | 29 | 17 |
| hn-lru-cache | 18 | 15 | 15 | 25 | 15 |
| hn-interval-merge | 10 | 8 | 8 | 15 | 8 |
| hn-format-bytes | 11 | 7 | 8 | 16 | 8 |
| hn-parse-pagination | 25 | 15 | 15 | 29 | 16 |
| hn-round-half-up | 15 | 3 | 9 | 12 | 3 |
| Total | 393 | 165 | 184 | 286 | 181 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 67148 | baseline |
| v-mini | 70139 | +4% |
| v-care | 73195 | +9% |
| ponytail | 88398 | +32% |
| honey | 67576 | +1% |
