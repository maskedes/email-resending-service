import chalk from 'chalk';
import ora from 'ora';
import { config, api } from '../config';

interface LogsOptions {
  limit?: string;
  offset?: string;
  apiKey?: string;
  host?: string;
  json?: boolean;
  edgeSecret?: string;
  [key: string]: unknown;
}

const STATUS_COLORS: Record<string, chalk.Chalk> = {
  sent: chalk.green,
  delivered: chalk.green.bold,
  queued: chalk.yellow,
  failed: chalk.red,
  pending: chalk.dim,
};

export async function logsCommand(opts: LogsOptions) {
  if (!config.apiKey && !opts.apiKey) {
    console.error(chalk.red('\n  ✗ No API key configured. Run `envoy init` first.\n'));
    process.exit(1);
  }

  const limit = opts.limit || '20';
  const offset = opts.offset || '0';
  const spinner = ora('  Loading emails...').start();

  try {
    const { status, data } = await api('GET', `/api/emails?limit=${limit}&offset=${offset}`, undefined, {
      apiKey: opts.apiKey,
      host: opts.host,
      edgeProxySecret: opts.edgeSecret,
    });

    if (status !== 200) {
      spinner.fail(chalk.red('  Failed to load emails'));
      process.exit(1);
    }

    const result = data as { data: Record<string, unknown>[] };
    const emails = result.data;
    spinner.stop();

    if (!emails.length) {
      console.log(chalk.dim('\n  No emails yet.\n'));
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify(emails, null, 2));
      return;
    }

    console.log('');
    for (const e of emails) {
      const color = STATUS_COLORS[(e.status as string)] || chalk.dim;
      const date = new Date(e.created_at as string).toLocaleString();
      console.log(`  ${chalk.dim(date)}  ${color((e.status as string).padEnd(10))}  ${chalk.white(e.subject)}`);
      console.log(`  ${''.padEnd(date.length)}  ${chalk.dim(`→ ${e.to}`)}`);
    }
    console.log('');
    console.log(chalk.dim(`  Showing ${emails.length} emails (offset: ${offset})`));
    console.log('');
  } catch {
    spinner.fail(chalk.red('  Network error'));
    process.exit(1);
  }
}
