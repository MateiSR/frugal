#!/usr/bin/env node
// Automated test for the multi-turn benchmark tier (bench/run.js --multi) using a stub `claude` binary on PATH.
// Never invokes the real Claude CLI or writes outside throwaway temp directories.
'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const CONVERSATIONS = require('../bench/conversations');

const ROOT = path.resolve(__dirname, '..');
const RUN_SCRIPT = path.join(ROOT, 'bench', 'run.js');
const REF_TTL_MAP = CONVERSATIONS.find((c) => c.id === 'ttl-map').reference['ttlMap.js'];

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-multi-test-'));
  const binDir = path.join(tmp, 'bin');
  const cacheDir = path.join(tmp, 'cache');
  const logFile = path.join(tmp, 'calls.jsonl');
  const counterFile = path.join(tmp, 'counter.txt');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(counterFile, '0');

  const stub = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
if (args.includes('--version')) {
  process.stdout.write('2.1.332 (Claude Code)\\n');
  process.exit(0);
}
const pi = args.indexOf('-p');
const prompt = pi >= 0 ? args[pi + 1] : '';
const ri = args.indexOf('--resume');
const resumed = ri >= 0 ? args[ri + 1] : null;
const hasPlugin = args.includes('--plugin-dir');

if (prompt.includes('quote the first 12 words')) {
  fs.appendFileSync(${JSON.stringify(logFile)}, JSON.stringify({
    kind: 'probe', args, hasApiKey: 'ANTHROPIC_API_KEY' in process.env,
  }) + '\\n');
  process.stdout.write(JSON.stringify({
    result: 'Write the least code that fully and correctly solves the task, and',
  }));
  process.exit(0);
}

let sid = resumed;
if (!sid) {
  const n = Number(fs.readFileSync(${JSON.stringify(counterFile)}, 'utf8')) + 1;
  fs.writeFileSync(${JSON.stringify(counterFile)}, String(n));
  sid = 'stub-session-' + n;
  // Simulate Claude Code persisting session state in CLAUDE_CONFIG_DIR and firing SessionStart hook when plugin is loaded.
  if (process.env.CLAUDE_CONFIG_DIR) {
    const sdir = path.join(process.env.CLAUDE_CONFIG_DIR, 'projects', 'tmp');
    fs.mkdirSync(sdir, { recursive: true });
    fs.writeFileSync(path.join(sdir, sid + '.jsonl'), '{"type":"init"}\\n');
  }
  if (hasPlugin && process.env.FRUGAL_DIR) {
    fs.mkdirSync(process.env.FRUGAL_DIR, { recursive: true });
    fs.appendFileSync(path.join(process.env.FRUGAL_DIR, 'log.jsonl'), JSON.stringify({ ev: 'session', mode: 'on' }) + '\\n');
  }
}

// Write reference solution to workspace so the final check passes.
fs.writeFileSync(path.join(process.cwd(), 'ttlMap.js'), ${JSON.stringify(REF_TTL_MAP)});

fs.appendFileSync(${JSON.stringify(logFile)}, JSON.stringify({
  kind: 'turn',
  cwd: process.cwd(),
  args,
  resumed,
  sid,
  hasPlugin,
  hasApiKey: 'ANTHROPIC_API_KEY' in process.env,
  claudeConfigDir: process.env.CLAUDE_CONFIG_DIR || null,
}) + '\\n');

process.stdout.write(JSON.stringify({
  session_id: sid,
  is_error: false,
  stop_reason: 'end_turn',
  num_turns: 1,
  duration_ms: 50,
  total_cost_usd: 0.01,
  result: 'done',
  usage: {
    input_tokens: 100,
    cache_creation_input_tokens: 40,
    cache_read_input_tokens: 20,
    output_tokens: 30,
  },
}));
`;

  fs.writeFileSync(path.join(binDir, 'claude'), stub, { mode: 0o755 });
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-multi-config-'));
  const stamp = `../.tmp-multi-test-${process.pid}`;
  const outDir = path.join(ROOT, 'bench', 'results', stamp);

  const env = {
    ...process.env,
    PATH: binDir + path.delimiter + process.env.PATH,
    ANTHROPIC_API_KEY: 'sk-ant-should-be-stripped',
    FRUGAL_BENCH_CACHE: cacheDir,
    CLAUDE_CONFIG_DIR: configDir,
  };

  try {
    // 1. --multi --dry prints the plan and session count and starts no turns
    const dry = cp.spawnSync(process.execPath, [RUN_SCRIPT, '--multi', '--dry', '--model', 'sonnet'], { env, encoding: 'utf8' });
    assert.strictEqual(dry.status, 0, dry.stderr);
    assert.ok(dry.stdout.includes('30 new turn-sessions'), `expected 30 new turn-sessions, got: ${dry.stdout}`);
    assert.ok(dry.stdout.includes('ttl-map') && dry.stdout.includes('dotenv-parse') && dry.stdout.includes('event-bus'));
    assert.ok(!fs.existsSync(logFile), '--multi --dry must not invoke claude for turns or probes');
    console.log('ok   --multi --dry prints plan and 30 turn-sessions without starting sessions');

    // 2. 20-session guard blocks 30 turn-sessions without --yes
    const guarded = cp.spawnSync(process.execPath, [RUN_SCRIPT, '--multi', '--stamp', stamp, '--model', 'sonnet'], { env, encoding: 'utf8' });
    assert.notStrictEqual(guarded.status, 0, '30 turn-sessions must stop without --yes');
    assert.ok(guarded.stderr.includes('More than 20 new sessions'));
    assert.ok(!fs.existsSync(logFile), 'guard must abort before invoking claude');
    console.log('ok   20-session guard counts multi-turn turns as sessions');

    // 3. Run one 5-turn conversation across off and on (10 turn-sessions <= 20, no --yes needed)
    const run = cp.spawnSync(process.execPath, [
      RUN_SCRIPT, '--multi', '--stamp', stamp, '--model', 'sonnet', '--tasks', 'ttl-map', '--arms', 'off,on', '--workers', '2',
    ], { env, encoding: 'utf8' });
    assert.strictEqual(run.status, 0, run.stderr + '\n' + run.stdout);

    const calls = fs.readFileSync(logFile, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(calls.length >= 11, `expected probe + 10 turns, got ${calls.length}`);
    for (const c of calls) {
      assert.strictEqual(c.hasApiKey, false, 'ANTHROPIC_API_KEY must be stripped on every claude invocation');
    }

    const turns = calls.filter((c) => c.kind === 'turn');
    assert.strictEqual(turns.length, 10, `expected 10 turns (5 x 2 arms), got ${turns.length}`);

    for (const hasPlugin of [false, true]) {
      const armTurns = turns.filter((t) => t.hasPlugin === hasPlugin);
      assert.strictEqual(armTurns.length, 5);
      const t1 = armTurns[0];
      assert.strictEqual(t1.resumed, null, 'turn 1 must start a fresh session without --resume');
      assert.ok(!t1.args.includes('--no-session-persistence'), 'multi-turn must not pass --no-session-persistence');
      assert.strictEqual(t1.claudeConfigDir, configDir, 'the login config directory must be passed through, not replaced by a copy');
      assert.ok(!fs.existsSync(path.join(configDir, 'projects', 'tmp', t1.sid + '.jsonl')), 'the session transcript must be removed after completion');
      assert.ok(!fs.existsSync(t1.cwd), 'workspace must be cleaned up after completion');
      for (let i = 1; i < 5; i++) {
        assert.strictEqual(armTurns[i].resumed, t1.sid, `turn ${i + 1} must --resume turn 1 session_id`);
        assert.strictEqual(armTurns[i].cwd, t1.cwd, `turn ${i + 1} must run in the same working directory`);
      }
    }

    // 4. Verify saved results.json shape and totals
    const data = JSON.parse(fs.readFileSync(path.join(outDir, 'results.json'), 'utf8'));
    assert.strictEqual(data.meta.multi, true);
    assert.strictEqual(data.results.length, 2);
    for (const rec of data.results) {
      assert.strictEqual(rec.task, 'ttl-map');
      assert.strictEqual(rec.ok, true);
      assert.strictEqual(rec.pass, true);
      assert.strictEqual(rec.arm_ok, true);
      assert.strictEqual(rec.turns, 5);
      assert.ok(Math.abs(rec.cost_usd - 0.05) < 1e-9);
      assert.strictEqual(rec.input, 500);
      assert.strictEqual(rec.cache_read, 100);
      assert.strictEqual(rec.output, 150);
      assert.ok(rec.loc_all > 0);
      assert.strictEqual(typeof rec.wall_ms, 'number');
      assert.strictEqual(rec.per_turn.length, 5);
    }
    console.log('ok   turn loop resumes session from turn 1, strips ANTHROPIC_API_KEY, cleans up temp sessions, records totals');

    // 5. Re-running with same cache hits cell cache (0 new turns)
    const beforeCount = calls.length;
    const cachedDry = cp.spawnSync(process.execPath, [
      RUN_SCRIPT, '--multi', '--dry', '--model', 'sonnet', '--tasks', 'ttl-map', '--arms', 'off,on',
    ], { env, encoding: 'utf8' });
    assert.strictEqual(cachedDry.status, 0, cachedDry.stderr);
    assert.ok(cachedDry.stdout.includes('2 reused from cache') && cachedDry.stdout.includes('0 new turn-sessions'), cachedDry.stdout);
    assert.strictEqual(fs.readFileSync(logFile, 'utf8').trim().split('\n').length, beforeCount);
    console.log('ok   cell cache reuses completed multi-turn conversations');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

main();
