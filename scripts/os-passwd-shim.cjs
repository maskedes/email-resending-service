'use strict';

/**
 * Drop-in for the node:os module used by embedded-postgres on images where
 * /etc/passwd has no entry for the runtime user. Keeps every real export but
 * makes userInfo() fall back to a synthetic non-root identity instead of
 * throwing (uv_os_get_passwd ENOENT).
 *
 * Named exports are written as literal module.exports keys so the CJS module
 * lexer exposes them to `import { userInfo } from '<shim>'`.
 */
const real = require('node:os');

const wrappedUserInfo = function userInfo(options) {
  try {
    return real.userInfo.call(real, options);
  } catch {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const gid = typeof process.getgid === 'function' ? process.getgid() : 1000;
    return {
      uid,
      gid,
      username: 'container',
      homedir: process.env.HOME || '/home/container',
      shell: null,
    };
  }
};

exports.platform = real.platform;
exports.tmpdir = real.tmpdir;
exports.userInfo = wrappedUserInfo;
exports.hostname = real.hostname;
exports.loadavg = real.loadavg;
exports.uptime = real.uptime;
exports.totalmem = real.totalmem;
exports.freemem = real.freemem;
exports.cpus = real.cpus;
exports.type = real.type;
exports.release = real.release;
exports.networkInterfaces = real.networkInterfaces;
exports.homedir = real.homedir;
exports.arch = real.arch;
exports.EOL = real.EOL;
exports.endianness = real.endianness;
exports.availableParallelism = real.availableParallelism;
exports.constants = real.constants;
exports.machine = real.machine;
exports.getPriority = real.getPriority;
exports.setPriority = real.setPriority;

// Carry anything newer that the literal list above misses (dynamic access
// through the default export still works).
for (const key of Object.keys(real)) {
  if (!(key in exports)) {
    exports[key] = real[key];
  }
}
exports.userInfo = wrappedUserInfo;
