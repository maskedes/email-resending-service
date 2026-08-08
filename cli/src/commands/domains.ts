import chalk from 'chalk';
import ora from 'ora';
import { config, api } from '../config';

type DomainAction = 'list' | 'add' | 'verify' | 'delete';

const STATUS_COLORS: Record<string, chalk.Chalk> = {
  verified: chalk.green,
  pending: chalk.yellow,
  partial: chalk.blue,
  failed: chalk.red,
};

function formatStatus(status: string): string {
  const color = STATUS_COLORS[status] || chalk.dim;
  return color(status);
}

function checkMark(val: boolean): string {
  return val ? chalk.green('✓') : chalk.red('✗');
}

export async function domainsCommand(action: DomainAction, arg?: string, globalOpts?: { apiKey?: string; host?: string; json?: boolean }) {
  if (!config.apiKey && !globalOpts?.apiKey) {
    console.error(chalk.red('\n  ✗ No API key configured. Run `envoy init` first.\n'));
    process.exit(1);
  }

  switch (action) {
    case 'list': {
      const spinner = ora('  Loading domains...').start();
      try {
        const { status, data } = await api('GET', '/api/domains');
        if (status !== 200) {
          spinner.fail(chalk.red('  Failed to load domains'));
          process.exit(1);
        }
        const domains = (data as { data: Record<string, unknown>[] }).data;
        spinner.stop();

        if (!domains.length) {
          console.log(chalk.dim('\n  No domains yet. Add one with: envoy domain-add example.com\n'));
          return;
        }

        console.log('');
        for (const d of domains) {
          const s = formatStatus(d.status as string);
          console.log(`  ${chalk.white.bold(d.name)}  ${s}`);
          console.log(`    ${chalk.dim('ID:')}      ${chalk.dim(d.id)}`);
          console.log(`    ${chalk.dim('SPF:')}     ${checkMark(d.spf_verified as boolean)}  ${chalk.dim('DKIM:')} ${checkMark(d.dkim_verified as boolean)}  ${chalk.dim('DMARC:')} ${checkMark(d.dmarc_verified as boolean)}`);
          if (d.verified_at) {
            console.log(`    ${chalk.dim('Verified:')} ${new Date(d.verified_at as string).toLocaleString()}`);
          }
          console.log('');
        }
      } catch {
        spinner.fail(chalk.red('  Network error'));
        process.exit(1);
      }
      break;
    }

    case 'add': {
      if (!arg) {
        console.error(chalk.red('\n  ✗ Domain name is required.\n'));
        process.exit(1);
      }
      const spinner = ora(`  Registering ${arg}...`).start();
      try {
        const { status, data } = await api('POST', '/api/domains', { name: arg });
        if (status === 201) {
          const domain = (data as { domain: Record<string, unknown> }).domain;
          spinner.succeed(chalk.green(`  Domain ${arg} registered!`));
          console.log('');
          console.log(`  ${chalk.dim('Add these DNS records to verify your domain:')}\n`);
          console.log(`  ${chalk.bold('SPF (TXT):')}   ${chalk.white(domain.spf_record)}`);
          console.log(`  ${chalk.bold('DKIM (TXT):')}  ${chalk.white(domain.dkim_record_name)}`);
          console.log(`    Value: ${chalk.white(domain.dkim_record_value)}`);
          console.log(`  ${chalk.bold('DMARC (TXT):')} ${chalk.white(domain.dmarc_record)}`);
          console.log('');
          console.log(chalk.dim('  Verification will run automatically. Check status with: envoy domains'));
          console.log('');
        } else {
          const err = data as { error?: { message?: string } };
          spinner.fail(chalk.red(`  ${err.error?.message || 'Failed to add domain'}`));
          process.exit(1);
        }
      } catch {
        spinner.fail(chalk.red('  Network error'));
        process.exit(1);
      }
      break;
    }

    case 'verify': {
      if (!arg) {
        console.error(chalk.red('\n  ✗ Domain ID is required.\n'));
        process.exit(1);
      }
      const spinner = ora('  Verifying DNS records...').start();
      try {
        const { status, data } = await api('POST', `/api/domains/${arg}/verify`);
        if (status === 200) {
          const result = data as { domain: Record<string, unknown>; checks: Record<string, unknown>[]; overall: string };
          spinner.succeed(chalk.green(`  Verification complete: ${formatStatus(result.overall)}`));
          console.log('');
          for (const c of result.checks) {
            const icon = c.verified ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${icon} ${chalk.bold(c.type as string)}  ${chalk.dim(c.hostname as string)}`);
            console.log(`    ${chalk.dim(c.detail as string)}`);
          }
          console.log('');
        } else {
          const err = data as { error?: { message?: string } };
          spinner.fail(chalk.red(`  ${err.error?.message || 'Verification failed'}`));
          process.exit(1);
        }
      } catch {
        spinner.fail(chalk.red('  Network error'));
        process.exit(1);
      }
      break;
    }

    case 'delete': {
      if (!arg) {
        console.error(chalk.red('\n  ✗ Domain ID is required.\n'));
        process.exit(1);
      }
      const spinner = ora('  Deleting domain...').start();
      try {
        const { status, data } = await api('DELETE', `/api/domains/${arg}`);
        if (status === 200) {
          spinner.succeed(chalk.green('  Domain deleted.'));
        } else {
          const err = data as { error?: { message?: string } };
          spinner.fail(chalk.red(`  ${err.error?.message || 'Failed to delete domain'}`));
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
