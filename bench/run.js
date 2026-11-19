#!/usr/bin/env node
// On-versus-off benchmark for frugal mode, using real headless Claude Code sessions.
//   node bench/run.js --selftest                      free: check every test against its reference
//   node bench/run.js --stamp NAME [--model sonnet] [--runs 3] [--workers 4] [--screen] [--dry] [--yes]
//                     [--arms off,terse,on,full,caveman,ponytail,honey,v-<variant>] [--rivals DIR] [--tasks id,id] [--api-key]
// Each cell = one task x one arm x one run, in a fresh empty workspace.
// Finished cells are cached in bench/.cache/, keyed by model, task, arm, what the arm injects and the CLI version,
// so a stopped run resumes with the same command and an edited variant re-runs only its own arm.
// --screen: 1 run of the eight tasks where code size varies most. For discarding variants; never quote its numbers.
// --dry prints the session count and stops. More than 20 new sessions needs --yes.
// Arms differ by exactly one thing; user settings, rules, plugins and MCP servers are excluded.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const TASKS = require('./tasks');

const ROOT = path.join(__dirname, '..');
const argv = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1]; };
const RIVALS = path.resolve(argv('rivals', path.join(ROOT, '..', 'token-savers')));
const ARMS = {
  off: [],                                              // default Claude Code
  terse: ['--append-system-prompt', 'Be concise.'],     // one-line control
  on: ['--plugin-dir', ROOT],                           // frugal as shipped
  full: ['--plugin-dir', ROOT],                         // frugal with the long rules it shipped before v0.4
  // Rival plugins, each loaded as the only plugin, from local clones (see --rivals).
  caveman: ['--plugin-dir', path.join(RIVALS, 'caveman')],
  ponytail: ['--plugin-dir', path.join(RIVALS, 'ponytail')],
  honey: ['--plugin-dir', path.join(RIVALS, 'honey-for-devs')],
};
const ARM_ENV = {
  full: { FRUGAL_RULES: path.join(__dirname, 'variants', 'full.md') },
  caveman: { CAVEMAN_DEFAULT_MODE: 'full' },
  ponytail: { PONYTAIL_DEFAULT_MODE: 'full' },
};
// Any arm named v-<name> is frugal with bench/variants/<name>.md as its rules.
const armArgs = (arm) => ARMS[arm] || (arm.startsWith('v-') ? ARMS.on : null);
const armEnv = (arm) => ARM_ENV[arm] || (arm.startsWith('v-') ? { FRUGAL_RULES: path.join(__dirname, 'variants', arm.slice(2) + '.md') } : {});
const isFrugal = (arm) => ['on', 'full'].includes(arm) || arm.startsWith('v-');
const TIMEOUT_MS = 300000;
const SCREEN = ['pt-email', 'pt-debounce', 'pt-csv', 'pt-countdown', 'pt-ratelimit', 'safe-join', 'cache', 'hn-lru-cache'];
const CACHE = path.join(__dirname, '.cache');
const sha = (...xs) => crypto.createHash('sha1').update(JSON.stringify(xs)).digest('hex').slice(0, 16);
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const rivalCommit = (n) => spawnSync('git', ['-C', path.join(RIVALS, n), 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
// What an arm puts in front of the model: the rules and hook for frugal arms, the commit for a rival.
function armHash(arm) {
  if (isFrugal(arm)) return sha(read(armEnv(arm).FRUGAL_RULES || path.join(ROOT, 'rules', 'frugal.md')), read(path.join(ROOT, 'hooks', 'frugal.js')), read(path.join(ROOT, 'hooks', 'hooks.json')));
  const rival = { caveman: 'caveman', ponytail: 'ponytail', honey: 'honey-for-devs' }[arm];
  return rival ? rivalCommit(rival) : sha(ARMS[arm]);
}
const cached = (key) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE, key + '.json'), 'utf8')); } catch { return null; } };
const store = (key, value) => { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(path.join(CACHE, key + '.json'), JSON.stringify(value)); };

const arg = argv;
const flag = (name) => process.argv.includes('--' + name);

function workspace(task) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `frugal-bench-${task.id}-`));
  for (const [name, content] of Object.entries(task.files || {})) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}
const codeLines = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
// Lines in the final file that were not in the starter file.
function addedLines(before, after) {
  const pool = codeLines(before || '');
  return codeLines(after).filter((l) => { const i = pool.indexOf(l); if (i < 0) return true; pool.splice(i, 1); return false; }).length;
}
// Every code line the session produced: all files it added or changed, or, if it wrote none, the fenced code in its reply.
function allLines(task, dir, reply) {
  let n = 0;
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '__pycache__') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else n += addedLines((task.files || {})[path.relative(dir, p)], fs.readFileSync(p, 'utf8')); } };
  walk(dir);
  if (n) return n;
  return [...reply.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].reduce((s, m) => s + codeLines(m[1]).length, 0);
}
// Every file the session added or changed, so a later quality review can read the code itself.
function written(task, dir) {
  const out = {};
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === '__pycache__') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else { const rel = path.relative(dir, p), text = fs.readFileSync(p, 'utf8'); if (text !== (task.files || {})[rel]) out[rel] = text.slice(0, 20000); } } };
  walk(dir);
  return out;
}
function grade(task, dir, reply) {
  if (task.kind === 'open') return allLines(task, dir, reply) > 0;
  if (task.kind === 'explain') return task.facts.every((f) => new RegExp(f, 'i').test(reply));
  fs.writeFileSync(path.join(dir, '_bench_test.py'), task.test);
  return spawnSync('python3', ['_bench_test.py'], { cwd: dir, timeout: 30000 }).status === 0;
}

function selftest() {
  let bad = 0;
  for (const task of TASKS.filter((t) => t.test)) {
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
      '--permission-mode', 'acceptEdits', '--tools', 'Read,Edit,Write,Glob,Grep', ...armArgs(arm)];
    const child = spawn('claude', args, { cwd: dir, env: { ...env, FRUGAL_DIR: frugalDir, ...armEnv(arm) }, stdio: ['ignore', 'pipe', 'pipe'] });
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
          loc_all: allLines(task, dir, r.result || ''),
          files: written(task, dir),
          extra_files: fs.readdirSync(dir).filter((f) => !f.startsWith('.') && f !== task.target && !(task.files || {})[f]),
          // Arm integrity: the frugal hook must have fired on "on" and must not have on the others.
          hook_fired: /"ev":"session","mode":"on"/.test(hookLog),
        });
        rec.pass = rec.ok && grade(task, dir, rec.reply);
        rec.arm_ok = rec.hook_fired === isFrugal(arm);
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
  const runs = Number(arg('runs', flag('screen') ? 1 : 3));
  const arms = arg('arms', 'off,terse,on,full').split(',');
  for (const a of arms) if (!armArgs(a)) { console.error(`unknown arm ${a}`); process.exit(1); }
  const only = arg('tasks') ? arg('tasks').split(',') : flag('screen') ? SCREEN : null;
  const tasks = TASKS.filter((t) => !only || only.includes(t.id));
  const env = { ...process.env };
  // Default to the Claude subscription login; an API key in the environment would be billed per token.
  if (!flag('api-key')) delete env.ANTHROPIC_API_KEY;

  const cells = [];
  for (const task of tasks) for (const a of arms) for (let run = 1; run <= runs; run++) cells.push({ task, arm: a, run });
  const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const hashes = Object.fromEntries(arms.map((a) => [a, armHash(a)]));
  const results = [];
  for (const c of cells) {
    c.key = sha(model, c.task.id, sha(c.task.prompt, c.task.files, c.task.test, c.task.facts), c.arm, hashes[c.arm], version, c.run);
    const hit = cached(c.key);
    if (hit) results.push(hit);
  }
  const todo = cells.filter((c) => !cached(c.key));
  const known = fs.existsSync(CACHE) ? fs.readdirSync(CACHE).map((f) => cached(f.slice(0, -5))).filter((r) => r && r.model === model && r.cost_usd) : [];
  const each = known.length ? known.reduce((s, r) => s + r.cost_usd, 0) / known.length : null;
  console.log(`${todo.length} new sessions on ${model} (${results.length} reused from cache)${each ? `, about $${(each * todo.length).toFixed(2)} list price` : ''}`);
  if (flag('dry')) return;
  if (todo.length > 20 && !flag('yes')) { console.error('More than 20 new sessions: re-run with --yes to start.'); process.exit(1); }
  todo.sort(() => Math.random() - 0.5); // interleave arms so time-of-day and cache effects spread evenly
  // Pre-flight: every plugin arm must show its instructions actually reached the model.
  const probes = {};
  for (const a of arms.filter((x) => armArgs(x).length && x !== 'terse')) {
    const hit = cached('probe-' + sha(armHash(a), version));
    if (hit || !todo.some((c) => c.arm === a)) { probes[a] = hit; continue; }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-bench-probe-'));
    const r = spawnSync('claude', ['-p', 'Without calling tools: quote the first 12 words of any hook-injected instructions you were given at session start, or reply NONE.', '--model', 'haiku', '--output-format', 'json', '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence', ...armArgs(a)], { cwd: dir, env: { ...env, FRUGAL_DIR: path.join(dir, '.f'), ...armEnv(a) }, encoding: 'utf8', timeout: 120000 });
    let reply = '';
    try { reply = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))).result || ''; } catch {}
    probes[a] = reply.replace(/\s+/g, ' ').slice(0, 160);
    console.log(`probe ${a}: ${probes[a]}`);
    if (!reply || /\bNONE\b/.test(reply)) { console.error(`arm ${a} injected nothing; aborting`); process.exit(1); }
    store('probe-' + sha(armHash(a), version), probes[a]);
  }

  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const cell = todo[next++];
      let rec = await runCell(cell, model, env);
      if (!rec.ok) rec = await runCell(cell, model, env); // one retry for transient API errors
      rec.model = model;
      if (rec.ok) store(cell.key, rec);
      results.push(rec);
      console.log(`[${results.length}/${cells.length}] ${rec.task} ${rec.arm} #${rec.run} ${rec.ok ? (rec.pass ? 'pass' : 'FAIL') : 'ERROR'} out=${rec.output ?? '-'} $${(rec.cost_usd || 0).toFixed(4)}${rec.arm_ok === false ? ' ARM-CONTAMINATED' : ''}`);
    }
  };
  await Promise.all(Array.from({ length: Number(arg('workers', 4)) }, worker));

  const commit = spawnSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ meta: { stamp, model, runs, arms, date: new Date().toISOString(), claude: version, commit, probes, rivals: Object.fromEntries(['caveman', 'ponytail', 'honey-for-devs'].filter((n) => arms.some((a) => (armArgs(a) || []).join().includes(n))).map((n) => [n, rivalCommit(n)])), rules_chars: fs.readFileSync(path.join(ROOT, 'rules', 'frugal.md'), 'utf8').length }, results }, null, 1));
  console.log(`\nWrote ${path.join(out, 'results.json')}. Render with: node bench/report.js ${stamp}`);
}

main();
