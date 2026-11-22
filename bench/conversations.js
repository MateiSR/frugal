// Multi-turn benchmark conversations. Each builds one small dependency-free Node module over 5 turns:
// build, add a feature, fix a reported bug, explain a design choice, refactor.
// `reference` is a map of files for a known-good final solution; `check(dir)` verifies the workspace.
'use strict';

const assert = require('assert');
const path = require('path');

function freshRequire(file) {
  const resolved = require.resolve(file);
  delete require.cache[resolved];
  return require(resolved);
}

const CONVERSATIONS = [
  {
    id: 'ttl-map',
    prompts: [
      'In `ttlMap.js`, write a dependency-free CommonJS module exporting `createTtlMap({ now = Date.now } = {})` that returns `{ set(key, value, ttlMs), get(key), has(key), delete(key) }`. Expired entries must behave as absent and be evicted on read.',
      'Add `size()` (count of currently live entries) and `entries()` (`[key, value]` pairs of live entries in insertion order) to `ttlMap.js`.',
      'A caller reported two bugs: calling `set(key, value, 0)` or a negative `ttlMs` keeps the entry around instead of treating it as immediately expired, and re-setting an existing key does not update its expiry and move it to the end of `entries()` order. Fix both in `ttlMap.js`.',
      'Explain why lazy eviction on read can still leak memory under write-heavy workloads and what tradeoff you would weigh before adding a background sweep timer.',
      'Refactor `ttlMap.js` so expiry checks and stale-entry cleanup share one internal helper, keeping the exported API unchanged.',
    ],
    reference: {
      'ttlMap.js': `'use strict';

function createTtlMap({ now = Date.now } = {}) {
  const store = new Map();

  function liveEntry(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (now() >= entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  function prune() {
    for (const key of [...store.keys()]) liveEntry(key);
  }

  return {
    set(key, value, ttlMs) {
      store.delete(key);
      if (!(ttlMs > 0)) return;
      store.set(key, { value, expiresAt: now() + ttlMs });
    },
    get(key) {
      const entry = liveEntry(key);
      return entry ? entry.value : undefined;
    },
    has(key) {
      return liveEntry(key) !== null;
    },
    delete(key) {
      liveEntry(key);
      return store.delete(key);
    },
    size() {
      prune();
      return store.size;
    },
    entries() {
      prune();
      return [...store.entries()].map(([k, v]) => [k, v.value]);
    },
  };
}

module.exports = { createTtlMap };
`,
    },
    check(dir) {
      const { createTtlMap } = freshRequire(path.join(dir, 'ttlMap.js'));
      let t = 1000;
      const m = createTtlMap({ now: () => t });
      m.set('a', 1, 100);
      m.set('b', 2, 200);
      assert.strictEqual(m.get('a'), 1);
      assert.strictEqual(m.has('a'), true);
      assert.strictEqual(m.size(), 2);
      assert.deepStrictEqual(m.entries(), [['a', 1], ['b', 2]]);

      // Re-setting refreshes expiry and moves key to end of insertion order
      t = 1050;
      m.set('a', 10, 300);
      assert.deepStrictEqual(m.entries(), [['b', 2], ['a', 10]]);

      // Zero / negative TTL does not keep an entry alive
      m.set('c', 3, 0);
      m.set('d', 4, -10);
      assert.strictEqual(m.has('c'), false);
      assert.strictEqual(m.get('d'), undefined);

      // Expiry at boundary
      t = 1200;
      assert.strictEqual(m.has('b'), false);
      assert.strictEqual(m.get('b'), undefined);
      assert.strictEqual(m.get('a'), 10);
      assert.strictEqual(m.size(), 1);
      assert.deepStrictEqual(m.entries(), [['a', 10]]);

      assert.strictEqual(m.delete('a'), true);
      assert.strictEqual(m.delete('a'), false);
      assert.strictEqual(m.size(), 0);
      return true;
    },
  },
  {
    id: 'dotenv-parse',
    prompts: [
      'In `dotenv.js`, write a dependency-free CommonJS module exporting `parse(text)` that parses `.env`-style `KEY=VALUE` lines into a plain object, ignoring blank lines and `#` comments.',
      'Extend `dotenv.js` to support single-quoted values (literal) and double-quoted values (unescaping `\\n`, `\\r`, `\\t`, `\\"`, and `\\\\`), and strip inline `#` comments on unquoted values.',
      'Users reported two bugs: lines starting with `export ` (like `export PORT=3000`) are ignored or mis-keyed, and values containing `=` (like `DSN=postgres://u:p@h/db?sslmode=require`) are truncated. Fix both in `dotenv.js`.',
      'Explain why unquoted values strip trailing `#` comments while quoted values keep `#` characters, and name one `.env` feature this parser intentionally leaves out.',
      'Refactor `dotenv.js` so single-line parsing lives in its own helper function separate from the loop over lines, keeping `parse(text)` unchanged.',
    ],
    reference: {
      'dotenv.js': `'use strict';

function unescapeDouble(s) {
  return s.replace(/\\\\([nrt"\\\\])/g, (_, c) => ({ n: '\\n', r: '\\r', t: '\\t', '"': '"', '\\\\': '\\\\' }[c]));
}

function parseValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return unescapeDouble(trimmed.slice(1, -1));
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  const hash = trimmed.indexOf(' #');
  const cut = hash >= 0 ? trimmed.slice(0, hash) : (trimmed.startsWith('#') ? '' : trimmed);
  return cut.trim();
}

function parseLine(line) {
  const s = line.trim();
  if (!s || s.startsWith('#')) return null;
  const body = s.startsWith('export ') ? s.slice(7).trim() : s;
  const eq = body.indexOf('=');
  if (eq <= 0) return null;
  const key = body.slice(0, eq).trim();
  if (!key) return null;
  return [key, parseValue(body.slice(eq + 1))];
}

function parse(text) {
  const out = {};
  for (const line of String(text || '').split(/\\r?\\n/)) {
    const pair = parseLine(line);
    if (pair) out[pair[0]] = pair[1];
  }
  return out;
}

module.exports = { parse };
`,
    },
    check(dir) {
      const { parse } = freshRequire(path.join(dir, 'dotenv.js'));
      const input = [
        '# comment',
        '',
        'HOST=localhost # inline comment',
        'export PORT=3000',
        'DSN=postgres://u:p@h/db?sslmode=require',
        'SINGLE=\'a\\nb # keep\'',
        'DOUBLE="line1\\nline2\\t\\"ok\\" # keep"',
      ].join('\r\n');
      const res = parse(input);
      assert.strictEqual(res.HOST, 'localhost');
      assert.strictEqual(res.PORT, '3000');
      assert.strictEqual(res.DSN, 'postgres://u:p@h/db?sslmode=require');
      assert.strictEqual(res.SINGLE, 'a\\nb # keep');
      assert.strictEqual(res.DOUBLE, 'line1\nline2\t"ok" # keep');
      return true;
    },
  },
  {
    id: 'event-bus',
    prompts: [
      'In `bus.js`, write a dependency-free CommonJS module exporting `createBus()` returning `{ on(event, fn), off(event, fn), emit(event, ...args) }`, where `on` returns an unsubscribe function.',
      'Add `once(event, fn)` (returning an unsubscribe function that cancels it before firing) and wildcard `\'*\'` listeners that receive `(event, ...args)` for any emitted event.',
      'Users reported two bugs: when a listener unsubscribes itself or another listener during `emit`, a subsequent listener is skipped; and `off(event, fn)` fails to remove a listener registered with `once(event, fn)` when given the original `fn`. Fix both in `bus.js`.',
      'Explain why snapshotting the listener list during `emit` avoids skipped callbacks and describe what happens if a listener calls `on` while `emit` is running.',
      'Refactor `bus.js` so listener registration and removal share clean internal helpers without changing the exported API.',
    ],
    reference: {
      'bus.js': `'use strict';

function createBus() {
  const map = new Map();

  function list(event) {
    let arr = map.get(event);
    if (!arr) { arr = []; map.set(event, arr); }
    return arr;
  }

  function remove(event, predicate) {
    const arr = map.get(event);
    if (!arr) return;
    const next = arr.filter((entry) => !predicate(entry));
    if (next.length) map.set(event, next);
    else map.delete(event);
  }

  function add(event, fn, once) {
    const entry = { fn, once };
    list(event).push(entry);
    return () => remove(event, (e) => e === entry);
  }

  return {
    on(event, fn) { return add(event, fn, false); },
    once(event, fn) { return add(event, fn, true); },
    off(event, fn) { remove(event, (e) => e.fn === fn); },
    emit(event, ...args) {
      for (const entry of [...(map.get(event) || [])]) {
        if (entry.once) remove(event, (e) => e === entry);
        entry.fn(...args);
      }
      if (event !== '*') {
        for (const entry of [...(map.get('*') || [])]) {
          if (entry.once) remove('*', (e) => e === entry);
          entry.fn(event, ...args);
        }
      }
    },
  };
}

module.exports = { createBus };
`,
    },
    check(dir) {
      const { createBus } = freshRequire(path.join(dir, 'bus.js'));
      const bus = createBus();
      const seen = [];

      const unsubA = bus.on('ping', (x) => { seen.push('a:' + x); unsubA(); });
      bus.on('ping', (x) => seen.push('b:' + x));
      bus.on('*', (ev, x) => seen.push(`*:${ev}:${x}`));

      bus.emit('ping', 1);
      bus.emit('ping', 2);
      assert.deepStrictEqual(seen, ['a:1', 'b:1', '*:ping:1', 'b:2', '*:ping:2']);

      // once removed via returned unsubscribe
      let c1 = 0;
      const cancel = bus.once('go', () => { c1++; });
      cancel();
      bus.emit('go');
      assert.strictEqual(c1, 0);

      // once removed via off(event, originalFn)
      let c2 = 0;
      const fn2 = () => { c2++; };
      bus.once('go', fn2);
      bus.off('go', fn2);
      bus.emit('go');
      assert.strictEqual(c2, 0);

      // once fires exactly once
      let c3 = 0;
      bus.once('go', () => { c3++; });
      bus.emit('go');
      bus.emit('go');
      assert.strictEqual(c3, 1);
      return true;
    },
  },
];

module.exports = CONVERSATIONS;
