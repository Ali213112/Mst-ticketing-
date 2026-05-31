import 'dotenv/config';
import {
  pinFileToIpfs,
  pinJsonToIpfs,
  verifyIpfsHashResolvable,
} from '../shared/ipfs/pinata.service.js';

async function main(): Promise<void> {
  const json = await pinJsonToIpfs('pinata-test', { hello: 'ticketchain', ts: Date.now() });
  console.log('JSON pin hash:', json.hash);
  console.log('JSON is dev fallback:', json.hash.startsWith('dev_'));

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const file = await pinFileToIpfs('test.png', png, 'image/png');
  console.log('File pin hash:', file.hash);
  console.log('File is dev fallback:', file.hash.startsWith('dev_'));

  const resolvable = await verifyIpfsHashResolvable(json.hash);
  console.log('Gateway resolvable:', resolvable);

  if (json.hash.startsWith('dev_') || file.hash.startsWith('dev_')) {
    console.error('FAIL: Pinata still using dev fallback — check API keys');
    process.exit(1);
  }
  if (!resolvable) {
    console.warn('WARN: CID not yet resolvable on gateway (may need a few seconds)');
  }
  console.log('PASS: Real Pinata CIDs returned');
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
