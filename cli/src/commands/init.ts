import * as readline from 'readline';
import chalk from 'chalk';
import { config } from '../config';

function ask(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`  ${question}${suffix}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function askHidden(question: string): Promise<string> {
  // Non-TTY (piped/CI) fallback — use plain readline
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(`  ${question} (leave empty to keep current): `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
  return new Promise((resolve) => {
    process.stdout.write(`  ${question} (leave empty to keep current): `);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    let password = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\u007F' || char === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('•');
      }
    };
    process.stdin.on('data', onData);
  });
}

export async function initCommand() {
  console.log(chalk.bold.cyan('\n  ⚡ E-NVOY CLI Setup\n'));

  const currentKey = config.apiKey;
  const currentHost = config.host;

  if (currentKey) {
    console.log(chalk.dim(`  Current API key: ${currentKey.slice(0, 8)}...${currentKey.slice(-4)}`));
    console.log(chalk.dim(`  Current host:    ${currentHost}\n`));
  }

  let apiKey = await askHidden('  API Key');
  // Empty keeps current key
  if (!apiKey) {
    if (!currentKey) {
      console.error(chalk.red('\n  ✗ API key is required on first setup.\n'));
      process.exit(1);
    }
    apiKey = currentKey;
    console.log(chalk.dim('  Keeping current API key.'));
  } else if (!apiKey.startsWith('fms_')) {
    console.error(chalk.red('\n  ✗ API key must start with fms_\n'));
    process.exit(1);
  }

  let host = await ask('  API Host', currentHost);
  host = host.trim();
  if (host) {
    try {
      const u = new URL(host);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('');
    } catch {
      console.error(chalk.red('\n  ✗ Invalid host URL (must be http(s)://...).\n'));
      process.exit(1);
    }
  } else {
    host = currentHost;
  }

  const currentEdge = config.edgeProxySecret;
  const edgeSecretRaw = await ask('  Edge Proxy Secret (leave empty to keep, \"clear\" to remove)', currentEdge ? '***' : '');
  let edgeSecret = edgeSecretRaw;
  // Empty keeps current; "clear" removes it
  if (!edgeSecretRaw) {
    edgeSecret = currentEdge;
  } else if (edgeSecretRaw.toLowerCase() === 'clear') {
    edgeSecret = '';
  }

  config.apiKey = apiKey;
  config.host = host;
  config.edgeProxySecret = edgeSecret;

  console.log(chalk.green('\n  ✓ Configuration saved!\n'));
}
