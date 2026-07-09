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

const WEI_PER_TMSTC = BigInt('1000000000000000000');

/** Format wei string to human-readable tMSTC (18 decimals). */
export function formatWeiToTmstc(wei: string | bigint, maxDecimals = 4): string {
  try {
    const value = typeof wei === 'string' ? BigInt(wei) : wei;
    const whole = value / WEI_PER_TMSTC;
    const frac = value % WEI_PER_TMSTC;
    if (frac === BigInt(0)) return whole.toString();
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
    const trimmed = fracStr.slice(0, maxDecimals);
    return `${whole}.${trimmed}`;
  } catch {
    return '0';
  }
}
