import chalk from 'chalk';
import ora from 'ora';
import { config, api } from '../config';

interface StatsOptions {
  apiKey?: string;
  host?: string;
  json?: boolean;
  edgeSecret?: string;
  [key: string]: unknown;
}

export async function statsCommand(opts?: StatsOptions) {
  if (!config.apiKey && !opts?.apiKey) {
    console.error(chalk.red('\n  ✗ No API key configured. Run `envoy init` first.\n'));
    process.exit(1);
  }

  const spinner = ora('  Loading stats...').start();

  try {
    const { status, data } = await api('GET', '/api/emails/stats', undefined, {
      apiKey: opts?.apiKey,
      host: opts?.host,
      edgeProxySecret: opts?.edgeSecret,
    });

    if (status !== 200) {
      spinner.fail(chalk.red('  Failed to load stats'));
      process.exit(1);
    }

    const stats = data as Record<string, number>;
    spinner.stop();

    if (opts?.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    const total = stats.total || 0;
    const sent = stats.sent || 0;
    const failed = stats.failed || 0;
    const queued = stats.queued || 0;
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0.0';

    console.log('');
    console.log(`  ${chalk.bold.cyan('📊  Email Delivery Stats')}`);
    console.log('');
    console.log(`  ${chalk.dim('Total:')}    ${chalk.bold.white(total)}`);
    console.log(`  ${chalk.dim('Sent:')}     ${chalk.bold.green(sent)}`);
    console.log(`  ${chalk.dim('Queued:')}   ${chalk.bold.yellow(queued)}`);
    console.log(`  ${chalk.dim('Failed:')}   ${chalk.bold.red(failed)}`);
    console.log(`  ${chalk.dim('Success:')}  ${chalk.bold.cyan(successRate + '%')}`);
    console.log('');
  } catch {
    spinner.fail(chalk.red('  Network error'));
    process.exit(1);
  }
}
