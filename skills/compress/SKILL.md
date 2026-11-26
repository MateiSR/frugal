---
name: compress
description: Rewrite a memory file (CLAUDE.md, a handoff, notes) in fewer words after backing up the original. Runs only when the user types /frugal:compress.
argument-hint: "<file>"
disable-model-invocation: true
---

Rewrite the file at `$ARGUMENTS` so it says the same thing in fewer words. If no path was given, or it is not an existing text file of prose, ask which file and stop.

1. Read the whole file.
2. Copy it unchanged to `<file>.bak` with `cp -n`. If `<file>.bak` already exists, stop and ask whether to replace that backup; never overwrite it unasked. The `.bak` suffix keeps the copy from being loaded as a memory file.
3. Rewrite the prose and write the result back to the same path.
4. Reply with the word count before and after (`wc -w`), the backup path, and anything you were unsure about and left alone.

What may change: filler, hedging, repetition, preamble, restating what a heading already says, and long sentences that a short one or a list item replaces.

What must not change:

- Any fact, instruction, constraint, warning, name, number, date or reason. A rule keeps its condition and its exception. If two statements conflict, keep both and report the conflict.
- Fenced code, inline code, commands, paths, URLs, identifiers, tables' cell values, frontmatter and `@path` imports: copy them character for character.
- The heading structure and the order of sections, so that links and habits still land in the same place.
- The language the file is written in.

Write full sentences or plain list items a reader can follow without the original; do not drop articles into telegraphic fragments or invent abbreviations. If a passage is already tight, leave it. If the file is code or configuration rather than prose (JSON, YAML, TOML, source code), change nothing and say so.
