const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export interface AuthUser {
  id: string;
  email: string;
  walletAddress: string;
  role: number;
  orgIds: string[];
}

export interface EventSummary {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  country: string | null;
  eventDate: string;
  status: string;
  imageIpfsUrl: string | null;
  totalTicketsSold: number;
}

export interface TierResponse {
  id: string;
  eventId: string;
  tierIndex: number;
  name: string;
  description: string | null;
  totalSupply: number;
  minted: number;
  maxPerWallet: number;
  priceWei: string;
  priceDisplay: number | null;
  status: string;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  venueName: string | null;
  contractAddress: string | null;
  tiers?: TierResponse[];
}

export interface CheckoutResponse {
  orderId: string;
  paymentUrl: string;
  amountFiat: number;
  currency: string;
  expiresAt: string;
  paymentMethod: 'chainpay' | 'fiat_gateway';
}

export interface TicketOrderSummary {
  id: string;
  eventId: string;
  tierId: string;
  quantity: number;
  amountFiat: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paymentUrl: string | null;
  transactionHash: string | null;
  expiresAt: string;
  paidAt: string | null;
  completedAt: string | null;
}

export interface TicketSummary {
  id: string;
  eventId: string;
  tierId: string;
  tierIndex: number;
  ownerWalletAddress: string;
  tokenId: number;
  contractAddress: string;
  status: string;
  mintedAt: string;
}

async function parseJson<T>(res: Response): Promise<{ ok: boolean; data?: T; error?: string; code?: string }> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    return { ok: false, error: json.error ?? json.detail ?? 'Request failed', code: json.code };
  }
  return { ok: true, data: json.data as T };
}

export async function verifySession(idToken: string, walletAddress: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, walletAddress }),
  });

  const parsed = await parseJson<AuthUser>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Session verification failed');
  }
  return parsed.data;
}

export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return null;
  const parsed = await parseJson<AuthUser>(res);
  return parsed.ok && parsed.data ? parsed.data : null;
}

export async function listEvents(): Promise<EventSummary[]> {
  const res = await fetch(`${API_URL}/api/events`, { next: { revalidate: 30 } });
  const parsed = await parseJson<EventSummary[]>(res);
  return parsed.data ?? [];
}

export async function getEvent(eventId: string): Promise<EventDetail | null> {
  const res = await fetch(`${API_URL}/api/events/${eventId}`, { cache: 'no-store' });
  const parsed = await parseJson<EventDetail>(res);
  return parsed.data ?? null;
}

export async function createCheckout(params: {
  tierId: string;
  quantity: number;
  paymentMethod: 'chainpay' | 'fiat_gateway';
  idempotencyKey: string;
}): Promise<CheckoutResponse> {
  const res = await fetch(`${API_URL}/api/tickets/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({
      tierId: params.tierId,
      quantity: params.quantity,
      paymentMethod: params.paymentMethod,
    }),
  });

  const parsed = await parseJson<CheckoutResponse>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Checkout failed');
  }
  return parsed.data;
}

export async function getOrder(orderId: string): Promise<TicketOrderSummary | null> {
  const res = await fetch(`${API_URL}/api/tickets/orders/${orderId}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const parsed = await parseJson<TicketOrderSummary>(res);
  return parsed.data ?? null;
}

export async function mintTickets(params: {
  tierId: string;
  quantity: number;
  idempotencyKey: string;
}): Promise<{ tickets: TicketSummary[]; transactionHash: string }> {
  const res = await fetch(`${API_URL}/api/tickets/mint`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
    },
    body: JSON.stringify({ tierId: params.tierId, quantity: params.quantity }),
  });

  const parsed = await parseJson<{ tickets: TicketSummary[]; transactionHash: string }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Mint failed');
  }
  return parsed.data;
}

export async function listMyTickets(): Promise<TicketSummary[]> {
  const res = await fetch(`${API_URL}/api/tickets`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<TicketSummary[]>(res);
  return parsed.data ?? [];
}
