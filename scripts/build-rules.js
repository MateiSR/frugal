#!/usr/bin/env node
// Generate static rule copies from rules/frugal.md (single source of truth).
// Run `node scripts/build-rules.js` to write them, or `--check` to verify sync.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'rules', 'frugal.md');

function readRules() {
  const text = fs.readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n').trim();
  if (!text) throw new Error('rules/frugal.md is empty');
  return text + '\n';
}

const TARGETS = [
  {
    path: 'AGENTS.md',
    render: (rules) => rules,
  },
];

function build(check) {
  const rules = readRules();
  const drifted = [];

  for (const target of TARGETS) {
    const abs = path.join(ROOT, target.path);
    const expected = target.render(rules);
    if (!expected.includes(rules.trim())) {
      throw new Error(`Rendered output for ${target.path} does not contain rules/frugal.md unchanged`);
    }
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
    if (check) {
      if (current !== expected) drifted.push(target.path);
    } else if (current !== expected) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, expected, 'utf8');
      console.log(`wrote ${target.path}`);
    }
  }

  if (check) {
    if (drifted.length) {
      console.error(`Out of date with rules/frugal.md:\n  ${drifted.join('\n  ')}\nRun: node scripts/build-rules.js`);
      process.exit(1);
    }
    console.log(`ok (${TARGETS.length} file${TARGETS.length === 1 ? '' : 's'} in sync)`);
  }
}

module.exports = { ROOT, SOURCE, TARGETS, readRules };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/build-rules.js [--check]');
    process.exit(0);
  }
  build(args.includes('--check'));
}
