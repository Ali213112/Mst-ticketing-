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
  try {
    const text = await res.text();
    const json = JSON.parse(text);
    if (!res.ok || !json.success) {
      return { ok: false, error: json.error ?? json.detail ?? 'Request failed', code: json.code };
    }
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, error: `Unexpected response (HTTP ${res.status})` };
  }
}

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const mergedInit = {
    ...init,
    credentials: init?.credentials ?? 'include',
  };

  const response = await window.fetch(input, mergedInit);

  if (response.status === 401) {
    const urlString = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    if (urlString.includes('/api/auth/refresh')) {
      return response;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await window.fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          onRefreshed(true);
          isRefreshing = false;
          return window.fetch(input, mergedInit);
        } else {
          onRefreshed(false);
          isRefreshing = false;
        }
      } catch {
        onRefreshed(false);
        isRefreshing = false;
      }
    } else {
      const refreshSuccess = await new Promise<boolean>((resolve) => {
        subscribeTokenRefresh((success) => resolve(success));
      });
      if (refreshSuccess) {
        return window.fetch(input, mergedInit);
      }
    }
  }

  return response;
}

const fetch = fetchWithAuth;

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
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    const parsed = await parseJson<AuthUser>(res);
    return parsed.ok && parsed.data ? parsed.data : null;
  } catch {
    // Network error (API down / connection refused) — don't crash
    return null;
  }
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

export async function getTicketQr(ticketId: string): Promise<{ payload: string; expiresIn: number }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/qr`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<{ payload: string; expiresIn: number }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to get QR payload');
  }
  return parsed.data;
}

export async function transferTicket(ticketId: string, recipient: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/transfer`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmailOrWallet: recipient }),
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Transfer failed');
  }
}

export async function listTicketForResale(ticketId: string, askPriceWei: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resell`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ askPriceWei }),
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Resale listing failed');
  }
}

export async function cancelResaleListing(ticketId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resell`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Resale cancellation failed');
  }
}

export interface ResaleListing {
  id: string;
  ticketId: string;
  eventId: string;
  tierId: string;
  sellerUserId: string;
  sellerWallet: string;
  facePriceWei: string;
  askPriceWei: string;
  maxPriceWei: string;
  status: string;
  createdAt: string;
}

export async function listResaleMarketplace(): Promise<ResaleListing[]> {
  const res = await fetch(`${API_URL}/api/marketplace`, { cache: 'no-store' });
  const parsed = await parseJson<ResaleListing[]>(res);
  return parsed.data ?? [];
}

export async function buyResaleListing(params: {
  listingId: string;
  idempotencyKey: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/marketplace/${params.listingId}/buy`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
    },
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Purchase failed');
  }
}

export interface LoyaltyReward {
  id: string;
  rewardType: string;
  rewardMetadata: {
    badge_name?: string;
    event_date?: string;
    tier?: string;
    discount_percent?: number;
  } | null;
  tokenId: number | null;
  contractAddress: string | null;
  issuedAt: string;
}

export interface ReferralStats {
  referralCode: string;
  referralsCount: number;
  rewardsCount: number;
}

export async function listMyRewards(): Promise<LoyaltyReward[]> {
  const res = await fetch(`${API_URL}/api/profile/rewards`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<LoyaltyReward[]>(res);
  return parsed.data ?? [];
}

export async function getReferralStats(): Promise<ReferralStats | null> {
  const res = await fetch(`${API_URL}/api/profile/referral`, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return null;
  const parsed = await parseJson<ReferralStats>(res);
  return parsed.data ?? null;
}

export interface VolunteerEvent {
  id: string;
  name: string;
  eventDate: string;
  city: string | null;
  permittedZones: string[];
}

export interface VerifyCheckinResult {
  success: boolean;
  reason?: string;
  ticket?: {
    id: string;
    tokenId: number;
    ownerWalletAddress: string;
    zone: string;
  };
}

export interface CheckinStats {
  totalCheckedIn: number;
  totalTicketsSold: number;
  remainingCount: number;
}

export interface CheckinHistoryItem {
  id: string;
  ticketId: string;
  tokenId: number;
  zoneAccessed: string;
  verificationSuccess: boolean;
  failureReason: string | null;
  createdAt: string;
}

export async function getVolunteerEvents(): Promise<VolunteerEvent[]> {
  const res = await fetch(`${API_URL}/api/volunteer/events`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<VolunteerEvent[]>(res);
  return parsed.data ?? [];
}

export async function verifyCheckin(qrPayload: string, deviceId: string): Promise<VerifyCheckinResult> {
  const res = await fetch(`${API_URL}/api/volunteer/checkin/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrPayload, deviceId }),
  });
  const parsed = await parseJson<VerifyCheckinResult>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Verification failed');
  }
  return parsed.data;
}

export async function getCheckinStats(eventId: string): Promise<CheckinStats> {
  const res = await fetch(`${API_URL}/api/volunteer/checkin/stats?eventId=${eventId}`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<CheckinStats>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to fetch stats');
  }
  return parsed.data;
}

export async function getCheckinHistory(eventId: string): Promise<CheckinHistoryItem[]> {
  const res = await fetch(`${API_URL}/api/volunteer/checkin/history?eventId=${eventId}`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<CheckinHistoryItem[]>(res);
  return parsed.data ?? [];
}

export interface AdminOrgDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  subscriptionPlan: string;
  status: string;
  platformCommissionBps: number;
}

export interface AdminEventSummary {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  contractAddress: string | null;
  totalTicketsSold: number;
  totalCheckedIn: number;
  totalRevenueWei: string;
}

export interface AdminMember {
  id: string;
  role: number;
  status: string;
  assignedAt: string;
  email: string;
  saralUserId: string;
}

export interface AdminEarnings {
  grossRevenueWei: string;
  commissionWei: string;
  refundsWei: string;
  netPayoutWei: string;
}

export async function getAdminOrganisation(): Promise<AdminOrgDetails> {
  const res = await fetch(`${API_URL}/api/admin/organisation`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<AdminOrgDetails>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to fetch organisation details');
  }
  return parsed.data;
}

export async function getAdminEvents(): Promise<AdminEventSummary[]> {
  const res = await fetch(`${API_URL}/api/admin/events`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<AdminEventSummary[]>(res);
  return parsed.data ?? [];
}

export async function createAdminEvent(body: {
  name: string;
  description: string;
  eventDate: string;
  venueName: string;
  city: string;
  category: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/admin/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await parseJson<{ id: string }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to create event');
  }
  return parsed.data;
}

export async function updateEventStatus(eventId: string, action: 'deploy' | 'publish' | 'go-live' | 'end' | 'cancel'): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/events/${eventId}/${action}`, {
    method: 'POST',
    credentials: 'include',
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? `Failed to perform action: ${action}`);
  }
}

export async function getAdminMembers(): Promise<AdminMember[]> {
  const res = await fetch(`${API_URL}/api/admin/members`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<AdminMember[]>(res);
  return parsed.data ?? [];
}

export async function inviteAdminMember(body: {
  email: string;
  role: number;
  eventId?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/members/invite`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Failed to send invite');
  }
}

export async function getAdminEarnings(): Promise<AdminEarnings> {
  const res = await fetch(`${API_URL}/api/admin/finance/earnings`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<AdminEarnings>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to fetch earnings');
  }
  return parsed.data;
}

export interface PlatformKPIs {
  totalTicketsSold: number;
  grossRevenueWei: string;
  commissionRevenueWei: string;
  activeTenants: number;
  rpcHealth: string;
  dbHealth: string;
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  status: string;
  verificationStatus: string;
  platformCommissionBps: number;
  country: string | null;
  city: string | null;
  createdAt: string;
}

export interface PlatformSettlement {
  id: string;
  eventId: string;
  eventName: string;
  organisationName: string;
  grossRevenueWei: string;
  commissionWei: string;
  netPayoutWei: string;
  status: 'pending' | 'completed';
}

export interface FraudAlert {
  id: string;
  ticketId: string;
  eventName: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  walletAddress: string;
  blacklisted: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  ipAddress: string;
  details: string;
}

export async function getPlatformKPIs(): Promise<PlatformKPIs> {
  const res = await fetch(`${API_URL}/api/platform/kpis`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<PlatformKPIs>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to fetch platform KPIs');
  }
  return parsed.data;
}

export async function getPlatformTenants(): Promise<PlatformTenant[]> {
  const res = await fetch(`${API_URL}/api/platform/organisations`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<PlatformTenant[]>(res);
  // The list endpoint returns OrganisationSummary which lacks platformCommissionBps.
  // We add a default so the UI doesn't break.
  const rows = parsed.data ?? [];
  return rows.map(r => ({ ...r, platformCommissionBps: r.platformCommissionBps ?? 200 }));
}

export async function updateTenantKyc(tenantId: string, status: 'verified' | 'suspended' | 'pending'): Promise<void> {
  const action = status === 'verified' ? 'approve' : 'reject';
  const res = await fetch(`${API_URL}/api/platform/organisations/${tenantId}/verify`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Failed to update tenant KYC');
  }
}

export async function updateTenantCommission(tenantId: string, bps: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/platform/organisations/${tenantId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platformCommissionBps: bps })
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Failed to update commission rate');
  }
}

export async function getPlatformSettlements(): Promise<PlatformSettlement[]> {
  const res = await fetch(`${API_URL}/api/platform/settlements`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<PlatformSettlement[]>(res);
  return parsed.data ?? [];
}

export async function approvePlatformSettlement(settlementId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/platform/settlements/${settlementId}/approve`, {
    method: 'POST',
    credentials: 'include'
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Failed to approve payout');
  }
}

export async function getPlatformFraudAlerts(): Promise<FraudAlert[]> {
  const res = await fetch(`${API_URL}/api/platform/fraud`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<FraudAlert[]>(res);
  return parsed.data ?? [];
}

export async function toggleWalletBlacklist(walletAddress: string, blacklist: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/platform/fraud/blacklist`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, blacklist })
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Failed to update blacklist status');
  }
}

export async function getPlatformAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${API_URL}/api/platform/audit`, { credentials: 'include', cache: 'no-store' });
  const parsed = await parseJson<AuditLog[]>(res);
  return parsed.data ?? [];
}

export async function createPlatformOrganisation(body: {
  name: string;
  slug?: string;
  description?: string;
  superAdminEmail: string;
  country?: string;
  city?: string;
  subscriptionPlan?: 'starter' | 'growth' | 'enterprise';
}): Promise<PlatformTenant> {
  const res = await fetch(`${API_URL}/api/platform/organisations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await parseJson<PlatformTenant>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(parsed.error ?? 'Failed to create organisation');
  }
  return parsed.data;
}

export async function logoutSession(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  const parsed = await parseJson<void>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Logout failed');
  }
}







