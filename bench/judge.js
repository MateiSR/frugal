#!/usr/bin/env node
// Blind quality review of results already produced by bench/run.js. Makes one model call per task per pass.
//   node bench/judge.js --out STAMP --from stamp,stamp [--arms off,v-mini,ponytail,honey] [--model opus] [--passes 2] [--dry]
// For each task, the first run of every arm (its reply and the files it wrote) is shown to the judge
// under a shuffled letter, with no arm names. The judge scores each 1-10 on correctness, fit and reply,
// then ranks them. Later stamps in --from override earlier ones for the same task and arm.
// Finished calls are saved as they complete, so a stopped run resumes.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const TASKS = require('./tasks');

const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.join(__dirname, 'results', arg('out', ''));
const arms = arg('arms', 'off,v-mini,ponytail,honey').split(',');
const model = arg('model', 'opus');
const passes = Number(arg('passes', 2));

const pick = {};
for (const stamp of arg('from', '').split(',')) {
  for (const r of JSON.parse(fs.readFileSync(path.join(__dirname, 'results', stamp, 'results.json'), 'utf8')).results) {
    if (r.run === 1 && r.ok && arms.includes(r.arm)) (pick[r.task] = pick[r.task] || {})[r.arm] = r;
  }
}
const tasks = TASKS.filter((t) => pick[t.id] && arms.every((a) => pick[t.id][a]));

const fence = (name, text) => `--- ${name} ---\n${text.trimEnd()}\n--- end ${name} ---`;
function show(r) {
  const files = r.files && Object.keys(r.files).length ? r.files : (r.code ? { [TASKS.find((t) => t.id === r.task).target]: r.code } : {});
  return [...Object.entries(files).map(([n, c]) => fence(`file ${n}`, c)), fence('reply to the user', r.reply || '(empty)')].join('\n');
}
// Deterministic shuffle so a resumed run shows the same letters.
function order(taskId, pass) {
  let seed = [...(taskId + pass)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const a = [...arms];
  for (let i = a.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function prompt(task, letters) {
  const starter = Object.entries(task.files || {}).map(([n, c]) => fence(`existing file ${n}`, c)).join('\n');
  return `You are reviewing the work of ${letters.length} coding assistants. Each was given the same request in the same workspace and could read and write files. Judge them as the developer who made the request.

Request:
${fence('request', task.prompt)}
${starter ? `\nThe workspace contained:\n${starter}\n` : '\nThe workspace was empty.\n'}
${letters.map(([L, r]) => `===== Assistant ${L} =====\n${show(r)}`).join('\n\n')}

Score each assistant from 1 to 10 on:
- correctness: the code or answer is right, including edge cases and safety that the request implies.
- fit: it delivers what this request needs, neither missing something the developer would have to ask for again nor adding things they did not want.
- reply: the reply tells the developer what they need to know, accurately.

Then rank all of them from best to worst overall. Reply with only this JSON, no other text:
{"scores": {"A": {"correctness": 0, "fit": 0, "reply": 0}, ...}, "ranking": ["A", ...], "why": "one sentence"}`;
}
function ask(text) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    if (!process.argv.includes('--api-key')) delete env.ANTHROPIC_API_KEY;
    const child = spawn('claude', ['-p', text, '--model', model, '--output-format', 'json', '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence', '--tools', ''], { cwd: os.tmpdir(), env, stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = '';
    child.stdout.on('data', (d) => { buf += d; });
    child.on('close', () => {
      try {
        const r = JSON.parse(buf.slice(buf.indexOf('{')));
        const body = r.result.slice(r.result.indexOf('{'), r.result.lastIndexOf('}') + 1);
        resolve({ verdict: JSON.parse(body), cost_usd: r.total_cost_usd });
      } catch { resolve(null); }
    });
  });
}

async function main() {
  if (!arg('out') || !arg('from')) { console.error('--out STAMP and --from stamp,stamp are required'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, 'judge.jsonl');
  const done = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const todo = [];
  for (const task of tasks) for (let pass = 1; pass <= passes; pass++) if (!done.some((d) => d.task === task.id && d.pass === pass)) todo.push({ task, pass });
  console.log(`${todo.length} judging calls on ${model} (${done.length} already done), ${tasks.length} tasks, arms ${arms.join(', ')}`);
  if (process.argv.includes('--dry')) return;
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { task, pass } = todo[next++];
      const ord = order(task.id, pass);
      const letters = ord.map((a, i) => [String.fromCharCode(65 + i), pick[task.id][a]]);
      const r = await ask(prompt(task, letters)) || await ask(prompt(task, letters));
      if (!r || !Array.isArray(r.verdict.ranking) || r.verdict.ranking.length !== arms.length) { console.log(`${task.id} #${pass} ERROR`); continue; }
      const letterArm = Object.fromEntries(ord.map((a, i) => [String.fromCharCode(65 + i), a]));
      const rec = { task: task.id, pass, model, cost_usd: r.cost_usd, why: r.verdict.why,
        ranking: r.verdict.ranking.map((L) => letterArm[L]),
        scores: Object.fromEntries(Object.entries(r.verdict.scores).map(([L, s]) => [letterArm[L], s])) };
      fs.appendFileSync(file, JSON.stringify(rec) + '\n');
      console.log(`${task.id} #${pass} ${rec.ranking.join(' > ')}`);
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
}
main();
