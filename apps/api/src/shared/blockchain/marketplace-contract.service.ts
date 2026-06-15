import { Contract, Wallet, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { env } from '../../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MarketplaceArtifact {
  abi: InterfaceAbi;
  bytecode: string;
}

let artifact: MarketplaceArtifact | null = null;

function loadArtifact(): MarketplaceArtifact {
  if (!artifact) {
    const artifactPath = path.resolve(__dirname, 'abis/TicketMarketplace.json');
    artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as MarketplaceArtifact;
  }
  return artifact;
}

function getDeployerWallet(): Wallet {
  if (!env.MST_DEPLOYER_PRIVATE_KEY) {
    throw new Error('MST_DEPLOYER_PRIVATE_KEY is not configured');
  }
  return new Wallet(env.MST_DEPLOYER_PRIVATE_KEY, new JsonRpcProvider(env.MST_RPC_URL));
}

function getMarketplaceContract(signer?: Wallet): Contract {
  if (!env.MARKETPLACE_CONTRACT_ADDRESS) {
    throw new Error('MARKETPLACE_CONTRACT_ADDRESS is not configured');
  }
  const { abi } = loadArtifact();
  const wallet = signer ?? getDeployerWallet();
  return new Contract(env.MARKETPLACE_CONTRACT_ADDRESS, abi, wallet);
}

export function isMarketplaceConfigured(): boolean {
  return Boolean(env.MARKETPLACE_CONTRACT_ADDRESS && env.MST_DEPLOYER_PRIVATE_KEY);
}

export async function listTicketOnChain(params: {
  sellerPrivateKey?: string;
  ticketContract: string;
  tokenId: number;
  tierId: number;
  askPriceWei: string;
  maxPriceWei: string;
}): Promise<{ listingId: number; txHash: string }> {
  const wallet = params.sellerPrivateKey
    ? new Wallet(params.sellerPrivateKey, new JsonRpcProvider(env.MST_RPC_URL))
    : getDeployerWallet();
  const contract = getMarketplaceContract(wallet);

  const tx = await contract.listTicket(
    params.ticketContract,
    params.tokenId,
    params.tierId,
    params.askPriceWei,
    params.maxPriceWei
  );
  const receipt = await tx.wait();
  const listingId = Number(await contract.nextListingId()) - 1;
  return { listingId, txHash: receipt.hash as string };
}

export async function buyTicketOnChain(params: {
  listingId: number;
  askPriceWei: string;
  buyerPrivateKey?: string;
}): Promise<string> {
  const wallet = params.buyerPrivateKey
    ? new Wallet(params.buyerPrivateKey, new JsonRpcProvider(env.MST_RPC_URL))
    : getDeployerWallet();
  const contract = getMarketplaceContract(wallet);

  const tx = await contract.buyTicket(params.listingId, { value: params.askPriceWei });
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function cancelListingOnChain(listingId: number): Promise<string> {
  const contract = getMarketplaceContract();
  const tx = await contract.cancelListing(listingId);
  const receipt = await tx.wait();
  return receipt.hash as string;
}
