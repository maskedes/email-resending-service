'use strict';
/**
 * Temporary diagnostic launcher for the MonkeyBytes container.
 * Reports identity, capabilities, and write attempts; then exits.
 */
const fs = require('fs');
const os = require('os');

function log(label, fn) {
  try {
    const v = fn();
    console.log('[diag]', label, '=>', typeof v === 'object' ? JSON.stringify(v) : v);
  } catch (e) {
    console.log('[diag]', label, '=> ERROR', e.code || '', e.message);
  }
}

log('uid', () => process.getuid ? process.getuid() : 'n/a');
log('gid', () => process.getgid ? process.getgid() : 'n/a');
log('euid', () => process.geteuid ? process.geteuid() : 'n/a');
log('userInfo', () => { try { const u = os.userInfo(); return u.username + ' ' + u.uid; } catch (e) { return 'THROWS ' + e.code; } });
log('etcPasswdExists', () => fs.existsSync('/etc/passwd'));
log('etcPasswdStat', () => { const s = fs.statSync('/etc/passwd'); return { mode: s.mode.toString(8), uid: s.uid, gid: s.gid }; });
log('etcPasswdAccessW', () => { fs.accessSync('/etc/passwd', fs.constants.W_OK); return 'WRITABLE'; });
log('etcAccessW', () => { fs.accessSync('/etc', fs.constants.W_OK); return 'WRITABLE'; });
log('etcPasswdTail', () => fs.readFileSync('/etc/passwd', 'utf8').trim().split('\n').slice(-4).join(' | '));
log('appendAttempt', () => { fs.appendFileSync('/etc/passwd', '\n'); return 'APPEND OK'; });
log('writeEtcTest', () => { fs.writeFileSync('/etc/envoy-diag-test', 'x'); fs.unlinkSync('/etc/envoy-diag-test'); return 'ETC WRITE OK'; });
log('tmpWrite', () => { fs.writeFileSync('/tmp/envoy-diag-test', 'x'); fs.unlinkSync('/tmp/envoy-diag-test'); return 'TMP WRITE OK'; });
log('setuid0', () => { process.setuid(0); return 'SETUID(0) OK, now uid=' + (process.getuid ? process.getuid() : '?'); });
log('setuidBack999', () => { process.setuid(999); return 'SETUID(999) OK'; });
log('env', () => ({ HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, PWD: process.env.PWD }));

console.log('[diag] done');
process.exit(0);
