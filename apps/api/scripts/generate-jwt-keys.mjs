import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.resolve(__dirname, '../certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const privatePath = path.join(certsDir, 'private.pem');
const publicPath = path.join(certsDir, 'public.pem');

if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
  console.log('JWT keys already exist in apps/api/certs/');
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(privatePath, privateKey);
fs.writeFileSync(publicPath, publicKey);
console.log('Generated RS256 key pair in apps/api/certs/');
