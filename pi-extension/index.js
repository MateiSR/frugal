// frugal Pi extension.
// Reads rules/frugal.md directly, injects it via before_agent_start, and registers /frugal on|off|status.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { rulesText } = require('../hooks/frugal.js');

function resolveMode(entries) {
  if (!Array.isArray(entries)) return 'on';
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.type === 'custom' && entry?.customType === 'frugal-mode') {
      const m = entry?.data?.mode;
      if (m === 'on' || m === 'off') return m;
    }
  }
  return 'on';
}

export default function frugalExtension(pi) {
  let mode = 'on';

  const restore = (ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    mode = resolveMode(entries);
  };

  pi.registerCommand('frugal', {
    description: 'Toggle frugal mode: on | off | status',
    handler: async (args, ctx) => {
      const verb = String(args || '').trim().split(/\s+/)[0]?.toLowerCase() || 'status';
      if (verb === 'on' || verb === 'off') {
        mode = verb;
        pi.appendEntry('frugal-mode', { mode });
        ctx?.ui?.notify?.(`Frugal mode ${mode}.`, 'info');
        return;
      }
      if (verb === 'status') {
        ctx?.ui?.notify?.(`Frugal mode is ${mode.toUpperCase()}.`, 'info');
        return;
      }
      ctx?.ui?.notify?.('Usage: /frugal [status | on | off]', 'warning');
    },
  });

  for (const ev of ['session_start', 'session_tree', 'session_switch', 'session_branch']) {
    pi.on(ev, async (_event, ctx) => restore(ctx));
  }

  pi.on('before_agent_start', async (event) => {
    if (mode === 'off') {
      if (event?.systemPromptOptions?.sections) delete event.systemPromptOptions.sections.frugal;
      return;
    }
    const text = rulesText();
    if (!text) return;

    const sections = event?.systemPromptOptions?.sections;
    if (sections && typeof sections === 'object') {
      sections.frugal = text;
      return;
    }
    if (Array.isArray(event?.systemPrompt)) {
      return { systemPrompt: [...event.systemPrompt, text] };
    }
    const base = event?.systemPrompt ? `${event.systemPrompt}\n\n` : '';
    return { systemPrompt: `${base}${text}` };
  });
}
