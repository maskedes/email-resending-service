#!/usr/bin/env node

import { Command } from 'commander';
import { sendCommand } from './commands/send';
import { domainsCommand } from './commands/domains';
import { keysCommand } from './commands/keys';
import { logsCommand } from './commands/logs';
import { statsCommand } from './commands/stats';
import { initCommand } from './commands/init';
import { smsCommand } from './commands/sms';

const pkg = require('../package.json');

const program = new Command();

program
  .name('envoy')
  .description('E-NVOY CLI — Send emails, manage domains, and monitor delivery from your terminal')
  .version(pkg.version);

// ─── Global options ───
program
  .option('--api-key <key>', 'Override API key for this command')
  .option('--host <url>', 'Override API host (default: http://78.154.103.19:12083)')
  .option('--edge-secret <secret>', 'Edge proxy secret for email routes')
  .option('--json', 'Output raw JSON instead of formatted text');

// ─── Helpers ───
function collectTags(value: string, previous: string[]) {
  return previous.concat([value]);
}

function getGlobalOpts(): Record<string, unknown> {
  const g = program.opts() as Record<string, unknown>;
  // Normalize edge secret keys so commands can use either name
  if (g.edgeSecret && !g.edgeProxySecret) g.edgeProxySecret = g.edgeSecret;
  if (g.edgeProxySecret && !g.edgeSecret) g.edgeSecret = g.edgeProxySecret;
  return g;
}

function mergeOpts(cmdOpts: Record<string, unknown>): Record<string, unknown> {
  const g = getGlobalOpts();
  const merged: Record<string, unknown> = { ...g, ...cmdOpts };
  // Prefer defined values from either side
  for (const k of ['apiKey', 'host', 'edgeSecret', 'edgeProxySecret', 'json'] as const) {
    const v = (cmdOpts as any)[k] ?? (g as any)[k];
    if (v !== undefined) (merged as any)[k] = v;
  }
  return merged;
}

// ─── Commands ───
// envoy init
program
  .command('init')
  .description('Configure your E-NVOY API key and host')
  .action(async () => { await initCommand(); });

// envoy send
program
  .command('send')
  .description('Send an email')
  .requiredOption('--to <email>', 'Recipient email address')
  .option('--from <email>', 'Sender email address')
  .option('--subject <text>', 'Email subject')
  .option('--text <body>', 'Plain text body')
  .option('--html <body>', 'HTML body')
  .option('--file <path>', 'Read HTML body from a file')
  .option('--tag <key=value>', 'Add a tag (repeatable)', collectTags, [])
  .option('--schedule <ms>', 'Delay in milliseconds before sending', parseInt)
  .action(async (opts) => { await sendCommand(mergeOpts(opts) as any); });

// envoy domains
program
  .command('domains')
  .description('List all domains')
  .action(async () => { await domainsCommand('list', undefined, getGlobalOpts() as any); });
program
  .command('domain-add')
  .alias('domain:add')
  .description('Register a new domain')
  .argument('<name>', 'Domain name (e.g. example.com)')
  .action(async (name) => { await domainsCommand('add', name, getGlobalOpts() as any); });
program
  .command('domain-verify')
  .alias('domain:verify')
  .description('Trigger DNS verification for a domain')
  .argument('<id>', 'Domain ID')
  .action(async (id) => { await domainsCommand('verify', id, getGlobalOpts() as any); });
program
  .command('domain-delete')
  .alias('domain:delete')
  .description('Delete a domain')
  .argument('<id>', 'Domain ID')
  .action(async (id) => { await domainsCommand('delete', id, getGlobalOpts() as any); });

// envoy keys
program
  .command('keys')
  .description('List all API keys')
  .action(async () => { await keysCommand('list', undefined, undefined, getGlobalOpts() as any); });
program
  .command('key-create')
  .alias('key:create')
  .description('Create a new API key')
  .argument('<name>', 'Key label')
  .option('--email <email>', 'Associated email address', '')
  .action(async (name, opts) => { await keysCommand('create', name, opts, getGlobalOpts() as any); });
program
  .command('key-delete')
  .alias('key:delete')
  .description('Permanently delete an API key')
  .argument('<id>', 'API key ID')
  .action(async (id) => { await keysCommand('delete', id, undefined, getGlobalOpts() as any); });

// envoy logs
program
  .command('logs')
  .description('View email logs')
  .option('--limit <n>', 'Max results', '20')
  .option('--offset <n>', 'Skip count', '0')
  .action(async (opts) => { await logsCommand(mergeOpts(opts) as any); });

// envoy stats
program
  .command('stats')
  .description('View email delivery statistics')
  .action(async () => { await statsCommand(getGlobalOpts() as any); });

// ─── SMS (via Android gateway) ───
program.command('sms').description('SMS via your Android phone — subcommands: send, logs, stats, gateways, gateway-add').action(() => program.help());
program.command('sms-send').description('Queue an SMS (gateway phone delivers)').requiredOption('--to <phone>', 'Recipient phone (E.164, e.g. +14155552671)').requiredOption('--body <text>', 'Message body').option('--from <phone>', 'Sender (optional)').option('--schedule <ms>', 'Delay ms', parseInt).action(async (opts) => { await smsCommand('send', undefined, opts, getGlobalOpts() as any); });
program.command('sms-logs').alias('sms:logs').description('List SMS messages').option('--limit <n>', 'Max', '20').option('--offset <n>', 'Skip', '0').action(async (opts) => { await smsCommand('logs', undefined, mergeOpts(opts) as any, getGlobalOpts() as any); });
program.command('sms-stats').alias('sms:stats').description('SMS stats').action(async () => { await smsCommand('stats', undefined, undefined, getGlobalOpts() as any); });
program.command('sms-gateways').alias('sms:gateways').description('List SMS gateways').action(async () => { await smsCommand('gateways', undefined, undefined, getGlobalOpts() as any); });
program.command('sms-gateway-add').alias('sms:gateway-add').description('Register a new SMS gateway (Android phone)').option('--name <name>', 'Gateway label').option('--phone-number <phone>', 'Phone number').action(async (opts) => { await smsCommand('gateway-add', undefined, opts, getGlobalOpts() as any); });

// ─── Aliases for convenience ───
program
  .command('send-email')
  .description('Alias for "send"')
  .requiredOption('--to <email>', 'Recipient email address')
  .option('--from <email>', 'Sender email address')
  .option('--subject <text>', 'Email subject')
  .option('--text <body>', 'Plain text body')
  .option('--html <body>', 'HTML body')
  .option('--file <path>', 'Read HTML body from a file')
  .option('--tag <key=value>', 'Add a tag (repeatable)', collectTags, [])
  .option('--schedule <ms>', 'Delay in milliseconds before sending', parseInt)
  .action(async (opts) => { await sendCommand(mergeOpts(opts) as any); });

program.parseAsync(process.argv);
