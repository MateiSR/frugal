#!/usr/bin/env node
// Automated tests for multi-tool hooks, Cursor hooks merger, OpenCode plugin, and Pi extension.
// Runs against throwaway temporary directories; never touches the real home directory.
'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(ROOT, 'hooks', 'frugal.js');
const CURSOR_SCRIPT = path.join(ROOT, 'scripts', 'cursor-hooks.js');
const RULES = fs.readFileSync(path.join(ROOT, 'rules', 'frugal.md'), 'utf8').replace(/\r\n/g, '\n').trim();

function runHook(args, stdinObj, envExtra = {}) {
  const input = typeof stdinObj === 'string' ? stdinObj : JSON.stringify(stdinObj);
  return cp.spawnSync(process.execPath, [HOOK, ...args], {
    input,
    encoding: 'utf8',
    env: { ...process.env, ...envExtra },
  });
}

function runNode(script, args, { home, cwd }) {
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-hooks-test-'));
  const results = [];
  const check = async (name, fn) => {
    await fn();
    results.push(`ok   ${name}`);
  };

  try {
    await check('Claude Code hooks unchanged (session, subagent, prompt, invalid JSON)', () => {
      const dir = path.join(tmp, 'claude-state');
      const env = { FRUGAL_DIR: dir };
      delete env.CURSOR_VERSION;

      const r1 = runHook(['session'], { session_id: 's1', cwd: '/tmp/p', source: 'startup' }, env);
      assert.strictEqual(r1.status, 0);
      const out1 = JSON.parse(r1.stdout);
      assert.strictEqual(out1.hookSpecificOutput.hookEventName, 'SessionStart');
      assert.strictEqual(out1.hookSpecificOutput.additionalContext, RULES);

      // Ordinary prompt emits nothing
      const r2 = runHook(['prompt'], { session_id: 's1', cwd: '/tmp/p', prompt: 'hello' }, env);
      assert.strictEqual(r2.status, 0);
      assert.strictEqual(r2.stdout, '');

      // /frugal off blocks prompt with reply
      const r3 = runHook(['prompt'], { session_id: 's1', cwd: '/tmp/p', prompt: '/frugal off' }, env);
      const out3 = JSON.parse(r3.stdout);
      assert.strictEqual(out3.decision, 'block');
      assert.ok(out3.reason.includes('Frugal mode off'));

      // Next prompt announces disregard notice
      const r4 = runHook(['prompt'], { session_id: 's1', cwd: '/tmp/p', prompt: 'hello' }, env);
      const out4 = JSON.parse(r4.stdout);
      assert.strictEqual(out4.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
      assert.ok(out4.hookSpecificOutput.additionalContext.includes('Frugal mode is now off'));

      // /frugal on re-injects rules on next prompt
      runHook(['prompt'], { session_id: 's1', cwd: '/tmp/p', prompt: '/frugal on' }, env);
      const r5 = runHook(['prompt'], { session_id: 's1', cwd: '/tmp/p', prompt: 'hello' }, env);
      assert.strictEqual(JSON.parse(r5.stdout).hookSpecificOutput.additionalContext, RULES);

      // Subagent: skipped agent gets nothing, normal agent gets rules
      const r6 = runHook(['subagent'], { session_id: 's1', cwd: '/tmp/p', agent_type: 'frugal:visual-verifier' }, env);
      assert.strictEqual(r6.stdout, '');
      const r7 = runHook(['subagent'], { session_id: 's1', cwd: '/tmp/p', agent_type: 'frugal:stream-worker' }, env);
      assert.strictEqual(JSON.parse(r7.stdout).hookSpecificOutput.additionalContext, RULES);

      // Malformed stdin never crashes (exits 0; prompt emits nothing)
      const r8 = runHook(['session'], 'not json', env);
      assert.strictEqual(r8.status, 0);
      const r9 = runHook(['prompt'], 'not json', env);
      assert.strictEqual(r9.status, 0);
      assert.strictEqual(r9.stdout, '');
    });

    await check('Codex hooks output hookSpecificOutput JSON and respect toggle', () => {
      const dir = path.join(tmp, 'codex-state');
      const env = { FRUGAL_DIR: dir };

      const r1 = runHook(['session', '--host', 'codex'], { session_id: 'cx1', cwd: '/tmp/p' }, env);
      assert.strictEqual(r1.status, 0);
      const out1 = JSON.parse(r1.stdout);
      assert.strictEqual(out1.hookSpecificOutput.hookEventName, 'SessionStart');
      assert.strictEqual(out1.hookSpecificOutput.additionalContext, RULES);

      const r2 = runHook(['prompt', '--host', 'codex'], { session_id: 'cx1', cwd: '/tmp/p', prompt: '/frugal off' }, env);
      assert.strictEqual(JSON.parse(r2.stdout).decision, 'block');

      const r3 = runHook(['prompt', '--host', 'codex'], { session_id: 'cx1', cwd: '/tmp/p', prompt: 'hi' }, env);
      assert.ok(JSON.parse(r3.stdout).hookSpecificOutput.additionalContext.includes('Frugal mode is now off'));
    });

    await check('Copilot CLI hooks output top-level additionalContext and respect toggle', () => {
      const dir = path.join(tmp, 'copilot-state');
      const env = { FRUGAL_DIR: dir };

      const r1 = runHook(['session', '--host', 'copilot'], { sessionId: 'cp1', cwd: '/tmp/p' }, env);
      assert.strictEqual(r1.status, 0);
      const out1 = JSON.parse(r1.stdout);
      assert.strictEqual(out1.additionalContext, RULES);
      assert.strictEqual(out1.hookSpecificOutput, undefined);

      const r2 = runHook(['prompt', '--host', 'copilot'], { sessionId: 'cp1', cwd: '/tmp/p', prompt: '/frugal off' }, env);
      assert.strictEqual(JSON.parse(r2.stdout).decision, 'block');

      const r3 = runHook(['session', '--host', 'copilot'], { sessionId: 'cp1', cwd: '/tmp/p' }, env);
      assert.strictEqual(r3.stdout, '');
    });

    await check('Cursor hooks output additional_context and continue/user_message', () => {
      const dir = path.join(tmp, 'cursor-state');
      const env = { FRUGAL_DIR: dir };

      const r1 = runHook(['session', '--host', 'cursor'], { conversation_id: 'cur1', cwd: '/tmp/p' }, env);
      assert.strictEqual(r1.status, 0);
      assert.strictEqual(JSON.parse(r1.stdout).additional_context, RULES);

      const r2 = runHook(['prompt', '--host', 'cursor'], { conversation_id: 'cur1', cwd: '/tmp/p', prompt: '/frugal off' }, env);
      const out2 = JSON.parse(r2.stdout);
      assert.strictEqual(out2.continue, false);
      assert.ok(out2.user_message.includes('Frugal mode off'));

      const r3 = runHook(['prompt', '--host', 'cursor'], { conversation_id: 'cur1', cwd: '/tmp/p', prompt: 'hello' }, env);
      const out3 = JSON.parse(r3.stdout);
      assert.strictEqual(out3.continue, true);
      assert.ok(out3.additional_context.includes('Frugal mode is now off'));

      const r4 = runHook(['prompt', '--host', 'cursor'], { conversation_id: 'cur1', cwd: '/tmp/p', prompt: 'hello again' }, env);
      assert.strictEqual(r4.stdout, '');
    });

    await check('scripts/cursor-hooks.js merges, preserves user hooks, deduplicates, handles malformed JSON', () => {
      const home = path.join(tmp, 'cursor-home');
      const proj = path.join(tmp, 'cursor-proj');
      fs.mkdirSync(path.join(home, '.cursor'), { recursive: true });
      fs.mkdirSync(proj, { recursive: true });

      const userHooksFile = path.join(home, '.cursor', 'hooks.json');
      const existing = {
        version: 1,
        customKey: 'keep-me',
        hooks: {
          sessionStart: [{ command: 'echo user-start', timeout: 5 }],
          afterFileEdit: [{ command: 'echo user-lint' }],
        },
      };
      fs.writeFileSync(userHooksFile, JSON.stringify(existing, null, 2) + '\n', 'utf8');

      // dry-run changes nothing
      const d = runNode(CURSOR_SCRIPT, ['install', '--dry-run'], { home, cwd: proj });
      assert.strictEqual(d.status, 0, d.stderr);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(userHooksFile, 'utf8')), existing);

      // install merges cleanly
      const i1 = runNode(CURSOR_SCRIPT, ['install'], { home, cwd: proj });
      assert.strictEqual(i1.status, 0, i1.stderr);
      const merged = JSON.parse(fs.readFileSync(userHooksFile, 'utf8'));
      assert.strictEqual(merged.customKey, 'keep-me');
      assert.strictEqual(merged.hooks.sessionStart.length, 2);
      assert.strictEqual(merged.hooks.beforeSubmitPrompt.length, 1);
      assert.deepStrictEqual(merged.hooks.afterFileEdit, existing.hooks.afterFileEdit);

      // re-install does not duplicate
      const i2 = runNode(CURSOR_SCRIPT, ['install'], { home, cwd: proj });
      assert.strictEqual(i2.status, 0, i2.stderr);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(userHooksFile, 'utf8')), merged);

      // uninstall removes only frugal entries and preserves user hooks
      const u1 = runNode(CURSOR_SCRIPT, ['uninstall'], { home, cwd: proj });
      assert.strictEqual(u1.status, 0, u1.stderr);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(userHooksFile, 'utf8')), existing);

      // project install on fresh file, then uninstall deletes empty hooks.json
      const p1 = runNode(CURSOR_SCRIPT, ['install', '--project'], { home, cwd: proj });
      assert.strictEqual(p1.status, 0, p1.stderr);
      const projHooks = path.join(proj, '.cursor', 'hooks.json');
      assert.ok(fs.existsSync(projHooks));
      const p2 = runNode(CURSOR_SCRIPT, ['uninstall', '--project'], { home, cwd: proj });
      assert.strictEqual(p2.status, 0, p2.stderr);
      assert.ok(!fs.existsSync(projHooks), 'fresh project hooks.json should be deleted on uninstall');

      // malformed JSON refused without touching file
      fs.writeFileSync(userHooksFile, '{ broken json', 'utf8');
      const bad = runNode(CURSOR_SCRIPT, ['install'], { home, cwd: proj });
      assert.notStrictEqual(bad.status, 0);
      assert.strictEqual(fs.readFileSync(userHooksFile, 'utf8'), '{ broken json');
    });

    await check('OpenCode plugin v1 and v2 inject rules and toggle on/off', async () => {
      const prevDir = process.env.FRUGAL_DIR;
      process.env.FRUGAL_DIR = path.join(tmp, 'opencode-state');
      try {
        const mod = await import(pathToFileURL(path.join(ROOT, '.opencode', 'plugins', 'index.js')).href);
        // V1
        const v1 = await mod.FrugalPlugin();
        const out1 = { system: [] };
        await v1['experimental.chat.system.transform']({}, out1);
        assert.deepStrictEqual(out1.system, [RULES]);

        await v1['command.execute.before']({ command: 'frugal', arguments: 'off' });
        const out2 = { system: [] };
        await v1['experimental.chat.system.transform']({}, out2);
        assert.deepStrictEqual(out2.system, []);

        // V2
        await v1['command.execute.before']({ command: 'frugal', arguments: 'on' });
        const registered = {};
        await mod.default.setup({
          session: {
            hook: async (name, fn) => { registered[name] = fn; },
          },
        });
        const v2Event = { system: [] };
        registered.context(v2Event);
        assert.deepStrictEqual(v2Event.system, [{ type: 'text', text: RULES }]);
      } finally {
        if (prevDir === undefined) delete process.env.FRUGAL_DIR;
        else process.env.FRUGAL_DIR = prevDir;
      }
    });

    await check('Pi extension injects rules via before_agent_start and toggles via /frugal', async () => {
      const { default: frugalExt } = await import(pathToFileURL(path.join(ROOT, 'pi-extension', 'index.js')).href);
      const handlers = {};
      const commands = {};
      const entries = [];
      const notifications = [];
      const fakePi = {
        registerCommand: (name, spec) => { commands[name] = spec; },
        on: (ev, fn) => { handlers[ev] = fn; },
        appendEntry: (customType, data) => { entries.push({ type: 'custom', customType, data }); },
      };
      const fakeCtx = {
        ui: { notify: (msg) => notifications.push(msg) },
        sessionManager: { getBranch: () => entries },
      };

      frugalExt(fakePi);

      // Default on: sections shape
      const secEvent = { systemPromptOptions: { sections: {} } };
      await handlers.before_agent_start(secEvent);
      assert.strictEqual(secEvent.systemPromptOptions.sections.frugal, RULES);

      // Array shape
      const arrRes = await handlers.before_agent_start({ systemPrompt: ['base'] });
      assert.deepStrictEqual(arrRes.systemPrompt, ['base', RULES]);

      // String shape
      const strRes = await handlers.before_agent_start({ systemPrompt: 'base' });
      assert.strictEqual(strRes.systemPrompt, `base\n\n${RULES}`);

      // Toggle off
      await commands.frugal.handler('off', fakeCtx);
      assert.ok(notifications.at(-1).includes('off'));
      await handlers.before_agent_start(secEvent);
      assert.strictEqual(secEvent.systemPromptOptions.sections.frugal, undefined);
      assert.strictEqual(await handlers.before_agent_start({ systemPrompt: 'base' }), undefined);

      // Restore across session reload stays off
      await handlers.session_start({}, fakeCtx);
      assert.strictEqual(await handlers.before_agent_start({ systemPrompt: 'base' }), undefined);

      // Toggle back on
      await commands.frugal.handler('on', fakeCtx);
      const strRes2 = await handlers.before_agent_start({ systemPrompt: 'base' });
      assert.strictEqual(strRes2.systemPrompt, `base\n\n${RULES}`);
    });

    await check('All tool manifests are valid JSON', () => {
      for (const rel of [
        'gemini-extension.json',
        '.codex-plugin/plugin.json',
        '.agents/plugins/marketplace.json',
        'hooks/codex-hooks.json',
        '.github/plugin/plugin.json',
        '.github/plugin/marketplace.json',
        'hooks/copilot-hooks.json',
        'hooks/cursor-hooks.json',
        'plugins/antigravity/plugin.json',
        'package.json',
      ]) {
        const obj = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
        assert.ok(obj && typeof obj === 'object', `${rel} invalid`);
      }
    });

    for (const line of results) console.log(line);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
