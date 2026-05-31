import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

const DEMO_ORG_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const orgRegistry = await ethers.deployContract('OrgRegistry');
  await orgRegistry.waitForDeployment();
  const orgRegistryAddress = await orgRegistry.getAddress();
  console.log('OrgRegistry:', orgRegistryAddress);

  await orgRegistry.registerOrg(DEMO_ORG_WALLET, 'demo-events');

  const eventTickets = await ethers.deployContract('EventTickets1155', [
    DEMO_ORG_WALLET,
    'demo-event-local',
    'https://gateway.pinata.cloud/ipfs/',
  ]);
  await eventTickets.waitForDeployment();
  const eventTicketsAddress = await eventTickets.getAddress();
  console.log('EventTickets1155 (sample):', eventTicketsAddress);

  writeDeployOutput({
    network: 'hardhat',
    orgRegistry: orgRegistryAddress,
    sampleEventTickets: eventTicketsAddress,
  });
}

function writeDeployOutput(data: Record<string, string>) {
  const outDir = path.resolve(__dirname, '../deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${data.network}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...data, deployedAt: new Date().toISOString() }, null, 2));
  console.log(`\nSaved deployment addresses to ${file}`);
  console.log('\nAdd to .env:');
  console.log(`ORG_REGISTRY_ADDRESS=${data.orgRegistry}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
