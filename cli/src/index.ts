#!/usr/bin/env node

import { Command } from 'commander';
import { config } from './config';
import { sendCommand } from './commands/send';
import { domainsCommand } from './commands/domains';
import { keysCommand } from './commands/keys';
import { logsCommand } from './commands/logs';
import { statsCommand } from './commands/stats';
import { initCommand } from './commands/init';

const pkg = require('../package.json');

const program = new Command();

program
  .name('envoy')
  .description('E-NVOY CLI — Send emails, manage domains, and monitor delivery from your terminal')
  .version(pkg.version);

// ─── Global options ───
program
  .option('--api-key <key>', 'Override API key for this command')
  .option('--host <url>', 'Override API host (default: https://api.freemailsend.dev)')
  .option('--edge-secret <secret>', 'Edge proxy secret for email routes')
  .option('--json', 'Output raw JSON instead of formatted text');

// ─── Commands ───
const globalOpts = program.opts();

// envoy init
program
  .command('init')
  .description('Configure your E-NVOY API key and host')
  .action(() => initCommand());

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
  .action((opts) => sendCommand({ ...opts, ...globalOpts }));

// envoy domains
program
  .command('domains')
  .description('List all domains')
  .action(() => domainsCommand('list', undefined, globalOpts));
program
  .command('domain-add')
  .alias('domain:add')
  .description('Register a new domain')
  .argument('<name>', 'Domain name (e.g. example.com)')
  .action((name) => domainsCommand('add', name, globalOpts));
program
  .command('domain-verify')
  .alias('domain:verify')
  .description('Trigger DNS verification for a domain')
  .argument('<id>', 'Domain ID')
  .action((id) => domainsCommand('verify', id, globalOpts));
program
  .command('domain-delete')
  .alias('domain:delete')
  .description('Delete a domain')
  .argument('<id>', 'Domain ID')
  .action((id) => domainsCommand('delete', id, globalOpts));

// envoy keys
program
  .command('keys')
  .description('List all API keys')
  .action(() => keysCommand('list', undefined, undefined, globalOpts));
program
  .command('key-create')
  .alias('key:create')
  .description('Create a new API key')
  .argument('<name>', 'Key label')
  .option('--email <email>', 'Associated email address', '')
  .action((name, opts) => keysCommand('create', name, opts, globalOpts));
program
  .command('key-delete')
  .alias('key:delete')
  .description('Permanently delete an API key')
  .argument('<id>', 'API key ID')
  .action((id) => keysCommand('delete', id, undefined, globalOpts));

// envoy logs
program
  .command('logs')
  .description('View email logs')
  .option('--limit <n>', 'Max results', '20')
  .option('--offset <n>', 'Skip count', '0')
  .action((opts) => logsCommand({ ...opts, ...globalOpts }));

// envoy stats
program
  .command('stats')
  .description('View email delivery statistics')
  .action(() => statsCommand(globalOpts));

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
  .action((opts) => sendCommand({ ...opts, ...globalOpts }));

program.parse();

// ─── Helpers ───
function collectTags(value: string, previous: string[]) {
  return previous.concat([value]);
}
