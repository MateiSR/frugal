#!/usr/bin/env node
// Install or remove static frugal rules (rules/frugal.md) for coding tools.
// Usage: node scripts/install.js [--list] [--only tool[,tool]] [--project] [--all] [--dry-run] [--uninstall]
'use strict';

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readRules } = require('./build-rules');

const BEGIN = '<!-- frugal:begin -->';
const END = '<!-- frugal:end -->';
const DESC = 'Write less code and shorter replies without cutting correctness.';

const FRONTMATTER = {
  cursor: `---\ndescription: ${DESC}\nalwaysApply: true\n---\n\n`,
  alwaysOn: '---\ntrigger: always_on\n---\n\n',
  kiro: '---\ninclusion: always\n---\n\n',
};

function homeDir() {
  return process.env.HOME || os.homedir();
}

function xdgConfigDir() {
  return process.env.XDG_CONFIG_HOME || path.join(homeDir(), '.config');
}

function stateFile() {
  return path.join(xdgConfigDir(), 'frugal', 'installed.json');
}

function which(cmd) {
  try {
    cp.execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function getTools(cwd) {
  const home = homeDir();
  const xdg = xdgConfigDir();
  const codexHome = process.env.CODEX_HOME || path.join(home, '.codex');
  const kiroHome = process.env.KIRO_HOME || path.join(home, '.kiro');

  return [
    {
      id: 'cursor',
      name: 'Cursor',
      globalPath: path.join(home, '.cursor', 'rules', 'frugal.mdc'),
      projectPath: path.join(cwd, '.cursor', 'rules', 'frugal.mdc'),
      globalFrontmatter: FRONTMATTER.cursor,
      projectFrontmatter: FRONTMATTER.cursor,
      detect: () => which('cursor') || existsDir(path.join(home, '.cursor')),
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      globalPath: path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
      projectPath: path.join(cwd, '.windsurf', 'rules', 'frugal.md'),
      globalFrontmatter: '',
      projectFrontmatter: FRONTMATTER.alwaysOn,
      detect: () => which('windsurf') || existsDir(path.join(home, '.codeium', 'windsurf')),
    },
    {
      id: 'cline',
      name: 'Cline',
      globalPath: path.join(home, '.cline', 'rules', 'frugal.md'),
      projectPath: path.join(cwd, '.clinerules', 'frugal.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('cline') || existsDir(path.join(home, '.cline')) || existsDir(path.join(home, 'Documents', 'Cline')),
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot (VS Code)',
      globalPath: path.join(home, '.copilot', 'copilot-instructions.md'),
      projectPath: path.join(cwd, '.github', 'copilot-instructions.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('code') || existsDir(path.join(home, '.copilot')) || existsDir(path.join(home, '.vscode')),
    },
    {
      id: 'kiro',
      name: 'Kiro',
      globalPath: path.join(kiroHome, 'steering', 'frugal.md'),
      projectPath: path.join(cwd, '.kiro', 'steering', 'frugal.md'),
      globalFrontmatter: FRONTMATTER.kiro,
      projectFrontmatter: FRONTMATTER.kiro,
      detect: () => which('kiro') || which('kiro-cli') || existsDir(kiroHome),
    },
    {
      id: 'kilo',
      name: 'Kilo Code',
      globalPath: path.join(xdg, 'kilo', 'AGENTS.md'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('kilo') || existsDir(path.join(xdg, 'kilo')) || existsDir(path.join(home, '.kilocode')),
    },
    {
      id: 'qoder',
      name: 'Qoder',
      globalPath: path.join(home, '.qoder', 'rules', 'frugal.md'),
      projectPath: path.join(cwd, '.qoder', 'rules', 'frugal.md'),
      globalFrontmatter: FRONTMATTER.alwaysOn,
      projectFrontmatter: FRONTMATTER.alwaysOn,
      detect: () => which('qoder') || which('qodercli') || existsDir(path.join(home, '.qoder')),
    },
    {
      id: 'antigravity',
      name: 'Antigravity IDE',
      globalPath: path.join(home, '.gemini', 'config', 'rules', 'frugal.md'),
      projectPath: path.join(cwd, '.agents', 'rules', 'frugal.md'),
      globalFrontmatter: FRONTMATTER.alwaysOn,
      projectFrontmatter: FRONTMATTER.alwaysOn,
      detect: () => which('antigravity') || which('agy') || existsDir(path.join(home, '.gemini', 'antigravity')) || existsDir(path.join(home, '.gemini', 'config')),
    },
    {
      id: 'codex',
      name: 'Codex',
      globalPath: path.join(codexHome, 'AGENTS.md'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('codex') || existsDir(codexHome),
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      globalPath: path.join(xdg, 'opencode', 'AGENTS.md'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('opencode') || existsDir(path.join(xdg, 'opencode')),
    },
    {
      id: 'grok',
      name: 'Grok',
      globalPath: path.join(home, '.grok', 'AGENTS.md'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('grok') || existsDir(path.join(home, '.grok')),
    },
    {
      id: 'goose',
      name: 'Goose',
      globalPath: path.join(xdg, 'goose', '.goosehints'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('goose') || existsDir(path.join(xdg, 'goose')),
    },
    {
      id: 'amp',
      name: 'Amp',
      globalPath: path.join(xdg, 'amp', 'AGENTS.md'),
      projectPath: path.join(cwd, 'AGENTS.md'),
      globalFrontmatter: '',
      projectFrontmatter: '',
      detect: () => which('amp') || existsDir(path.join(xdg, 'amp')),
    },
  ];
}

function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    return {
      created: new Set(Array.isArray(data.created) ? data.created : []),
      modified: new Set(Array.isArray(data.modified) ? data.modified : []),
    };
  } catch {
    return { created: new Set(), modified: new Set() };
  }
}

function saveState(state) {
  const file = stateFile();
  const created = [...state.created].sort();
  const modified = [...state.modified].sort();
  if (created.length === 0 && modified.length === 0) {
    try { fs.unlinkSync(file); } catch {}
    try { fs.rmdirSync(path.dirname(file)); } catch {}
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ created, modified }, null, 2) + '\n', 'utf8');
}

function formatBlock(rules) {
  return `${BEGIN}\n${rules}${END}\n`;
}

function findBlock(text) {
  const start = text.indexOf(BEGIN);
  if (start === -1) return null;
  const endMarker = text.indexOf(END, start + BEGIN.length);
  if (endMarker === -1) return null;
  let end = endMarker + END.length;
  if (text[end] === '\r' && text[end + 1] === '\n') end += 2;
  else if (text[end] === '\n') end += 1;
  return { start, end };
}

function installFile(targetPath, frontmatter, rules, state, dryRun) {
  const abs = path.resolve(targetPath);
  const block = formatBlock(rules);

  if (!fs.existsSync(abs)) {
    const content = frontmatter + block;
    if (dryRun) return { action: 'create', path: abs };
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    state.created.add(abs);
    state.modified.delete(abs);
    return { action: 'create', path: abs };
  }

  const current = fs.readFileSync(abs, 'utf8');
  const existing = findBlock(current);
  let next;
  let action;

  if (existing) {
    next = current.slice(0, existing.start) + block + current.slice(existing.end);
    action = next === current ? 'unchanged' : 'update';
  } else {
    // Prefix with a single LF when non-empty so uninstall can reverse the exact bytes.
    const prefix = current.length > 0 ? '\n' : '';
    next = current + prefix + block;
    action = 'append';
  }

  if (dryRun) return { action, path: abs };
  if (next !== current) {
    fs.writeFileSync(abs, next, 'utf8');
  }
  if (!state.created.has(abs)) {
    state.modified.add(abs);
  }
  return { action, path: abs };
}

function uninstallFile(targetPath, frontmatter, state, dryRun) {
  const abs = path.resolve(targetPath);
  if (!fs.existsSync(abs)) {
    if (!dryRun) {
      state.created.delete(abs);
      state.modified.delete(abs);
    }
    return { action: 'skip', path: abs };
  }

  const current = fs.readFileSync(abs, 'utf8');
  const existing = findBlock(current);
  if (!existing) {
    return { action: 'skip', path: abs };
  }

  const wasCreated = state.created.has(abs);
  const wasModified = state.modified.has(abs);
  const before = current.slice(0, existing.start);
  const after = current.slice(existing.end);

  // If frugal created this file and nothing else remains (besides frugal's own frontmatter), delete it.
  if (wasCreated && !wasModified) {
    const onlyFrugalHeader = before === '' || (frontmatter !== '' && before === frontmatter);
    if (onlyFrugalHeader && after.trim() === '') {
      if (dryRun) return { action: 'delete', path: abs };
      fs.unlinkSync(abs);
      state.created.delete(abs);
      return { action: 'delete', path: abs };
    }
  }

  // Otherwise strip only the marked block (and the exact separator LF added on append).
  let next;
  if (after === '' && !wasCreated && before.endsWith('\n')) {
    next = before.slice(0, -1);
  } else if (before === '' && after.startsWith('\n')) {
    next = after.replace(/^\n+/, '');
  } else {
    next = before + after;
  }

  if (dryRun) return { action: 'remove-block', path: abs };
  fs.writeFileSync(abs, next, 'utf8');
  state.created.delete(abs);
  state.modified.delete(abs);
  return { action: 'remove-block', path: abs };
}

function parseArgs(argv) {
  const opts = {
    list: false,
    project: false,
    dryRun: false,
    uninstall: false,
    all: false,
    help: false,
    only: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') opts.list = true;
    else if (arg === '--project') opts.project = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--uninstall') opts.uninstall = true;
    else if (arg === '--all') opts.all = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--only') {
      const val = argv[++i];
      if (!val || val.startsWith('-')) throw new Error('--only requires a tool name');
      for (const item of val.split(',')) {
        const id = item.trim().toLowerCase();
        if (id) opts.only.push(id);
      }
    } else if (arg.startsWith('--only=')) {
      for (const item of arg.slice('--only='.length).split(',')) {
        const id = item.trim().toLowerCase();
        if (id) opts.only.push(id);
      }
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

function printHelp() {
  console.log([
    'Usage: node scripts/install.js [options]',
    '',
    'Options:',
    '  --list                 List supported tools, target paths, and detection status',
    '  --only <t>[,<t>]       Install or uninstall only the named tool(s)',
    '  --project              Write into the current directory instead of global paths',
    '  --all                  Target all supported tools even if not detected',
    '  --dry-run              Print planned changes without modifying any files',
    '  --uninstall            Remove frugal blocks (and files created by frugal)',
    '  -h, --help             Show this help',
  ].join('\n'));
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    return;
  }

  const tools = getTools(process.cwd());
  const byId = new Map(tools.map((t) => [t.id, t]));

  for (const id of opts.only) {
    if (!byId.has(id)) {
      console.error(`Unknown tool: ${id}\nSupported tools: ${tools.map((t) => t.id).join(', ')}`);
      process.exit(1);
    }
  }

  if (opts.list) {
    const scope = opts.project ? 'project' : 'global';
    console.log(`Supported tools (${scope} paths):\n`);
    for (const t of tools) {
      const target = opts.project ? t.projectPath : t.globalPath;
      const detected = t.detect() ? 'detected' : 'not detected';
      console.log(`  ${t.id.padEnd(13)} ${detected.padEnd(14)} ${target}`);
    }
    return;
  }

  let selected;
  if (opts.only.length > 0) {
    selected = opts.only.map((id) => byId.get(id));
  } else if (opts.all) {
    selected = tools;
  } else {
    selected = tools.filter((t) => t.detect());
  }

  if (selected.length === 0) {
    console.log('No supported tools detected. Run with --list to see tools, or use --only <tool> / --all.');
    return;
  }

  const rules = readRules();
  const state = loadState();
  const seenPaths = new Set();
  const prefix = opts.dryRun ? '[dry-run] ' : '';

  for (const t of selected) {
    const targetPath = opts.project ? t.projectPath : t.globalPath;
    const frontmatter = opts.project ? t.projectFrontmatter : t.globalFrontmatter;
    const abs = path.resolve(targetPath);
    if (seenPaths.has(abs)) continue;
    seenPaths.add(abs);

    const res = opts.uninstall
      ? uninstallFile(abs, frontmatter, state, opts.dryRun)
      : installFile(abs, frontmatter, rules, state, opts.dryRun);

    console.log(`${prefix}${res.action.padEnd(13)} ${t.id.padEnd(13)} ${res.path}`);
  }

  if (!opts.dryRun) {
    saveState(state);
  }
}

module.exports = { BEGIN, END, FRONTMATTER, getTools, installFile, uninstallFile, parseArgs };

if (require.main === module) {
  main();
}
