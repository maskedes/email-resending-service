// Quick sanity test for the DNS verification chain (run via ts-node)
import { checkAllDns } from '../src/services/dnsService';

async function main() {
  const tests = [
    { name: 'gmail.com', dkimRecordName: 'fmtest._domainkey', dkimRecordValue: 'v=DKIM1; k=rsa; p=nonexistent' },
    { name: 'definitely-not-a-real-domain-xyz123.invalid', dkimRecordName: 'fmtest._domainkey', dkimRecordValue: 'v=DKIM1; k=rsa; p=nonexistent' },
  ];

  for (const t of tests) {
    console.log(`\n===== ${t.name} =====`);
    try {
      const checks = await checkAllDns(t);
      for (const c of checks) {
        console.log(`  [${c.type}] ${c.verified ? 'PASS' : 'FAIL'}  ${c.hostname}`);
        console.log(`       ${c.detail}`);
      }
      const all = checks.every((c) => c.verified);
      console.log(`  => OVERALL: ${all ? 'VERIFIED' : 'NOT VERIFIED'}`);
    } catch (e: any) {
      console.log('  ERROR:', e.message);
    }
  }
}

main().then(() => process.exit(0));
