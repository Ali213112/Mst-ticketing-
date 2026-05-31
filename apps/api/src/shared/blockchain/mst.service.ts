import { Client } from '@mstblockchain/mst-sdk';
import { env } from '../../config/env.js';

let readOnlyClient: Client | null = null;

/** Read-only MST client (no private key) for health checks and block number. */
export function getMstReadClient(): Client {
  if (!readOnlyClient) {
    readOnlyClient = Client.createRandom(env.MST_RPC_URL);
  }
  return readOnlyClient;
}

export async function checkMstRpcConnection(): Promise<{ ok: boolean; blockNumber?: number }> {
  try {
    const client = getMstReadClient();
    const blockNumber = await client.provider.getBlockNumber();
    return { ok: true, blockNumber };
  } catch {
    return { ok: false };
  }
}
