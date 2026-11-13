#!/usr/bin/env node
// Frugal mode: one script for all three hooks plus the /frugal command.
//   frugal.js session   SessionStart hook: inject the rules
//   frugal.js subagent  SubagentStart hook: inject the rules into a subagent
//   frugal.js prompt    UserPromptSubmit hook: handle /frugal, else remind
//   frugal.js cli ...   same commands as /frugal, for a terminal or the fallback skill
// Hooks must never break a session: every failure exits 0 with no output.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'frugal');
const LOG = path.join(DATA, 'log.jsonl');
const RULES = path.join(__dirname, '..', 'rules', 'frugal.md');
const REMINDER = 'Frugal mode active: minimum code that needs to exist, fewest clear words. Keep code, identifiers, commands and safety-critical paths exact.';
const OFF_NOTICE = 'FRUGAL MODE OFF. Disregard the frugal mode rules given earlier in this conversation and respond normally.';
// Agents that never write code or prose for the user, so the rules are wasted on them.
const SKIP_AGENTS = /(^|:)visual-verifier$/;
const USAGE = 'Usage: /frugal [status] | on|off [session|project|global] | stats [all]';

const read = (f) => { try { return fs.readFileSync(f, 'utf8').trim(); } catch { return ''; } };
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const onOff = (s) => (s === 'on' || s === 'off' ? s : null);
const safeId = (s) => String(s || 'none').replace(/[^A-Za-z0-9_-]/g, '_');
const projectFile = (dir) => path.join(DATA, 'projects', crypto.createHash('sha1').update(dir).digest('hex').slice(0, 16));
const sessionFile = (id) => path.join(DATA, 'sessions', safeId(id) + '.json');
const loadSession = (id) => { try { return JSON.parse(read(sessionFile(id))) || {}; } catch { return {}; } };
const saveSession = (id, s) => write(sessionFile(id), JSON.stringify(s));
const projectDir = (input) => process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

function scopes(input) {
  return {
    session: onOff(loadSession(input.session_id).override),
    project: onOff(read(projectFile(projectDir(input)))),
    global: onOff(read(path.join(DATA, 'global'))),
  };
}
// Most specific scope wins; with nothing set, the mode is on.
function effective(input) {
  const s = scopes(input);
  return s.session || s.project || s.global || 'on';
}
function rulesText() {
  const rules = read(RULES);
  return rules ? 'FRUGAL MODE ACTIVE. Apply these rules reflexively.\n\n' + rules : '';
}
function log(input, ev, extra) {
  try {
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), sid: input.session_id, ev, ...extra }) + '\n');
  } catch {}
}
const emit = (event, text) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }));

function session(input) {
  const mode = effective(input);
  const s = loadSession(input.session_id);
  const text = mode === 'on' ? rulesText() : '';
  s.announced = text ? 'on' : 'off';
  saveSession(input.session_id, s);
  log(input, 'session', { mode, source: input.source, chars: text.length, transcript: input.transcript_path });
  if (text) emit('SessionStart', text);
}

function subagent(input) {
  const mode = effective(input);
  const skip = SKIP_AGENTS.test(input.agent_type || '');
  const text = mode === 'on' && !skip ? rulesText() : '';
  log(input, 'subagent', { mode, agent: input.agent_type, chars: text.length });
  if (text) emit('SubagentStart', text);
}

function prompt(input) {
  const m = /^\/frugal(?::frugal)?(?:\s+(.*))?$/s.exec((input.prompt || '').trim());
  if (m) {
    // Blocking the prompt shows the reply to the user without spending model tokens.
    process.stdout.write(JSON.stringify({ decision: 'block', reason: command((m[1] || '').trim().split(/\s+/).filter(Boolean), input) }));
    return;
  }
  const mode = effective(input);
  const s = loadSession(input.session_id);
  let text = '';
  if (mode === 'on') text = s.announced === 'on' ? REMINDER : rulesText();
  else if (s.announced === 'on') text = OFF_NOTICE;
  if (s.announced !== mode) { s.announced = mode; saveSession(input.session_id, s); }
  log(input, 'prompt', { mode, chars: text.length });
  if (text) emit('UserPromptSubmit', text);
}

function command(args, input) {
  const [verb = 'status', arg] = args;
  if (verb === 'status') return status(input);
  if (verb === 'stats') return stats(input, arg === 'all');
  if (!onOff(verb)) return USAGE;
  const scope = arg || 'session';
  if (scope === 'session') {
    if (!input.session_id) return 'No session id here; use "project" or "global".';
    const s = loadSession(input.session_id);
    s.override = verb;
    saveSession(input.session_id, s);
  } else if (scope === 'project') write(projectFile(projectDir(input)), verb);
  else if (scope === 'global') write(path.join(DATA, 'global'), verb);
  else return USAGE;
  log(input, 'set', { scope, value: verb, mode: effective(input) });
  return `Frugal mode ${verb} for this ${scope === 'global' ? 'machine' : scope}.\n` + status(input);
}

function status(input) {
  const s = scopes(input);
  const show = (v) => v || 'not set';
  return `Frugal mode is ${effective(input).toUpperCase()} here.\n` +
    `  session: ${show(s.session)} · project: ${show(s.project)} · global: ${show(s.global)} (default on)\n` + USAGE;
}

// ---- stats: measured from transcripts, never estimated from a benchmark ----

function logEvents() {
  return read(LOG).split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
// Assistant messages are written once per content block; keep the last line per message id.
function assistantMessages(file) {
  const byId = new Map();
  for (const line of read(file).split('\n')) {
    if (!line.includes('"assistant"')) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    const u = d.type === 'assistant' && d.message && d.message.usage;
    if (u) byId.set(d.message.id || d.uuid, { ts: d.timestamp, u });
  }
  return [...byId.values()];
}
function subagentFiles(transcript) {
  const dir = path.join(transcript.replace(/\.jsonl$/, ''), 'subagents');
  try { return fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)); } catch { return []; }
}
const zero = () => ({ msgs: 0, input: 0, output: 0, cacheWrite: 0, cacheRead: 0 });
function add(t, u) {
  t.msgs++;
  t.input += u.input_tokens || 0;
  t.output += u.output_tokens || 0;
  t.cacheWrite += u.cache_creation_input_tokens || 0;
  t.cacheRead += u.cache_read_input_tokens || 0;
}
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));
const row = (name, t) => `  ${name.padEnd(10)} ${String(t.msgs).padStart(5)} msgs · out ${fmt(t.output)} · in ${fmt(t.input)} · cache write ${fmt(t.cacheWrite)} · cache read ${fmt(t.cacheRead)}`;

function stats(input, all) {
  const events = logEvents();
  const transcripts = new Map(); // session id -> transcript path
  for (const e of events) if (e.ev === 'session' && e.transcript) transcripts.set(e.sid, e.transcript);
  if (input.session_id && input.transcript_path) transcripts.set(input.session_id, input.transcript_path);
  const wanted = all ? [...transcripts.keys()] : [input.session_id].filter((id) => transcripts.has(id));
  if (!wanted.length) return 'No frugal data for this session yet.';

  const main = zero(), subs = zero();
  const byMode = { on: zero(), off: zero() };
  const injected = { rules: 0, subagent: 0, reminder: 0, chars: 0 };
  for (const sid of wanted) {
    const timeline = events.filter((e) => e.sid === sid && e.mode);
    for (const e of timeline) {
      if (!e.chars) continue;
      injected.chars += e.chars;
      if (e.ev === 'subagent') injected.subagent++;
      else if (e.chars > 500) injected.rules++;
      else injected.reminder++;
    }
    const modeAt = (ts) => { let mode = 'on'; for (const e of timeline) { if (e.ts > ts) break; mode = e.mode; } return mode; };
    const file = transcripts.get(sid);
    for (const m of assistantMessages(file)) { add(main, m.u); add(byMode[modeAt(m.ts)] || byMode.on, m.u); }
    for (const f of subagentFiles(file)) for (const m of assistantMessages(f)) add(subs, m.u);
  }

  const lines = [all ? `Frugal stats · ${wanted.length} logged session(s)` : 'Frugal stats · this session', row('main', main), row('subagents', subs)];
  lines.push(`  frugal added ≈${fmt(injected.chars / 4)} input tokens (rules ×${injected.rules}, subagent rules ×${injected.subagent}, reminders ×${injected.reminder}; estimated at 4 chars per token, before caching)`);
  const { on, off } = byMode;
  if (on.msgs >= 20 && off.msgs >= 20) {
    const a = on.output / on.msgs, b = off.output / off.msgs;
    lines.push(`  output per message: ${a.toFixed(0)} with frugal on (${on.msgs} msgs) vs ${b.toFixed(0)} off (${off.msgs} msgs) → ${((1 - a / b) * 100).toFixed(0)}% ${a <= b ? 'less' : 'MORE'} with frugal on`);
    lines.push('  (observed in main-session messages; the tasks differ, so this is a comparison, not a controlled measurement)');
  } else {
    lines.push(`  savings: not enough data to compare (need 20+ messages each with frugal on and off; have ${on.msgs} on, ${off.msgs} off)`);
  }
  return lines.join('\n');
}

function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'cli') {
    // No hook input in a terminal: session scope needs an id, passed as --session <id>.
    const i = args.indexOf('--session');
    const input = { cwd: process.cwd() };
    if (i >= 0) { input.session_id = args[i + 1]; args.splice(i, 2); }
    console.log(command(args, input));
    return;
  }
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')) || {}; } catch {}
  ({ session, subagent, prompt })[mode]?.(input);
}

try { main(); } catch {}
