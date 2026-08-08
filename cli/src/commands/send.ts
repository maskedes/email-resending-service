import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import { config, api } from '../config';

interface SendOptions {
  to: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  file?: string;
  tag?: string[];
  schedule?: number;
  apiKey?: string;
  host?: string;
  json?: boolean;
  edgeSecret?: string;
  edgeProxySecret?: string;
  [key: string]: unknown;
}

export async function sendCommand(opts: SendOptions) {
  if (!config.apiKey && !opts.apiKey) {
    console.error(chalk.red('\n  ✗ No API key configured. Run `envoy init` first.\n'));
    process.exit(1);
  }

  let htmlBody = opts.html;

  // Read HTML from file if specified
  if (opts.file) {
    try {
      htmlBody = readFileSync(opts.file, 'utf-8');
    } catch (err) {
      console.error(chalk.red(`\n  ✗ Could not read file: ${opts.file}\n`));
      process.exit(1);
    }
  }

  if (!htmlBody && !opts.text) {
    console.error(chalk.red('\n  ✗ Either --html, --text, or --file is required.\n'));
    process.exit(1);
  }

  // Parse tags
  const tags: Record<string, string> = {};
  if (opts.tag) {
    for (const t of opts.tag) {
      const [key, ...rest] = t.split('=');
      tags[key] = rest.join('=');
    }
  }

  const body: Record<string, unknown> = {
    to: opts.to,
    subject: opts.subject || '(no subject)',
  };

  if (opts.from) body.from = opts.from;
  if (htmlBody) body.html = htmlBody;
  if (opts.text) body.text = opts.text;
  if (Object.keys(tags).length > 0) body.tags = tags;
  if (opts.schedule) body.scheduleInMs = opts.schedule;

  const spinner = ora('  Sending email...').start();

  try {
    const { status, data } = await api('POST', '/api/emails/send', body, {
      apiKey: opts.apiKey,
      host: opts.host,
      json: opts.json,
      edgeProxySecret: opts.edgeSecret,
    });

    if (status === 200) {
      const result = data as Record<string, unknown>;
      spinner.succeed(chalk.green('  Email sent successfully!'));
      console.log('');
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`  ${chalk.dim('ID:')}      ${chalk.white(result.id)}`);
        console.log(`  ${chalk.dim('From:')}    ${chalk.white(result.from)}`);
        console.log(`  ${chalk.dim('To:')}      ${chalk.white(result.to)}`);
        console.log(`  ${chalk.dim('Subject:')} ${chalk.white(result.subject)}`);
        console.log(`  ${chalk.dim('Status:')}  ${chalk.yellow(result.status)}`);
        console.log('');
      }
    } else {
      const err = data as { error?: { message?: string } };
      spinner.fail(chalk.red(`  ${err.error?.message || 'Failed to send email'}`));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red('  Network error — is the server reachable?'));
    process.exit(1);
  }
}
