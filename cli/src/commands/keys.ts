import chalk from 'chalk';
import ora from 'ora';
import { config, api } from '../config';

type KeyAction = 'list' | 'delete';

interface GlobalOpts2 { apiKey?: string; host?: string; edgeProxySecret?: string; edgeSecret?: string; json?: boolean }
function apiOpts2(g?: GlobalOpts2) { return { apiKey: g?.apiKey, host: g?.host, edgeProxySecret: g?.edgeProxySecret || g?.edgeSecret }; }

export async function keysCommand(action: KeyAction, arg?: string, _opts?: { email?: string }, globalOpts?: GlobalOpts2) {
  switch (action) {
    case 'list': {
      const spinner = ora('  Loading API keys...').start();
      try {
        const { status, data } = await api('GET', '/api/apikeys', undefined, apiOpts2(globalOpts));
        if (status !== 200) {
          spinner.fail(chalk.red('  Failed to load API keys'));
          process.exit(1);
        }
        const keys = (data as { data: Record<string, unknown>[] }).data;
        spinner.stop();

        if (!keys.length) {
          console.log(chalk.dim('\n  No API keys yet. Create one from the dashboard (API Keys page) — the CLI no longer mints keys.\n'));
          return;
        }

        console.log('');
        for (const k of keys) {
          const active = k.is_active ? chalk.green('active') : chalk.red('inactive');
          console.log(`  ${chalk.white.bold(k.name)}  ${active}`);
          console.log(`    ${chalk.dim('ID:')}     ${chalk.dim(k.id)}`);
          console.log(`    ${chalk.dim('Email:')}  ${chalk.dim(k.email || '—')}`);
          console.log(`    ${chalk.dim('Emails:')} ${chalk.white(k.total_emails_sent)}`);
          if (k.last_used_at) {
            console.log(`    ${chalk.dim('Last used:')} ${new Date(k.last_used_at as string).toLocaleString()}`);
          }
          console.log('');
        }
      } catch {
        spinner.fail(chalk.red('  Network error'));
        process.exit(1);
      }
      break;
    }

    case 'delete': {
      if (!arg) {
        console.error(chalk.red('\n  ✗ API key ID is required.\n'));
        process.exit(1);
      }
      const spinner = ora('  Deleting API key...').start();
      try {
        const { status, data } = await api('DELETE', `/api/apikeys/${arg}/delete`, undefined, apiOpts2(globalOpts));
        if (status === 200) {
          spinner.succeed(chalk.green('  API key deleted.'));
        } else {
          const err = data as { error?: { message?: string } };
          spinner.fail(chalk.red(`  ${err.error?.message || 'Failed to delete key'}`));
          process.exit(1);
        }
      } catch {
        spinner.fail(chalk.red('  Network error'));
        process.exit(1);
      }
      break;
    }
  }
}
