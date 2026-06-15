const BLOCK_EXPLORER_URL =
  process.env.NEXT_PUBLIC_MST_BLOCK_EXPLORER_URL ?? 'https://testnet.mstscan.com';

export function isExplorableAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isExplorableTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function getAddressExplorerUrl(address: string): string {
  return `${BLOCK_EXPLORER_URL}/address/${address}`;
}

export function getTxExplorerUrl(txHash: string): string {
  return `${BLOCK_EXPLORER_URL}/tx/${txHash}`;
}
