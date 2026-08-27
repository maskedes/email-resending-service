const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

function usage() {
  console.error('Usage: node scripts/generate_dkim.js <selector> <domain>');
  process.exit(2);
}

if (process.argv.length < 4) usage();
const selector = process.argv[2];
const domain = process.argv[3];

const outDir = path.join(__dirname, 'dkim', `${selector}.${domain}`);
fs.mkdirSync(outDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

const privPath = path.join(outDir, `${selector}.private.pem`);
const pubPath = path.join(outDir, `${selector}.public.pem`);
fs.writeFileSync(privPath, privateKey);
fs.writeFileSync(pubPath, publicKey);

// Build DKIM TXT 'p=' value by stripping header/footer and newlines
const pubBody = publicKey
  .replace(/-----BEGIN PUBLIC KEY-----/, '')
  .replace(/-----END PUBLIC KEY-----/, '')
  .replace(/\s+/g, '');

const dkimTxt = `v=DKIM1; k=rsa; p=${pubBody}`;
fs.writeFileSync(path.join(outDir, `${selector}.dns.txt`), dkimTxt);

console.log('DKIM generated:');
console.log('private:', privPath);
console.log('public:', pubPath);
console.log('dns-txt:', path.join(outDir, `${selector}.dns.txt`));
console.log('\nDNS record name:');
console.log(`${selector}._domainkey.${domain}`);
console.log('\nDNS TXT value (wrap as one string):');
console.log(dkimTxt);
