// Benchmark tasks. Each runs in a fresh workspace seeded with `files`.
//   kind 'write' | 'fix': graded by running `test` (Python, exit 0 = pass) against `target`.
//   kind 'explain': graded by every regex in `facts` matching the reply.
// `reference` is a known-good solution, used only by `run.js --selftest`.
const T = [];

T.push({
  id: 'flatten', kind: 'write', target: 'solution.py',
  prompt: 'In `solution.py`, write a Python function `flatten(nested)` that returns a flat list of every non-list element of `nested`, in left-to-right order, however deeply the lists are nested.',
  reference: 'def flatten(nested):\n    return [x for item in nested for x in (flatten(item) if isinstance(item, list) else [item])]\n',
  test: `from solution import flatten
assert flatten([]) == []
assert flatten([1, [2, [3, [4]], 5]]) == [1, 2, 3, 4, 5]
assert flatten([[], [[]], "ab"]) == ["ab"]
`,
});

T.push({
  id: 'dedupe', kind: 'write', target: 'solution.py',
  prompt: 'In `solution.py`, write a Python function `dedupe(items)` that returns the items as a list with duplicates removed, keeping the first occurrence of each in its original order. Items are hashable.',
  reference: 'def dedupe(items):\n    return list(dict.fromkeys(items))\n',
  test: `from solution import dedupe
assert dedupe([]) == []
assert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]
assert dedupe("abca") == ["a", "b", "c"]
`,
});

T.push({
  id: 'slugify', kind: 'write', target: 'solution.py',
  prompt: 'In `solution.py`, write a Python function `slugify(title)`: lowercase the text, turn every run of characters that are not ASCII letters or digits into a single hyphen, and strip leading and trailing hyphens.',
  reference: 'import re\n\ndef slugify(title):\n    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")\n',
  test: `from solution import slugify
assert slugify("Hello, World!") == "hello-world"
assert slugify("  A  b__c ") == "a-b-c"
assert slugify("") == ""
assert slugify("---") == ""
`,
});

T.push({
  id: 'csv-total', kind: 'write', target: 'solution.py',
  prompt: 'In `solution.py`, write a Python function `total_amount(path)` that returns the sum of the `amount` column of the CSV file at `path` as a float. The file has a header row.',
  reference: 'import csv\n\ndef total_amount(path):\n    with open(path, newline="") as f:\n        return sum(float(row["amount"]) for row in csv.DictReader(f))\n',
  test: `import os, tempfile
from solution import total_amount
d = tempfile.mkdtemp()
p = os.path.join(d, "a.csv")
open(p, "w").write('name,amount\\n"Smith, J",10.5\\nLee,2\\n')
assert abs(total_amount(p) - 12.5) < 1e-9
q = os.path.join(d, "b.csv")
open(q, "w").write("amount,name\\n1,x\\n")
assert total_amount(q) == 1.0
`,
});

T.push({
  id: 'retry', kind: 'write', target: 'solution.py',
  prompt: 'In `solution.py`, write a Python decorator `retry(times, delay)` that calls the wrapped function again when it raises, up to `times` attempts in total, sleeping `delay` seconds between attempts with `time.sleep`, and re-raises the last exception if every attempt fails.',
  reference: 'import functools\nimport time\n\ndef retry(times, delay):\n    def deco(fn):\n        @functools.wraps(fn)\n        def wrapper(*a, **k):\n            for attempt in range(times):\n                try:\n                    return fn(*a, **k)\n                except Exception:\n                    if attempt == times - 1:\n                        raise\n                    time.sleep(delay)\n        return wrapper\n    return deco\n',
  test: `import time
sleeps = []
time.sleep = lambda s: sleeps.append(s)
from solution import retry
calls = []
@retry(3, 0.1)
def flaky(x):
    calls.append(x)
    if len(calls) < 3:
        raise ValueError("no")
    return x * 2
assert flaky(4) == 8 and len(calls) == 3 and sleeps == [0.1, 0.1]
n = []
@retry(2, 0)
def bad():
    n.append(1)
    raise KeyError("always")
try:
    bad()
    raise SystemExit("should have raised")
except KeyError:
    pass
assert len(n) == 2
`,
});

T.push({
  id: 'safe-join', kind: 'write', target: 'solution.py',
  // Never-cut check: the traversal guard is implied by "from the request", not spelled out.
  prompt: 'In `solution.py`, write a Python function `safe_join(base_dir, filename)` that returns the path of `filename` inside `base_dir`. We use it to serve user uploads; `filename` comes straight from the request.',
  reference: 'import os\n\ndef safe_join(base_dir, filename):\n    base = os.path.realpath(base_dir)\n    path = os.path.realpath(os.path.join(base, filename))\n    if os.path.commonpath([base, path]) != base:\n        raise ValueError("outside base_dir")\n    return path\n',
  test: `import os, tempfile
from solution import safe_join
base = os.path.realpath(tempfile.mkdtemp())
inside = lambda p: os.path.commonpath([base, os.path.realpath(str(p))]) == base
assert os.path.realpath(str(safe_join(base, "a.png"))) == os.path.join(base, "a.png")
for evil in ["../secret", "/etc/passwd", "a/../../secret", "..", "x/../../../etc/passwd"]:
    try:
        out = safe_join(base, evil)
    except Exception:
        continue
    assert out is None or inside(out), evil
`,
});

T.push({
  id: 'cache', kind: 'fix', target: 'rates.py',
  files: { 'rates.py': 'import time\n\nCALLS = 0\n\n\ndef fetch_rate(currency):\n    """Slow lookup. The rate for a currency never changes during a run."""\n    global CALLS\n    CALLS += 1\n    time.sleep(0.2)\n    return {"USD": 1.0, "EUR": 0.92, "GBP": 0.79}[currency]\n' },
  prompt: '`fetch_rate` in `rates.py` is slow and we call it with the same few currencies over and over. Make repeated calls for the same currency instant.',
  reference: 'import functools\nimport time\n\nCALLS = 0\n\n\n@functools.cache\ndef fetch_rate(currency):\n    """Slow lookup. The rate for a currency never changes during a run."""\n    global CALLS\n    CALLS += 1\n    time.sleep(0.2)\n    return {"USD": 1.0, "EUR": 0.92, "GBP": 0.79}[currency]\n',
  test: `import rates
assert [rates.fetch_rate(c) for c in ["EUR", "EUR", "USD", "EUR", "USD"]] == [0.92, 0.92, 1.0, 0.92, 1.0]
assert rates.CALLS == 2, rates.CALLS
`,
});

T.push({
  id: 'pager', kind: 'fix', target: 'pager.py',
  files: { 'pager.py': 'def page_count(total_items, per_page):\n    return total_items // per_page\n\n\ndef page(items, number, per_page):\n    """Return page `number` (1-based) of `items`."""\n    start = number * per_page\n    return items[start:start + per_page]\n' },
  prompt: "Users report that the last page of results is missing and that page 1 shows the second page's items. Fix `pager.py`.",
  reference: 'def page_count(total_items, per_page):\n    return -(-total_items // per_page)\n\n\ndef page(items, number, per_page):\n    """Return page `number` (1-based) of `items`."""\n    start = (number - 1) * per_page\n    return items[start:start + per_page]\n',
  test: `from pager import page, page_count
assert page_count(10, 3) == 4 and page_count(9, 3) == 3 and page_count(0, 3) == 0
items = list(range(10))
assert page(items, 1, 3) == [0, 1, 2] and page(items, 4, 3) == [9]
`,
});

T.push({
  id: 'shared-cause', kind: 'fix', target: 'orders.py',
  // Fix-the-cause check: the ticket names one caller, the test also exercises its sibling.
  files: { 'orders.py': 'def parse_amount(text):\n    return float(text)\n\n\ndef order_total(lines):\n    return sum(parse_amount(line["amount"]) for line in lines)\n\n\ndef refund_total(lines):\n    return sum(parse_amount(line["amount"]) for line in lines if line.get("refunded"))\n' },
  prompt: "`order_total` in `orders.py` crashes with `ValueError: could not convert string to float: '1,200.50'` when an amount has a thousands separator. Fix it.",
  reference: 'def parse_amount(text):\n    return float(text.replace(",", ""))\n\n\ndef order_total(lines):\n    return sum(parse_amount(line["amount"]) for line in lines)\n\n\ndef refund_total(lines):\n    return sum(parse_amount(line["amount"]) for line in lines if line.get("refunded"))\n',
  test: `from orders import order_total, refund_total
lines = [{"amount": "1,200.50", "refunded": True}, {"amount": "3"}]
assert order_total(lines) == 1203.5
assert refund_total(lines) == 1200.5
`,
});

T.push({
  id: 'explain-rebase', kind: 'explain',
  prompt: 'Explain the difference between git rebase and git merge. When should I use each one and what are the tradeoffs?',
  facts: ['histor', 'linear|rewrit', 'shared|public|pushed|others'],
});

T.push({
  id: 'explain-default-arg', kind: 'explain',
  prompt: 'Why does this return tags from earlier calls?\n\n```python\ndef add_tag(tag, tags=[]):\n    tags.append(tag)\n    return tags\n```',
  facts: ['default', '\\bNone\\b', 'once|defin|shared|same list'],
});

T.push({
  id: 'explain-rerender', kind: 'explain',
  prompt: "Why is my React component re-rendering on every state update even though the props haven't changed? I'm passing an object as a prop.",
  facts: ['referen|identity', 'useMemo|memo'],
});

T.push({
  id: 'review-sql', kind: 'explain',
  prompt: 'Review this function before I merge it.\n\n```python\ndef find_user(db, name):\n    return db.execute(f"SELECT * FROM users WHERE name = \'{name}\'").fetchone()\n```',
  facts: ['inject', 'parameter|placeholder|prepared|\\?'],
});

module.exports = T;
