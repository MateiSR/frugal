#!/usr/bin/env node
// Compare two judge.jsonl files: mean rank per arm for each judge, top-1 and last-place agreement, and mean Spearman correlation.
//   node bench/agree.js <judge-a.jsonl> <judge-b.jsonl>
'use strict';

const fs = require('fs');
const path = require('path');

function load(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}

function meanRanks(records) {
  const sum = {};
  const count = {};
  for (const r of records) {
    if (!Array.isArray(r.ranking)) continue;
    r.ranking.forEach((arm, idx) => {
      sum[arm] = (sum[arm] || 0) + (idx + 1);
      count[arm] = (count[arm] || 0) + 1;
    });
  }
  return Object.keys(sum)
    .map((arm) => ({ arm, mean: sum[arm] / count[arm], n: count[arm] }))
    .sort((a, b) => a.mean - b.mean || a.arm.localeCompare(b.arm));
}

function spearman(rankA, rankB) {
  const n = rankA.length;
  if (n < 2) return null;
  const posB = Object.fromEntries(rankB.map((arm, idx) => [arm, idx + 1]));
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    const b = posB[rankA[i]];
    if (b === undefined) return null;
    const d = (i + 1) - b;
    d2 += d * d;
  }
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function labelFor(file, records) {
  const dir = path.basename(path.dirname(path.resolve(file)));
  const models = [...new Set(records.map((r) => r.model).filter(Boolean))];
  return models.length ? `${dir} (${models.join(', ')})` : dir;
}

function compare(fileA, fileB) {
  const recA = load(fileA);
  const recB = load(fileB);
  const mapA = new Map(recA.map((r) => [`${r.task}\0${r.pass}`, r]));
  let pairs = 0;
  let sameFirst = 0;
  let sameLast = 0;
  let rhoSum = 0;
  let rhoCount = 0;

  for (const b of recB) {
    const a = mapA.get(`${b.task}\0${b.pass}`);
    if (!a || !Array.isArray(a.ranking) || !Array.isArray(b.ranking)) continue;
    if (a.ranking.length !== b.ranking.length || a.ranking.length === 0) continue;
    const rho = spearman(a.ranking, b.ranking);
    if (rho === null) continue;
    pairs++;
    if (a.ranking[0] === b.ranking[0]) sameFirst++;
    if (a.ranking[a.ranking.length - 1] === b.ranking[b.ranking.length - 1]) sameLast++;
    rhoSum += rho;
    rhoCount++;
  }

  return {
    judgeA: { label: labelFor(fileA, recA), count: recA.length, ranks: meanRanks(recA) },
    judgeB: { label: labelFor(fileB, recB), count: recB.length, ranks: meanRanks(recB) },
    pairs,
    sameFirst,
    sameLast,
    meanSpearman: rhoCount ? rhoSum / rhoCount : null,
  };
}

function format(res) {
  const lines = [];
  for (const j of [res.judgeA, res.judgeB]) {
    lines.push(`${j.label} (${j.count} records) — mean rank (1 is best):`);
    for (const r of j.ranks) lines.push(`  ${r.arm.padEnd(12)} ${r.mean.toFixed(2)} (n=${r.n})`);
    lines.push('');
  }
  lines.push(`Agreement over ${res.pairs} paired task-and-pass comparison(s):`);
  if (!res.pairs) {
    lines.push('  No overlapping task-and-pass pairs found.');
  } else {
    const pct = (k) => `${((k / res.pairs) * 100).toFixed(1)}%`;
    lines.push(`  Same first place:        ${res.sameFirst}/${res.pairs} (${pct(res.sameFirst)})`);
    lines.push(`  Same last place:         ${res.sameLast}/${res.pairs} (${pct(res.sameLast)})`);
    lines.push(`  Mean Spearman rho:       ${res.meanSpearman.toFixed(3)}`);
  }
  return lines.join('\n');
}

module.exports = { load, meanRanks, spearman, compare, format };

if (require.main === module) {
  const [fileA, fileB] = process.argv.slice(2);
  if (!fileA || !fileB) {
    console.error('Usage: node bench/agree.js <judge-a.jsonl> <judge-b.jsonl>');
    process.exit(1);
  }
  console.log(format(compare(fileA, fileB)));
}
