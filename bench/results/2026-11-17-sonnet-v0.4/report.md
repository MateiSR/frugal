# Benchmark: 2026-11-17-sonnet-v0.4

Model `sonnet` · 13 tasks × 3 runs × 3 arms = 117 sessions · 2.1.332 (Claude Code) · plugin commit `40796fe` · 2026-11-17

Arms: `off` is default Claude Code; `on` is frugal as shipped at the plugin commit above (before v0.4: the long rules plus a per-prompt reminder); `full` is frugal with the long rules in `bench/variants/full.md`. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines added | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 39/39 |
| on | -30% (p<0.001) | -3% (p=0.027) | -24% (p<0.001) | 0% — | -8% — | 39/39 |
| full | -7% (ns) | +55% (p<0.001) | -10% (ns) | 0% — | 0% — | 39/39 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks and required facts for explanations.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | on out | full out | off $ | on $ | full $ | off pass | on pass | full pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dedupe | 313 | 219 | 233 | 0.0143 | 0.0146 | 0.0237 | 3/3 | 3/3 | 3/3 |
| flatten | 512 | 357 | 418 | 0.0169 | 0.0165 | 0.0263 | 3/3 | 3/3 | 3/3 |
| pager | 791 | 634 | 789 | 0.0212 | 0.0226 | 0.0337 | 3/3 | 3/3 | 3/3 |
| safe-join | 1387 | 751 | 1483 | 0.0280 | 0.0220 | 0.0405 | 3/3 | 3/3 | 3/3 |
| csv-total | 503 | 303 | 385 | 0.0172 | 0.0167 | 0.0267 | 3/3 | 3/3 | 3/3 |
| shared-cause | 596 | 489 | 608 | 0.0203 | 0.0205 | 0.0315 | 3/3 | 3/3 | 3/3 |
| retry | 698 | 415 | 662 | 0.0198 | 0.0181 | 0.0303 | 3/3 | 3/3 | 3/3 |
| explain-default-arg | 401 | 183 | 316 | 0.0137 | 0.0128 | 0.0229 | 3/3 | 3/3 | 3/3 |
| review-sql | 685 | 292 | 491 | 0.0166 | 0.0140 | 0.0247 | 3/3 | 3/3 | 3/3 |
| explain-rebase | 1330 | 1002 | 1241 | 0.0230 | 0.0210 | 0.0321 | 3/3 | 3/3 | 3/3 |
| slugify | 525 | 368 | 641 | 0.0175 | 0.0171 | 0.0305 | 3/3 | 3/3 | 3/3 |
| cache | 717 | 508 | 680 | 0.0206 | 0.0208 | 0.0307 | 3/3 | 3/3 | 3/3 |
| explain-rerender | 822 | 513 | 690 | 0.0179 | 0.0161 | 0.0266 | 3/3 | 3/3 | 3/3 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 34687 | baseline |
| on | 38783 | +12% |
| full | 68274 | +97% |
