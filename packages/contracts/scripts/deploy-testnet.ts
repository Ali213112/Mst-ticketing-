import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

const DEMO_ORG_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'native');

  const orgRegistry = await ethers.deployContract('OrgRegistry');
  await orgRegistry.waitForDeployment();
  const orgRegistryAddress = await orgRegistry.getAddress();
  console.log('OrgRegistry:', orgRegistryAddress);

  const tx = await orgRegistry.registerOrg(DEMO_ORG_WALLET, 'demo-events');
  await tx.wait();
  console.log('Registered org wallet:', DEMO_ORG_WALLET);

  writeDeployOutput({
    network: 'mstTestnet',
    orgRegistry: orgRegistryAddress,
    deployer: deployer.address,
  });
}

function writeDeployOutput(data: Record<string, string>) {
  const outDir = path.resolve(__dirname, '../deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${data.network}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...data, deployedAt: new Date().toISOString() }, null, 2));
  console.log(`\nSaved deployment addresses to ${file}`);
  console.log('\nUpdate .env:');
  console.log(`ORG_REGISTRY_ADDRESS=${data.orgRegistry}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
