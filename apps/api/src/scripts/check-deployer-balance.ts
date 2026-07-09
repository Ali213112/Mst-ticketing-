/**
 * Print deployer wallet address + native tMSTC balance (used for on-chain mint/deploy).
 *
 * Usage:
 *   pnpm --filter @ticketchain/api exec tsx src/scripts/check-deployer-balance.ts
 */
import 'dotenv/config';
import { env } from '../config/env.js';
import { getDeployerAddress } from '../shared/blockchain/event-contract.service.js';
import { getNativeBalanceWei } from '../shared/blockchain/mst.service.js';

function formatWei(wei: string): string {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const frac = value % 10n ** 18n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 6)}`;
}

async function main(): Promise<void> {
  if (!env.MST_DEPLOYER_PRIVATE_KEY) {
    console.error('MST_DEPLOYER_PRIVATE_KEY is not set in .env');
    process.exit(1);
  }

  const address = await getDeployerAddress();
  const balanceWei = await getNativeBalanceWei(address);

  console.log('MST RPC:     ', env.MST_RPC_URL);
  console.log('Chain ID:    ', env.MST_CHAIN_ID);
  console.log('Deployer:    ', address);
  console.log('Balance:     ', formatWei(balanceWei), 'tMSTC');
  console.log('Balance wei: ', balanceWei);

  if (BigInt(balanceWei) === 0n) {
    console.warn('\nWARN: Deployer has zero balance — fund this wallet from the MST testnet faucet before deploy/mint.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
