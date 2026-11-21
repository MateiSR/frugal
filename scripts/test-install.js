#!/usr/bin/env node
// Automated tests for scripts/install.js in a throwaway temporary HOME/XDG/project dir.
// Never touches the real home directory.
'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INSTALLER = path.join(ROOT, 'scripts', 'install.js');
const RULES = fs.readFileSync(path.join(ROOT, 'rules', 'frugal.md'), 'utf8').replace(/\r\n/g, '\n').trim();

function runInstaller(args, { home, xdg, cwd }) {
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    // Keep PATH minimal so real user binaries do not pollute detection unexpectedly,
    // while keeping node reachable if needed.
    PATH: path.dirname(process.execPath),
  };
  delete env.CODEX_HOME;
  delete env.KIRO_HOME;
  return cp.spawnSync(process.execPath, [INSTALLER, ...args], {
    cwd,
    env,
    encoding: 'utf8',
  });
}

function listFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-install-test-'));
  const home = path.join(tmp, 'home');
  const xdg = path.join(tmp, 'xdg');
  const project = path.join(tmp, 'project');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(xdg, { recursive: true });
  fs.mkdirSync(project, { recursive: true });

  const env = { home, xdg, cwd: project };
  const results = [];
  const check = (name, fn) => {
    fn();
    results.push(`ok   ${name}`);
  };

  try {
    // Seed pre-existing user files with tricky edge cases:
    // - no trailing newline
    // - single trailing LF
    // - double trailing LF
    // - CRLF line endings
    // - 0-byte empty file
    // - pre-existing frontmatter file
    const seeded = {
      codex: {
        path: path.join(home, '.codex', 'AGENTS.md'),
        content: '# My Codex rules\nKeep responses concise.', // no trailing newline
      },
      opencode: {
        path: path.join(xdg, 'opencode', 'AGENTS.md'),
        content: '# My OpenCode rules\n', // single LF
      },
      amp: {
        path: path.join(xdg, 'amp', 'AGENTS.md'),
        content: '# My Amp rules\n\n', // double LF
      },
      copilot: {
        path: path.join(home, '.copilot', 'copilot-instructions.md'),
        content: '# Copilot\r\nLine 2\r\n', // CRLF
      },
      grok: {
        path: path.join(home, '.grok', 'AGENTS.md'),
        content: '', // 0-byte existing file
      },
      kiro: {
        path: path.join(home, '.kiro', 'steering', 'frugal.md'),
        content: '---\ninclusion: manual\n---\n\n# User custom steering\n',
      },
    };

    for (const s of Object.values(seeded)) {
      fs.mkdirSync(path.dirname(s.path), { recursive: true });
      fs.writeFileSync(s.path, s.content, 'utf8');
    }

    const beforeDryFiles = listFilesRecursive(tmp);
    const beforeDryContents = Object.fromEntries(
      Object.entries(seeded).map(([k, s]) => [k, fs.readFileSync(s.path, 'utf8')])
    );

    check('list shows all 13 tools and detection status', () => {
      const r = runInstaller(['--list'], env);
      assert.strictEqual(r.status, 0, r.stderr);
      for (const id of [
        'cursor', 'windsurf', 'cline', 'copilot', 'kiro', 'kilo',
        'qoder', 'antigravity', 'codex', 'opencode', 'grok', 'goose', 'amp',
      ]) {
        assert.ok(r.stdout.includes(id), `missing ${id} in --list output`);
      }
      assert.ok(r.stdout.includes('detected'), 'expected detected marker');
      assert.ok(r.stdout.includes('not detected'), 'expected not detected marker');
    });

    check('unknown --only tool exits non-zero', () => {
      const r = runInstaller(['--only', 'nonexistent-tool'], env);
      assert.notStrictEqual(r.status, 0);
      assert.ok(r.stderr.includes('Unknown tool'));
    });

    check('dry-run changes nothing on global install', () => {
      const r = runInstaller(['--all', '--dry-run'], env);
      assert.strictEqual(r.status, 0, r.stderr);
      assert.ok(r.stdout.includes('[dry-run]'));
      assert.deepStrictEqual(listFilesRecursive(tmp), beforeDryFiles);
      for (const [k, s] of Object.entries(seeded)) {
        assert.strictEqual(fs.readFileSync(s.path, 'utf8'), beforeDryContents[k], `${k} changed in dry-run`);
      }
    });

    check('global install creates fresh files and appends to seeded files', () => {
      const r = runInstaller(['--all'], env);
      assert.strictEqual(r.status, 0, r.stderr);

      // Freshly created files with frontmatter
      const cursorFile = path.join(home, '.cursor', 'rules', 'frugal.mdc');
      const cursorText = fs.readFileSync(cursorFile, 'utf8');
      assert.ok(cursorText.startsWith('---\n'), 'cursor missing frontmatter');
      assert.ok(cursorText.includes('alwaysApply: true'), 'cursor missing alwaysApply: true');
      assert.ok(cursorText.includes(RULES), 'cursor missing exact rules');

      const qoderFile = path.join(home, '.qoder', 'rules', 'frugal.md');
      assert.ok(fs.readFileSync(qoderFile, 'utf8').includes('trigger: always_on'));
      assert.ok(fs.readFileSync(qoderFile, 'utf8').includes(RULES));

      const agyFile = path.join(home, '.gemini', 'config', 'rules', 'frugal.md');
      assert.ok(fs.readFileSync(agyFile, 'utf8').includes('trigger: always_on'));
      assert.ok(fs.readFileSync(agyFile, 'utf8').includes(RULES));

      // Freshly created files without frontmatter
      for (const p of [
        path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
        path.join(home, '.cline', 'rules', 'frugal.md'),
        path.join(xdg, 'kilo', 'AGENTS.md'),
        path.join(xdg, 'goose', '.goosehints'),
      ]) {
        const text = fs.readFileSync(p, 'utf8');
        assert.ok(text.includes(RULES), `${p} missing exact rules`);
        assert.strictEqual(countOccurrences(text, '<!-- frugal:begin -->'), 1);
        assert.strictEqual(countOccurrences(text, '<!-- frugal:end -->'), 1);
      }

      // Seeded files keep original content + have 1 marked block
      for (const [k, s] of Object.entries(seeded)) {
        const text = fs.readFileSync(s.path, 'utf8');
        assert.ok(text.startsWith(s.content), `${k} lost original prefix`);
        assert.ok(text.includes(RULES), `${k} missing exact rules`);
        assert.strictEqual(countOccurrences(text, '<!-- frugal:begin -->'), 1);
        assert.strictEqual(countOccurrences(text, '<!-- frugal:end -->'), 1);
      }
    });

    check('re-running global install produces no duplicate block', () => {
      const snapshotBefore = Object.fromEntries(
        listFilesRecursive(tmp).map((p) => [p, fs.readFileSync(p, 'utf8')])
      );
      const r = runInstaller(['--all'], env);
      assert.strictEqual(r.status, 0, r.stderr);
      const snapshotAfter = Object.fromEntries(
        listFilesRecursive(tmp).map((p) => [p, fs.readFileSync(p, 'utf8')])
      );
      assert.deepStrictEqual(snapshotAfter, snapshotBefore);
      for (const s of Object.values(seeded)) {
        const text = fs.readFileSync(s.path, 'utf8');
        assert.strictEqual(countOccurrences(text, '<!-- frugal:begin -->'), 1);
      }
    });

    check('dry-run uninstall changes nothing', () => {
      const snapshotBefore = Object.fromEntries(
        listFilesRecursive(tmp).map((p) => [p, fs.readFileSync(p, 'utf8')])
      );
      const r = runInstaller(['--all', '--uninstall', '--dry-run'], env);
      assert.strictEqual(r.status, 0, r.stderr);
      const snapshotAfter = Object.fromEntries(
        listFilesRecursive(tmp).map((p) => [p, fs.readFileSync(p, 'utf8')])
      );
      assert.deepStrictEqual(snapshotAfter, snapshotBefore);
    });

    check('freshly created file with user edits added later is NOT deleted on uninstall', () => {
      const windsurfGlobal = path.join(home, '.codeium', 'windsurf', 'memories', 'global_rules.md');
      fs.appendFileSync(windsurfGlobal, '\n# User note added later\n', 'utf8');
      const r = runInstaller(['--only', 'windsurf', '--uninstall'], env);
      assert.strictEqual(r.status, 0, r.stderr);
      assert.ok(fs.existsSync(windsurfGlobal), 'edited file should not be deleted');
      assert.strictEqual(fs.readFileSync(windsurfGlobal, 'utf8'), '# User note added later\n');
    });

    check('global uninstall removes fresh files and restores seeded files byte-for-byte', () => {
      const r = runInstaller(['--all', '--uninstall'], env);
      assert.strictEqual(r.status, 0, r.stderr);

      // Fresh untouched files deleted
      for (const p of [
        path.join(home, '.cursor', 'rules', 'frugal.mdc'),
        path.join(home, '.cline', 'rules', 'frugal.md'),
        path.join(home, '.qoder', 'rules', 'frugal.md'),
        path.join(home, '.gemini', 'config', 'rules', 'frugal.md'),
        path.join(xdg, 'kilo', 'AGENTS.md'),
        path.join(xdg, 'goose', '.goosehints'),
      ]) {
        assert.ok(!fs.existsSync(p), `${p} should have been deleted`);
      }

      // Seeded files restored byte-for-byte (including 0-byte grok file!)
      for (const [k, s] of Object.entries(seeded)) {
        assert.ok(fs.existsSync(s.path), `seeded ${k} must NOT be deleted`);
        assert.strictEqual(fs.readFileSync(s.path, 'utf8'), s.content, `seeded ${k} not restored byte-for-byte`);
      }

      // State file cleaned up once empty
      assert.ok(!fs.existsSync(path.join(xdg, 'frugal', 'installed.json')), 'state file should be cleaned up');
    });

    check('project install (--project --only) deduplicates shared AGENTS.md and uninstalls cleanly', () => {
      const r1 = runInstaller(['--project', '--only', 'cursor,windsurf,codex,opencode'], env);
      assert.strictEqual(r1.status, 0, r1.stderr);

      const agentsMd = path.join(project, 'AGENTS.md');
      const windsurfProj = path.join(project, '.windsurf', 'rules', 'frugal.md');
      const cursorProj = path.join(project, '.cursor', 'rules', 'frugal.mdc');

      assert.strictEqual(countOccurrences(fs.readFileSync(agentsMd, 'utf8'), '<!-- frugal:begin -->'), 1);
      assert.ok(fs.readFileSync(windsurfProj, 'utf8').includes('trigger: always_on'));
      assert.ok(fs.readFileSync(cursorProj, 'utf8').includes('alwaysApply: true'));

      // Re-install idempotent
      const r2 = runInstaller(['--project', '--only', 'cursor,windsurf,codex,opencode'], env);
      assert.strictEqual(r2.status, 0, r2.stderr);
      assert.strictEqual(countOccurrences(fs.readFileSync(agentsMd, 'utf8'), '<!-- frugal:begin -->'), 1);

      // Uninstall removes all created project files
      const r3 = runInstaller(['--project', '--only', 'cursor,windsurf,codex,opencode', '--uninstall'], env);
      assert.strictEqual(r3.status, 0, r3.stderr);
      assert.ok(!fs.existsSync(agentsMd));
      assert.ok(!fs.existsSync(windsurfProj));
      assert.ok(!fs.existsSync(cursorProj));
    });

    for (const line of results) console.log(line);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
