export type WalletProviderId = 'metamask' | 'phantom';

export interface ConnectedExternalWallet {
  provider: WalletProviderId;
  address: string;
  chainId: number;
}

const STORAGE_KEY = 'ticketchain_external_wallet';

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_MST_CHAIN_ID ?? 91562037);
const RPC_URL = process.env.NEXT_PUBLIC_MST_RPC_URL ?? 'https://testnetrpc.mstblockchain.com';
const EXPLORER_URL = process.env.NEXT_PUBLIC_MST_BLOCK_EXPLORER_URL ?? 'https://testnet.mstscan.com';

export const MST_CHAIN_PARAMS = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: 'MST Testnet',
  nativeCurrency: { name: 'tMSTC', symbol: 'tMSTC', decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
} as const;

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { isMetaMask?: boolean };
    phantom?: { ethereum?: Eip1193Provider };
  }
}

function getMetaMaskProvider(): Eip1193Provider {
  const eth = window.ethereum;
  if (!eth) {
    throw new Error('MetaMask is not installed. Install the extension and refresh.');
  }
  // When multiple extensions inject providers (MetaMask + Phantom, etc.)
  const multi = (eth as Eip1193Provider & { providers?: Eip1193Provider[] }).providers;
  if (Array.isArray(multi)) {
    const mm = multi.find((p) => (p as Eip1193Provider & { isMetaMask?: boolean }).isMetaMask);
    if (mm) return mm;
  }
  return eth;
}

function getProvider(id: WalletProviderId): Eip1193Provider {
  if (id === 'metamask') {
    return getMetaMaskProvider();
  }

  const phantomEvm = window.phantom?.ethereum;
  if (!phantomEvm) {
    throw new Error('Phantom EVM is not available. Open Phantom and enable Ethereum, or install Phantom.');
  }
  return phantomEvm;
}

export function getStoredWallet(): ConnectedExternalWallet | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectedExternalWallet;
  } catch {
    return null;
  }
}

export function storeWallet(wallet: ConnectedExternalWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function clearStoredWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function addMstChain(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [MST_CHAIN_PARAMS],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [MST_CHAIN_PARAMS],
      });
      return;
    }
    throw err;
  }
}

export async function switchToMstChain(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MST_CHAIN_PARAMS.chainId }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await addMstChain(provider);
      return;
    }
    throw err;
  }
}

/** Ask the wallet to show account picker / permission UI again. */
export async function requestWalletPermission(providerId: WalletProviderId): Promise<void> {
  const provider = getProvider(providerId);
  try {
    await provider.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Some wallets only support eth_requestAccounts — fall through
  }
}

export async function connectExternalWallet(
  providerId: WalletProviderId,
  options?: { requestPermission?: boolean }
): Promise<ConnectedExternalWallet> {
  const provider = getProvider(providerId);

  if (options?.requestPermission) {
    await requestWalletPermission(providerId);
  }

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  const address = accounts[0];
  if (!address) {
    throw new Error('No account returned from wallet');
  }

  await switchToMstChain(provider);

  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
  const chainId = parseInt(chainHex, 16);

  const wallet: ConnectedExternalWallet = {
    provider: providerId,
    address: address.toLowerCase(),
    chainId,
  };
  storeWallet(wallet);
  return wallet;
}

export async function fetchExternalBalanceWei(address: string): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });
  const json = (await res.json()) as { result?: string };
  if (!json.result) return '0';
  return BigInt(json.result).toString();
}

export function isMetaMaskAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    getMetaMaskProvider();
    return true;
  } catch {
    return false;
  }
}

export function isPhantomAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.phantom?.ethereum);
}
