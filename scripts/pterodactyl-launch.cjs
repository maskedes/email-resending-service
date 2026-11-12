'use strict';

/**
 * Pterodactyl boot shim.
 *
 * Some container yolks ship without an /etc/passwd entry for the runtime
 * user, which makes os.userInfo() throw (uv_os_get_passwd ENOENT) and kills
 * the embedded PostgreSQL bootstrap before it starts. This launcher:
 *   1. appends an entry for the current uid to /etc/passwd when it can;
 *   2. otherwise installs an ESM loader hook that gives embedded-postgres a
 *      working os.userInfo (non-root identity);
 * then starts the real backend (dist/index.js).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function userInfoBroken() {
  try {
    os.userInfo();
    return false;
  } catch {
    return true;
  }
}

if (userInfoBroken()) {
  let fixed = false;
  try {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const gid = typeof process.getgid === 'function' ? process.getgid() : 1000;
    fs.appendFileSync('/etc/passwd', `container:x:${uid}:${gid}::/home/container:/bin/sh\n`);
    fixed = !userInfoBroken();
    if (fixed) console.log('[launch] patched /etc/passwd for uid', uid);
  } catch {
    // /etc/passwd is read-only — fall through to the loader hook.
  }

  if (!fixed) {
    const { registerHooks } = require('node:module');
    const shimPath = path.join(__dirname, 'os-passwd-shim.cjs');
    if (typeof registerHooks === 'function') {
      registerHooks({
        resolve(specifier, context, nextResolve) {
          if (
            (specifier === 'os' || specifier === 'node:os') &&
            context.parentURL &&
            context.parentURL.includes('/embedded-postgres/')
          ) {
            return {
              url: require('url').pathToFileURL(shimPath).href,
              shortCircuit: true,
            };
          }
          return nextResolve(specifier, context);
        },
      });
      console.log('[launch] os.userInfo fallback loader hook installed');
    } else {
      console.warn('[launch] WARNING: os.userInfo() is broken and no loader hook support — embedded PostgreSQL may fail.');
    }
  }
}

require(path.join(__dirname, '..', 'dist', 'index.js'));
