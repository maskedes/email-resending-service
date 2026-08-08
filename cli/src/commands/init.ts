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
  return new Promise((resolve) => {
    process.stdout.write(`  ${question}: `);
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
        process.exit();
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

  const apiKey = await askHidden('  API Key');
  if (!apiKey.startsWith('fms_')) {
    console.error(chalk.red('\n  ✗ API key must start with fms_\n'));
    process.exit(1);
  }

  const host = await ask('  API Host', currentHost);

  const currentEdge = config.edgeProxySecret;
  const edgeSecret = await ask('  Edge Proxy Secret (leave empty to skip)', currentEdge || '');

  config.apiKey = apiKey;
  config.host = host;
  if (edgeSecret) config.edgeProxySecret = edgeSecret;

  console.log(chalk.green('\n  ✓ Configuration saved!\n'));
}
