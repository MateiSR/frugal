// frugal OpenCode plugin.
// Reads rules/frugal.md directly and toggles on/off via /frugal [on|off|status].
// Supports both OpenCode v1 (function / server()) and v2 (id + setup(ctx)).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { rulesText } = require('../../hooks/frugal.js');

function stateFile() {
  const dir = process.env.FRUGAL_DIR ||
    path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'opencode', 'frugal');
  return path.join(dir, 'global');
}

function readMode() {
  try {
    const val = fs.readFileSync(stateFile(), 'utf8').trim();
    return val === 'off' ? 'off' : 'on';
  } catch {
    return 'on';
  }
}

function writeMode(mode) {
  const file = stateFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, mode, 'utf8');
}

function handleToggle(rawArgs) {
  const verb = String(rawArgs || '').trim().split(/\s+/)[0]?.toLowerCase() || 'status';
  if (verb === 'on' || verb === 'off') {
    writeMode(verb);
    return `Frugal mode ${verb}.`;
  }
  return `Frugal mode is ${readMode().toUpperCase()}. Usage: /frugal [on|off|status]`;
}

// OpenCode v1 plugin export (callable function).
export const FrugalPlugin = async () => ({
  config: async (cfg) => {
    if (!cfg || typeof cfg !== 'object') return;
    cfg.command = cfg.command || {};
    cfg.command.frugal = {
      description: 'Toggle frugal mode (on|off|status)',
      template: 'Frugal command ($ARGUMENTS) ran. Confirm in one short line.',
    };
  },
  'experimental.chat.system.transform': async (_input, output) => {
    if (readMode() === 'off') return;
    const text = rulesText();
    if (!text) return;
    if (Array.isArray(output?.system)) {
      output.system.push(text);
    }
  },
  'command.execute.before': async (input) => {
    if (!input || input.command !== 'frugal') return;
    handleToggle(input.arguments);
  },
});

// OpenCode v2 (id + setup) + v1 compatibility (server).
export default {
  id: 'frugal',

  async setup(ctx) {
    const addRules = (event) => {
      if (readMode() === 'off') return;
      const text = rulesText();
      if (text && Array.isArray(event?.system)) {
        event.system.push({ type: 'text', text });
      }
    };
    await ctx.session.hook('context', addRules);
    await ctx.session.hook('compaction', addRules);
  },

  async server() {
    return FrugalPlugin();
  },
};
