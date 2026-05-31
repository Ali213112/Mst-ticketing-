import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONTRACTS = ['EventTickets1155', 'OrgRegistry'];
const artifactsDir = path.resolve(__dirname, '../artifacts/contracts');
const apiAbisDir = path.resolve(__dirname, '../../../apps/api/src/shared/blockchain/abis');

fs.mkdirSync(apiAbisDir, { recursive: true });

for (const name of CONTRACTS) {
  const artifactPath = path.join(artifactsDir, `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.warn(`Artifact not found: ${artifactPath}`);
    continue;
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const outPath = path.join(apiAbisDir, `${name}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ contractName: name, abi: artifact.abi, bytecode: artifact.bytecode }, null, 2)
  );
  console.log(`Copied ABI: ${name} -> ${outPath}`);
}
