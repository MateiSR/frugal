# Benchmark: 2026-11-14-sonnet

Model `sonnet` · 13 tasks × 3 runs × 4 arms = 156 sessions · 2.1.332 (Claude Code) · plugin commit `fb5b349` · 2026-11-14

Arms: `off` is default Claude Code. `terse` adds the one-line system prompt "Be concise." `on` loads frugal as shipped. `lean` loads frugal with the short rules in `bench/variants/lean.md` and no per-prompt reminder. No user settings, rules, other plugins or MCP servers in any arm.

## Summary

Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.

| Arm | Output tokens | Cost | Time | Turns | Code lines added | Checks passed |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | baseline | baseline | baseline | baseline | baseline | 39/39 |
| terse | -10% (p<0.001) | -3% (p=0.002) | -11% (p=0.005) | 0% — | 0% — | 39/39 |
| on | -18% (p=0.033) | +48% (p<0.001) | -18% (ns) | 0% — | 0% — | 39/39 |
| lean | -31% (p<0.001) | -4% (ns) | -21% (p<0.001) | 0% — | 0% — | 39/39 |

Cost is Claude Code's own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks and required facts for explanations.

## Per task

Median output tokens, cost and checks passed per arm.

| Task | off out | terse out | on out | lean out | off $ | terse $ | on $ | lean $ | off pass | terse pass | on pass | lean pass |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dedupe | 300 | 302 | 196 | 222 | 0.0142 | 0.0142 | 0.0237 | 0.0146 | 3/3 | 3/3 | 3/3 | 3/3 |
| flatten | 508 | 411 | 466 | 378 | 0.0169 | 0.0158 | 0.0272 | 0.0168 | 3/3 | 3/3 | 3/3 | 3/3 |
| csv-total | 453 | 385 | 404 | 312 | 0.0158 | 0.0152 | 0.0275 | 0.0168 | 3/3 | 3/3 | 3/3 | 3/3 |
| slugify | 507 | 363 | 359 | 327 | 0.0174 | 0.0150 | 0.0254 | 0.0167 | 3/3 | 3/3 | 3/3 | 3/3 |
| retry | 677 | 640 | 460 | 422 | 0.0196 | 0.0191 | 0.0283 | 0.0182 | 3/3 | 3/3 | 3/3 | 3/3 |
| safe-join | 1293 | 1130 | 1174 | 725 | 0.0264 | 0.0248 | 0.0366 | 0.0217 | 3/3 | 3/3 | 3/3 | 3/3 |
| cache | 673 | 646 | 554 | 491 | 0.0202 | 0.0199 | 0.0298 | 0.0205 | 3/3 | 3/3 | 3/3 | 3/3 |
| explain-default-arg | 377 | 329 | 292 | 183 | 0.0135 | 0.0130 | 0.0231 | 0.0129 | 3/3 | 3/3 | 3/3 | 3/3 |
| explain-rebase | 1329 | 1248 | 1114 | 1048 | 0.0229 | 0.0222 | 0.0312 | 0.0214 | 3/3 | 3/3 | 3/3 | 3/3 |
| shared-cause | 580 | 527 | 773 | 512 | 0.0201 | 0.0195 | 0.0341 | 0.0208 | 3/3 | 3/3 | 3/3 | 3/3 |
| pager | 766 | 749 | 871 | 604 | 0.0209 | 0.0214 | 0.0345 | 0.0225 | 3/3 | 3/3 | 3/3 | 3/3 |
| review-sql | 705 | 631 | 424 | 413 | 0.0168 | 0.0161 | 0.0244 | 0.0152 | 3/3 | 3/3 | 3/3 | 3/3 |
| explain-rerender | 811 | 675 | 583 | 478 | 0.0178 | 0.0164 | 0.0259 | 0.0157 | 3/3 | 3/3 | 3/3 | 3/3 |

## Input overhead

Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.

| Arm | New input tokens | Against off |
| :--- | ---: | ---: |
| off | 34464 | baseline |
| terse | 34569 | +0% |
| on | 68761 | +100% |
| lean | 38770 | +12% |
