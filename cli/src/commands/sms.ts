import chalk from 'chalk';
import ora from 'ora';
import { config, api } from '../config';

function apiOpts(g?: { apiKey?: string; host?: string; edgeProxySecret?: string; edgeSecret?: string }) {
  return { apiKey: g?.apiKey, host: g?.host, edgeProxySecret: g?.edgeProxySecret || g?.edgeSecret };
}

export async function smsCommand(action: string, arg?: string, opts?: Record<string, unknown>, globalOpts?: { apiKey?: string; host?: string; json?: boolean; edgeSecret?: string; edgeProxySecret?: string }) {
  const g = globalOpts || {};
  if (!config.apiKey && !g.apiKey) { console.error(chalk.red('\n  ✗ No API key configured. Run `envoy init` first.\n')); process.exit(1); }

  if (action === 'send') {
    const to = (opts?.to as string) || arg;
    const body = (opts?.body as string) || (opts?.text as string) || (opts?.message as string);
    if (!to) { console.error(chalk.red('\n  ✗ --to phone number required.\n')); process.exit(1); }
    if (!body) { console.error(chalk.red('\n  ✗ --body (or --text) required.\n')); process.exit(1); }
    const spinner = ora('  Queuing SMS...').start();
    const { status, data } = await api('POST', '/api/sms/send', { to, body, from: opts?.from, scheduleInMs: opts?.schedule ? Number(opts.schedule) : undefined }, apiOpts(g));
    if (status === 200) {
      const r = data as Record<string, unknown>;
      spinner.succeed(chalk.green('  SMS queued!')); console.log(`  ${chalk.dim('ID:')} ${r.id}  ${chalk.dim('To:')} ${r.to}  ${chalk.dim('Status:')} ${r.status}`);
    } else { const e = data as { error?: { message?: string } }; spinner.fail(chalk.red(`  ${e.error?.message || 'Failed'}`)); process.exit(1); }
    return;
  }
  if (action === 'logs' || action === 'list') {
    const limit = String(opts?.limit || '20'); const offset = String(opts?.offset || '0');
    const { status, data } = await api('GET', `/api/sms?limit=${limit}&offset=${offset}`, undefined, apiOpts(g));
    if (status !== 200) { console.error(chalk.red('  Failed to load SMS logs')); process.exit(1); }
    const items = ((data as { data?: unknown[] }).data || data) as Array<Record<string, unknown>>;
    const arr = Array.isArray(items) ? items : [];
    if (globalOpts?.json) { console.log(JSON.stringify(arr, null, 2)); return; }
    console.log(''); for (const s of arr) console.log(`  ${chalk.white(String(s.to))}  ${chalk.dim(String(s.status).padEnd(10))}  ${String(s.body).slice(0,80)}`); console.log('');
    return;
  }
  if (action === 'stats') {
    const { status, data } = await api('GET', '/api/sms/stats', undefined, apiOpts(g));
    if (status !== 200) { console.error(chalk.red('  Failed to load SMS stats')); process.exit(1); }
    const st = data as Record<string, number>; console.log(`\n  Total: ${st.total}  Sent: ${st.sent}  Delivered: ${st.delivered}  Failed: ${st.failed}  Queued: ${st.queued}\n`);
    return;
  }
  if (action === 'gateways') {
    const { status, data } = await api('GET', '/api/sms/gateway/status', undefined, apiOpts(g));
    if (status !== 200) { console.error(chalk.red('  Failed to list gateways')); process.exit(1); }
    const list = ((data as { data?: unknown[] }).data || data) as Array<Record<string, unknown>>;
    if (globalOpts?.json) { console.log(JSON.stringify(list, null, 2)); return; }
    if (!Array.isArray(list) || list.length === 0) { console.log(chalk.dim('\n  No gateways yet. Register one: envoy sms gateway-add --name "My Phone"\n')); return; }
    console.log(''); for (const gw of list) console.log(`  ${chalk.white(String(gw.name))}  ${String((gw as { is_online?: boolean }).is_online) ? chalk.green('online') : chalk.yellow('offline')}  ${chalk.dim(String(gw.id))}`); console.log('');
    return;
  }
  if (action === 'gateway-add') {
    const name = (opts?.name as string) || arg || 'Android gateway';
    const spinner = ora('  Registering gateway...').start();
    const { status, data } = await api('POST', '/api/sms/gateway/register', { name, phoneNumber: opts?.phoneNumber }, apiOpts(g));
    if (status === 201) {
      const r = data as { gateway: { id: string; name: string }; gatewayToken: string };
      spinner.succeed(chalk.green('  Gateway registered!')); console.log(`\n  ID: ${r.gateway.id}\n  Name: ${r.gateway.name}\n`); console.log(chalk.bold.yellow('  Save this gatewayToken on the phone — shown only once:\n')); console.log(`  ${chalk.bold.white(r.gatewayToken)}\n`);
    } else { const e = data as { error?: { message?: string } }; spinner.fail(chalk.red(`  ${e.error?.message || 'Failed'}`)); process.exit(1); }
    return;
  }
  console.error(chalk.red(`  Unknown sms action: ${action}`)); process.exit(1);
}
