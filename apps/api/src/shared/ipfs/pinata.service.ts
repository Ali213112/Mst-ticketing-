import { env } from '../../config/env.js';

interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

function pinataConfigured(): boolean {
  return Boolean(env.PINATA_API_KEY && env.PINATA_SECRET_KEY);
}

function authHeaders(): Record<string, string> {
  return {
    pinata_api_key: env.PINATA_API_KEY!,
    pinata_secret_api_key: env.PINATA_SECRET_KEY!,
  };
}

export function ipfsGatewayUrl(hash: string): string {
  return `${env.PINATA_GATEWAY}/ipfs/${hash}`;
}

export function ipfsUri(hash: string): string {
  return `ipfs://${hash}`;
}

function devFallback(name: string, seed = ''): { hash: string; uri: string; gatewayUrl: string } {
  const fakeHash = `dev_${Buffer.from(name + seed).toString('hex').slice(0, 46)}`;
  return { hash: fakeHash, uri: ipfsUri(fakeHash), gatewayUrl: ipfsGatewayUrl(fakeHash) };
}

export async function pinJsonToIpfs(
  name: string,
  content: unknown
): Promise<{ hash: string; uri: string; gatewayUrl: string }> {
  if (!pinataConfigured()) {
    return devFallback(name, JSON.stringify(content));
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: content,
        pinataMetadata: { name },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (env.NODE_ENV === 'development') {
        console.warn(`Pinata JSON pin failed, using dev fallback: ${detail}`);
        return devFallback(name, JSON.stringify(content));
      }
      throw new Error(`Pinata JSON pin failed: ${detail}`);
    }

    const data = (await response.json()) as PinataPinResponse;
    return {
      hash: data.IpfsHash,
      uri: ipfsUri(data.IpfsHash),
      gatewayUrl: ipfsGatewayUrl(data.IpfsHash),
    };
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('Pinata JSON pin error, using dev fallback:', error);
      return devFallback(name, JSON.stringify(content));
    }
    throw error;
  }
}

export async function pinFileToIpfs(
  name: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ hash: string; uri: string; gatewayUrl: string }> {
  if (!pinataConfigured()) {
    return devFallback(name, String(buffer.length));
  }

  try {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), name);
    form.append('pinataMetadata', JSON.stringify({ name }));

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text();
      if (env.NODE_ENV === 'development') {
        console.warn(`Pinata file pin failed, using dev fallback: ${detail}`);
        return devFallback(name, String(buffer.length));
      }
      throw new Error(`Pinata file pin failed: ${detail}`);
    }

    const data = (await response.json()) as PinataPinResponse;
    return {
      hash: data.IpfsHash,
      uri: ipfsUri(data.IpfsHash),
      gatewayUrl: ipfsGatewayUrl(data.IpfsHash),
    };
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      console.warn('Pinata file pin error, using dev fallback:', error);
      return devFallback(name, String(buffer.length));
    }
    throw error;
  }
}

export async function verifyIpfsHashResolvable(hash: string): Promise<boolean> {
  if (hash.startsWith('dev_')) return true;

  try {
    const response = await fetch(ipfsGatewayUrl(hash), { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export function buildTierMetadata(params: {
  tierName: string;
  eventName: string;
  description: string;
  imageHash: string;
  eventId: string;
  venueName?: string | null;
  eventDate: string;
  zone?: string | null;
  isTransferable: boolean;
}): Record<string, unknown> {
  return {
    name: `${params.tierName} — ${params.eventName}`,
    description: params.description,
    image: ipfsUri(params.imageHash),
    external_url: `${env.FRONTEND_URL}/events/${params.eventId}`,
    attributes: [
      { trait_type: 'Event', value: params.eventName },
      { trait_type: 'Tier', value: params.tierName },
      { trait_type: 'Venue', value: params.venueName ?? 'TBA' },
      { trait_type: 'Date', value: params.eventDate.slice(0, 10) },
      { trait_type: 'Zone', value: params.zone ?? 'General' },
      { trait_type: 'Transferable', value: params.isTransferable ? 'Yes' : 'No' },
    ],
  };
}
