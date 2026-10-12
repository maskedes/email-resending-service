const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');

const rawKey = 'fms_webhooktestkey0000000000000000000000000000000000000000000000';
const hash = bcrypt.hashSync(rawKey, 10);
const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

fs.writeFileSync(
  'scripts/_test_creds.json',
  JSON.stringify({ rawKey, hash, secret }, null, 2)
);
console.log('rawKey =', rawKey);
console.log('hash   =', hash);
console.log('secret =', secret);
console.log('WROTE scripts/_test_creds.json');
