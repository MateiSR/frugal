#!/usr/bin/env node
// Merge or remove frugal's Cursor hooks in ~/.cursor/hooks.json (or .cursor/hooks.json with --project).
// Preserves all non-frugal hooks and refuses to modify malformed JSON.
// Usage: node scripts/cursor-hooks.js install|uninstall [--project] [--dry-run]
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'hooks', 'cursor-hooks.json');
const FRUGAL_HOOK_RE = /[\\/]hooks[\\/]frugal\.js(?=["'\s]|$)/;

function isFrugalHook(entry) {
  return Boolean(entry && typeof entry.command === 'string' && FRUGAL_HOOK_RE.test(entry.command));
}

function hooksPath(scope, cwd = process.cwd()) {
  const home = process.env.HOME || os.homedir();
  return scope === 'project'
    ? path.join(cwd, '.cursor', 'hooks.json')
    : path.join(home, '.cursor', 'hooks.json');
}

function readConfig(file) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${file} must contain a JSON object; nothing was changed`);
  }
  if (config.hooks === undefined) config.hooks = {};
  if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    throw new Error(`${file}: hooks must be an object; nothing was changed`);
  }
  for (const [event, entries] of Object.entries(config.hooks)) {
    if (!Array.isArray(entries)) {
      throw new Error(`${file}: hooks.${event} must be an array; nothing was changed`);
    }
  }
  return config;
}

function frugalEntries() {
  const root = ROOT.replace(/\\/g, '/');
  if (/["`$\\;\n\r|&<>]/.test(root)) {
    throw new Error(`frugal path contains unsafe shell characters (${ROOT}); configure hooks.json manually`);
  }
  const template = JSON.parse(fs.readFileSync(TEMPLATE, 'utf8'));
  const hooks = {};
  for (const [event, entries] of Object.entries(template.hooks)) {
    hooks[event] = entries.map((entry) => ({
      ...entry,
      command: entry.command.replace(/FRUGAL_DIR/g, root),
    }));
  }
  return hooks;
}

function stripFrugal(config) {
  for (const [event, entries] of Object.entries(config.hooks)) {
    const kept = entries.filter((entry) => !isFrugalHook(entry));
    if (kept.length) config.hooks[event] = kept;
    else delete config.hooks[event];
  }
}

function install(scope, { dryRun = false, cwd = process.cwd() } = {}) {
  const file = hooksPath(scope, cwd);
  const config = readConfig(file);
  if (config.version === undefined) config.version = 1;
  stripFrugal(config);
  for (const [event, entries] of Object.entries(frugalEntries())) {
    config.hooks[event] = [...(config.hooks[event] || []), ...entries];
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
  }
  return file;
}

function uninstall(scope, { dryRun = false, cwd = process.cwd() } = {}) {
  const file = hooksPath(scope, cwd);
  if (!fs.existsSync(file)) return { action: 'skip', file };
  const config = readConfig(file);
  const before = JSON.stringify(config);
  stripFrugal(config);
  if (JSON.stringify(config) === before) return { action: 'skip', file };

  const otherKeys = Object.keys(config).filter((k) => k !== 'version' && k !== 'hooks');
  if (Object.keys(config.hooks).length === 0 && otherKeys.length === 0) {
    if (!dryRun) fs.unlinkSync(file);
    return { action: 'delete', file };
  }
  if (!dryRun) {
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
  }
  return { action: 'remove-entries', file };
}

module.exports = { hooksPath, isFrugalHook, install, uninstall };

if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args.find((a) => !a.startsWith('-'));
  const scope = args.includes('--project') ? 'project' : 'user';
  const dryRun = args.includes('--dry-run');
  const prefix = dryRun ? '[dry-run] ' : '';

  try {
    if (action === 'install') {
      const file = install(scope, { dryRun });
      console.log(`${prefix}installed frugal hooks in ${file}`);
    } else if (action === 'uninstall') {
      const res = uninstall(scope, { dryRun });
      console.log(`${prefix}${res.action} ${res.file}`);
    } else {
      console.error('Usage: node scripts/cursor-hooks.js install|uninstall [--project] [--dry-run]');
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof SyntaxError ? `${hooksPath(scope)} is not valid JSON (${err.message}); nothing was changed` : err.message);
    process.exit(1);
  }
}
