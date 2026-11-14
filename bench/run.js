#!/usr/bin/env node
// On-versus-off benchmark for frugal mode, using real headless Claude Code sessions.
//   node bench/run.js --selftest                      free: check every test against its reference
//   node bench/run.js --stamp NAME [--model sonnet] [--runs 3] [--workers 4]
//                     [--arms off,terse,on,lean] [--tasks id,id] [--api-key]
// Each cell = one task x one arm x one run, in a fresh empty workspace.
// Arms differ by exactly one thing; user settings, rules, plugins and MCP servers are excluded.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const TASKS = require('./tasks');

const ROOT = path.join(__dirname, '..');
const ARMS = {
  off: [],                                              // default Claude Code
  terse: ['--append-system-prompt', 'Be concise.'],     // one-line control
  on: ['--plugin-dir', ROOT],                           // frugal mode as shipped
  lean: ['--plugin-dir', ROOT],                         // frugal with the short rules variant and no per-prompt reminder
};
const ARM_ENV = { lean: { FRUGAL_RULES: path.join(__dirname, 'variants', 'lean.md'), FRUGAL_REMINDER: 'off' } };
const TIMEOUT_MS = 300000;

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1]; };
const flag = (name) => process.argv.includes('--' + name);

function workspace(task) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `frugal-bench-${task.id}-`));
  for (const [name, content] of Object.entries(task.files || {})) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}
const codeLines = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
// Lines in the final file that were not in the starter file.
function addedLines(before, after) {
  const pool = codeLines(before || '');
  return codeLines(after).filter((l) => { const i = pool.indexOf(l); if (i < 0) return true; pool.splice(i, 1); return false; }).length;
}
function grade(task, dir, reply) {
  if (task.kind === 'explain') return task.facts.every((f) => new RegExp(f, 'i').test(reply));
  fs.writeFileSync(path.join(dir, '_bench_test.py'), task.test);
  return spawnSync('python3', ['_bench_test.py'], { cwd: dir, timeout: 30000 }).status === 0;
}

function selftest() {
  let bad = 0;
  for (const task of TASKS.filter((t) => t.kind !== 'explain')) {
    const dir = workspace(task);
    const starterPasses = task.files && grade(task, dir, '');
    fs.writeFileSync(path.join(dir, task.target), task.reference);
    const ok = grade(task, dir, '') && !starterPasses;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id}${starterPasses ? ' (starter file already passes)' : ''}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  process.exit(bad ? 1 : 0);
}

function runCell(cell, model, env) {
  return new Promise((resolve) => {
    const { task, arm } = cell;
    const dir = workspace(task);
    const frugalDir = path.join(dir, '.frugal-state');
    const args = ['-p', task.prompt, '--model', model, '--output-format', 'json',
      '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence',
      '--permission-mode', 'acceptEdits', '--tools', 'Read,Edit,Write,Glob,Grep', ...ARMS[arm]];
    const child = spawn('claude', args, { cwd: dir, env: { ...env, FRUGAL_DIR: frugalDir, ...ARM_ENV[arm] }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(timer);
      const rec = { task: task.id, kind: task.kind, arm, run: cell.run, ok: false };
      try {
        const r = JSON.parse(out.slice(out.indexOf('{')));
        const u = r.usage || {};
        const target = task.target ? path.join(dir, task.target) : null;
        const code = target && fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
        let hookLog = '';
        try { hookLog = fs.readFileSync(path.join(frugalDir, 'log.jsonl'), 'utf8'); } catch {}
        Object.assign(rec, {
          ok: !r.is_error && r.stop_reason !== 'refusal',
          stop_reason: r.stop_reason, turns: r.num_turns, duration_ms: r.duration_ms, cost_usd: r.total_cost_usd,
          output: u.output_tokens || 0, input: u.input_tokens || 0,
          cache_write: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
          reply: r.result || '', code,
          loc: task.target ? addedLines((task.files || {})[task.target], code) : null,
          extra_files: fs.readdirSync(dir).filter((f) => !f.startsWith('.') && f !== task.target && !(task.files || {})[f]),
          // Arm integrity: the frugal hook must have fired on "on" and must not have on the others.
          hook_fired: /"ev":"session","mode":"on"/.test(hookLog),
        });
        rec.pass = rec.ok && grade(task, dir, rec.reply);
        rec.arm_ok = rec.hook_fired === ARMS[arm].includes('--plugin-dir');
      } catch (e) {
        rec.error = String(e.message || e).slice(0, 200);
      }
      fs.rmSync(dir, { recursive: true, force: true });
      resolve(rec);
    });
  });
}

async function main() {
  if (flag('selftest')) return selftest();
  const stamp = arg('stamp');
  if (!stamp) { console.error('--stamp NAME is required'); process.exit(1); }
  const out = path.join(__dirname, 'results', stamp);
  if (fs.existsSync(path.join(out, 'results.json'))) { console.error(`${out} already has results; pick a new --stamp`); process.exit(1); }
  const model = arg('model', 'sonnet');
  const runs = Number(arg('runs', 3));
  const arms = arg('arms', 'off,terse,on,lean').split(',');
  const only = arg('tasks');
  const tasks = TASKS.filter((t) => !only || only.split(',').includes(t.id));
  const env = { ...process.env };
  // Default to the Claude subscription login; an API key in the environment would be billed per token.
  if (!flag('api-key')) delete env.ANTHROPIC_API_KEY;

  const cells = [];
  for (const task of tasks) for (const a of arms) for (let run = 1; run <= runs; run++) cells.push({ task, arm: a, run });
  cells.sort(() => Math.random() - 0.5); // interleave arms so time-of-day and cache effects spread evenly
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < cells.length) {
      const cell = cells[next++];
      const rec = await runCell(cell, model, env);
      results.push(rec);
      console.log(`[${results.length}/${cells.length}] ${rec.task} ${rec.arm} #${rec.run} ${rec.ok ? (rec.pass ? 'pass' : 'FAIL') : 'ERROR'} out=${rec.output ?? '-'} $${(rec.cost_usd || 0).toFixed(4)}${rec.arm_ok === false ? ' ARM-CONTAMINATED' : ''}`);
    }
  };
  await Promise.all(Array.from({ length: Number(arg('workers', 4)) }, worker));

  const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const commit = spawnSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ meta: { stamp, model, runs, arms, date: new Date().toISOString(), claude: version, commit, rules_chars: fs.readFileSync(path.join(ROOT, 'rules', 'frugal.md'), 'utf8').length }, results }, null, 1));
  console.log(`\nWrote ${path.join(out, 'results.json')}. Render with: node bench/report.js ${stamp}`);
}

main();
