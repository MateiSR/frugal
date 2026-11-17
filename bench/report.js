#!/usr/bin/env node
// Render bench/results/<stamp>/results.json as Markdown. Free: makes no API calls.
//   node bench/report.js <stamp>      prints the report and writes report.md beside the results
// Method: collapse each task's runs by median, pair every arm with "off" per task,
// report the median of the per-task changes, with an exact two-sided Wilcoxon signed-rank p.
const fs = require('fs');
const path = require('path');

const stamp = process.argv[2];
const dir = path.join(__dirname, 'results', stamp || '');
const { meta, results } = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
const pct = (x) => (Number.isFinite(x) ? `${x > 0 ? '+' : ''}${(x * 100).toFixed(0)}%` : 'n/a');

// Exact two-sided Wilcoxon signed-rank test; null for fewer than 6 non-zero pairs.
function wilcoxon(diffs) {
  const d = diffs.filter((x) => x !== 0 && Number.isFinite(x));
  const n = d.length;
  if (n < 6) return null;
  const order = d.map((x, i) => [Math.abs(x), i]).sort((a, b) => a[0] - b[0]);
  const rank = new Array(n);
  for (let i = 0; i < n;) { let j = i; while (j < n && order[j][0] === order[i][0]) j++; for (let k = i; k < j; k++) rank[order[k][1]] = (i + j + 1) / 2; i = j; }
  const mean = n * (n + 1) / 4;
  const observed = Math.abs(d.reduce((s, x, i) => s + (x > 0 ? rank[i] : 0), 0) - mean);
  let extreme = 0;
  for (let mask = 0; mask < 1 << n; mask++) { let w = 0; for (let i = 0; i < n; i++) if (mask >> i & 1) w += rank[i]; if (Math.abs(w - mean) >= observed - 1e-9) extreme++; }
  return extreme / (1 << n);
}

for (const r of results) r.lines = r.loc_all ?? r.loc; // loc_all: every code line the session wrote (stamps before v0.5 only counted the target file)
const valid = results.filter((r) => r.ok && r.arm_ok !== false);
const tasks = [...new Set(results.map((r) => r.task))];
const arms = meta.arms;
const METRICS = [['output', 'Output tokens'], ['cost_usd', 'Cost'], ['duration_ms', 'Time'], ['turns', 'Turns'], ['lines', 'Code lines written']];
// cell[task][arm][metric] = median over runs
const cell = {};
for (const t of tasks) {
  cell[t] = {};
  for (const a of arms) {
    const rs = valid.filter((r) => r.task === t && r.arm === a);
    cell[t][a] = Object.fromEntries(METRICS.map(([m]) => [m, median(rs.map((r) => r[m]).filter((v) => v != null))]));
    cell[t][a].n = rs.length;
    cell[t][a].pass = rs.filter((r) => r.pass).length;
    cell[t][a].input_new = median(rs.map((r) => r.input + r.cache_write));
  }
}
const change = (t, a, m) => (cell[t][a][m] - cell[t].off[m]) / cell[t].off[m];

const L = [];
L.push(`# Benchmark: ${meta.stamp}`, '');
L.push(`Model \`${meta.model}\` · ${tasks.length} tasks × ${meta.runs} runs × ${arms.length} arms = ${results.length} sessions · ${meta.claude} · plugin commit \`${meta.commit}\` · ${meta.date.slice(0, 10)}`, '');
const ARM_NOTES = {
  off: 'default Claude Code',
  terse: 'adds the one-line system prompt "Be concise."',
  on: 'frugal as shipped at the plugin commit above (before v0.4: the long rules plus a per-prompt reminder)',
  full: 'frugal with the long rules in `bench/variants/full.md`',
  caveman: `Caveman${meta.rivals?.caveman ? ` at \`${meta.rivals.caveman}\`` : ''}, full mode`,
  ponytail: `Ponytail${meta.rivals?.ponytail ? ` at \`${meta.rivals.ponytail}\`` : ''}, full mode`,
  honey: `Honey${meta.rivals?.['honey-for-devs'] ? ` at \`${meta.rivals['honey-for-devs']}\`` : ''}, full mode`,
  lean: 'frugal with the short rules and no per-prompt reminder; these became the shipped rules in v0.4',
};
L.push(`Arms: ${arms.map((a) => `\`${a}\` is ${ARM_NOTES[a] || (a.startsWith('v-') ? `frugal with the rules in \`bench/variants/${a.slice(2)}.md\`` : 'undocumented')}`).join('; ')}. No user settings, rules, other plugins or MCP servers in any arm.`, '');
const excluded = results.length - valid.length;
if (excluded) L.push(`Excluded ${excluded} session(s): errors, refusals or a hook firing in the wrong arm.`, '');

L.push('## Summary', '', 'Median change per task against `off`. `(ns)` means not statistically significant (p ≥ 0.05); `—` means too few tasks to test.', '');
L.push(`| Arm | ${METRICS.map(([, label]) => label).join(' | ')} | Checks passed |`, `| :--- | ${METRICS.map(() => '---:').join(' | ')} | ---: |`);
for (const a of arms) {
  const passed = tasks.reduce((s, t) => s + cell[t][a].pass, 0), total = tasks.reduce((s, t) => s + cell[t][a].n, 0);
  if (a === 'off') { L.push(`| off | ${METRICS.map(() => 'baseline').join(' | ')} | ${passed}/${total} |`); continue; }
  const cols = METRICS.map(([m]) => {
    const ds = tasks.map((t) => change(t, a, m)).filter(Number.isFinite);
    const p = wilcoxon(ds);
    return `${pct(median(ds))}${p == null ? ' —' : p < 0.001 ? ' (p<0.001)' : p < 0.05 ? ` (p=${p.toFixed(3)})` : ' (ns)'}`;
  });
  L.push(`| ${a} | ${cols.join(' | ')} | ${passed}/${total} |`);
}
L.push('', 'Cost is Claude Code\'s own `total_cost_usd` for the whole session, so it includes the tokens frugal injects. "Checks passed" is unit tests for code tasks, required facts for explanations, and "produced code" for the open-ended `pt-` tasks. Each rival plugin is the only plugin loaded in its arm.', '');

L.push('## Per task', '', 'Median output tokens, cost and checks passed per arm.', '');
L.push(`| Task | ${arms.map((a) => `${a} out`).join(' | ')} | ${arms.map((a) => `${a} $`).join(' | ')} | ${arms.map((a) => `${a} pass`).join(' | ')} |`, `| :--- | ${arms.flatMap(() => ['---:', '---:', '---:']).join(' | ')} |`);
for (const t of tasks) {
  L.push(`| ${t} | ${arms.map((a) => Math.round(cell[t][a].output)).join(' | ')} | ${arms.map((a) => cell[t][a].cost_usd.toFixed(4)).join(' | ')} | ${arms.map((a) => `${cell[t][a].pass}/${cell[t][a].n}`).join(' | ')} |`);
}
const sum = (a, m) => tasks.reduce((s, t) => s + cell[t][a][m], 0);
L.push('', '## Input overhead', '', 'Median uncached input tokens per session (fresh input plus cache writes), summed over tasks.', '');
L.push('| Arm | New input tokens | Against off |', '| :--- | ---: | ---: |');
for (const a of arms) L.push(`| ${a} | ${Math.round(sum(a, 'input_new'))} | ${a === 'off' ? 'baseline' : pct((sum(a, 'input_new') - sum('off', 'input_new')) / sum('off', 'input_new'))} |`);

const report = L.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'report.md'), report);
process.stdout.write(report);
