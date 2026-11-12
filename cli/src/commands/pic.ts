import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../config';

interface GlobalOpts { apiKey?: string; host?: string; edgeProxySecret?: string; edgeSecret?: string; json?: boolean }
function apiOpts(g?: GlobalOpts) {
  return { apiKey: g?.apiKey, host: g?.host, edgeProxySecret: g?.edgeProxySecret || g?.edgeSecret, json: g?.json };
}

const MAX_ENCODED = 300_000;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

export async function picCommand(
  action: 'get' | 'set',
  opts: { file?: string; url?: string; clear?: boolean },
  globalOpts?: GlobalOpts
) {
  if (action === 'get') {
    const spinner = ora('  Loading profile picture...').start();
    try {
      const { status, data } = await api('GET', '/api/profile/pic', undefined, apiOpts(globalOpts));
      const body = data as { avatar_url?: string | null; error?: { message?: string } };
      if (status !== 200) {
        spinner.fail(chalk.red(`  ${body.error?.message || 'Failed to load profile picture'}`));
        process.exit(1);
      }
      spinner.stop();
      if (body.avatar_url) {
        const preview = body.avatar_url.startsWith('data:image/')
          ? `${chalk.green('set')} (inline image, ${Math.round(body.avatar_url.length / 1024)}KB encoded)`
          : `${chalk.green('set')} ${body.avatar_url}`;
        console.log(`\n  ${chalk.dim('Profile picture:')} ${preview}\n`);
      } else {
        console.log(`\n  ${chalk.dim('Profile picture:')} ${chalk.yellow('not set')}`);
        console.log(chalk.dim('  Set one with: envoy pic --file ./me.png   or   envoy pic --url https://…\n'));
      }
    } catch {
      spinner.fail(chalk.red('  Network error'));
      process.exit(1);
    }
    return;
  }

  // ─── set ───
  if (opts.clear) {
    const spinner = ora('  Clearing profile picture...').start();
    try {
      const { status, data } = await api('PUT', '/api/profile/pic', { avatar_url: '' }, apiOpts(globalOpts));
      const body = data as { error?: { message?: string } };
      if (status !== 200) {
        spinner.fail(chalk.red(`  ${body.error?.message || 'Failed to clear profile picture'}`));
        process.exit(1);
      }
      spinner.succeed(chalk.green('  Profile picture cleared.'));
    } catch {
      spinner.fail(chalk.red('  Network error'));
      process.exit(1);
    }
    return;
  }

  if (opts.url) {
    const url = opts.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      console.error(chalk.red('\n  ✗ --url must start with http(s)://\n'));
      process.exit(1);
    }
    const spinner = ora('  Setting profile picture from URL...').start();
    try {
      const { status, data } = await api('PUT', '/api/profile/pic', { avatar_url: url }, apiOpts(globalOpts));
      const body = data as { error?: { message?: string } };
      if (status !== 200) {
        spinner.fail(chalk.red(`  ${body.error?.message || 'Failed to set profile picture'}`));
        process.exit(1);
      }
      spinner.succeed(chalk.green('  Profile picture updated.'));
    } catch {
      spinner.fail(chalk.red('  Network error'));
      process.exit(1);
    }
    return;
  }

  if (opts.file) {
    const filePath = path.resolve(opts.file);
    let buf: Buffer;
    try {
      buf = fs.readFileSync(filePath);
    } catch {
      console.error(chalk.red(`\n  ✗ Could not read file: ${filePath}\n`));
      process.exit(1);
    }
    const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
    if (!mime) {
      console.error(chalk.red('\n  ✗ Unsupported image type. Use png, jpg, gif, webp, bmp or svg.\n'));
      process.exit(1);
    }
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
    if (dataUrl.length > MAX_ENCODED) {
      console.error(chalk.red(`\n  ✗ Image too large (${Math.round(dataUrl.length / 1024)}KB encoded; max ~${Math.round(MAX_ENCODED / 1024)}KB).`));
      console.error(chalk.dim('    Resize to 256×256 first, or upload from the dashboard (Settings → Account) which resizes automatically.\n'));
      process.exit(1);
    }
    const spinner = ora('  Uploading profile picture...').start();
    try {
      const { status, data } = await api('PUT', '/api/profile/pic', { avatar_url: dataUrl }, apiOpts(globalOpts));
      const body = data as { error?: { message?: string } };
      if (status !== 200) {
        spinner.fail(chalk.red(`  ${body.error?.message || 'Failed to set profile picture'}`));
        process.exit(1);
      }
      spinner.succeed(chalk.green('  Profile picture updated.'));
    } catch {
      spinner.fail(chalk.red('  Network error'));
      process.exit(1);
    }
    return;
  }

  console.error(chalk.red('\n  ✗ Provide one of --file <path>, --url <https://…> or --clear.\n'));
  process.exit(1);
}
