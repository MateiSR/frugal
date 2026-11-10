## Execution Constraints (for /streamkit:orchestrate)

- **Exclusive locks (serialize in one stream):** e.g., local GPU, GUI editor/engine, single test DB port.
- **Protected / conflict-prone files (no parallel worktree edits):** e.g., project manifests, shared registries, binary scene/project files.
- **Thin CLI wrappers (use instead of raw MCP/API calls in `streamkit:stream-worker`):**
  - External/asset call: `<command>` (writes artifact to disk, prints path + metadata only)
- **Doc / reference vaults (delegate reads to `streamkit:researcher`):** e.g., `docs/design/`, external vault path.
- **Acceptance E2E command(s):** exact command(s) `streamkit:reviewer` must run in Phase 5.
- **Paid / external calls policy:** require explicit user approval before any billed API call.
