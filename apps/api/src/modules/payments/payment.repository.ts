import type { PoolClient } from 'pg';
import { pool } from '../../shared/db/postgres.service.js';
import type { TicketOrderSummary } from '@ticketchain/shared';

interface OrderRow {
  id: string;
  user_id: string;
  event_id: string;
  tier_id: string;
  quantity: number;
  amount_fiat: string;
  currency: string;
  payment_provider: string;
  payment_method: string;
  status: string;
  idempotency_key: string;
  provider_token: string | null;
  provider_success_token: string | null;
  payment_url: string | null;
  transaction_hash: string | null;
  inventory_reserved: boolean;
  paid_at: Date | null;
  completed_at: Date | null;
  expires_at: Date;
  failure_reason: string | null;
  created_at: Date;
}

const ORDER_SELECT = `
  id, user_id, event_id, tier_id, quantity, amount_fiat, currency,
  payment_provider, payment_method, status, idempotency_key,
  provider_token, provider_success_token, payment_url, transaction_hash,
  inventory_reserved, paid_at, completed_at, expires_at, failure_reason, created_at
`;

function mapOrder(row: OrderRow): TicketOrderSummary {
  return {
    id: row.id,
    eventId: row.event_id,
    tierId: row.tier_id,
    quantity: row.quantity,
    amountFiat: Number(row.amount_fiat),
    currency: row.currency,
    paymentProvider: row.payment_provider as TicketOrderSummary['paymentProvider'],
    paymentMethod: row.payment_method as TicketOrderSummary['paymentMethod'],
    status: row.status as TicketOrderSummary['status'],
    paymentUrl: row.payment_url,
    transactionHash: row.transaction_hash,
    expiresAt: row.expires_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createTicketOrder(params: {
  userId: string;
  eventId: string;
  tierId: string;
  quantity: number;
  amountFiat: number;
  currency: string;
  paymentProvider: string;
  paymentMethod: string;
  idempotencyKey: string;
  expiresAt: Date;
  inventoryReserved: boolean;
  providerToken?: string;
  providerSuccessToken?: string;
  paymentUrl?: string;
  metadata?: unknown;
}): Promise<TicketOrderSummary & { idempotencyKey: string; userId: string }> {
  const result = await pool.query<OrderRow>(
    `INSERT INTO ticket_orders (
       user_id, event_id, tier_id, quantity, amount_fiat, currency,
       payment_provider, payment_method, idempotency_key, expires_at,
       inventory_reserved, provider_token, provider_success_token, payment_url, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING ${ORDER_SELECT}`,
    [
      params.userId,
      params.eventId,
      params.tierId,
      params.quantity,
      params.amountFiat,
      params.currency,
      params.paymentProvider,
      params.paymentMethod,
      params.idempotencyKey,
      params.expiresAt,
      params.inventoryReserved,
      params.providerToken ?? null,
      params.providerSuccessToken ?? null,
      params.paymentUrl ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ]
  );
  const row = result.rows[0];
  return { ...mapOrder(row), idempotencyKey: row.idempotency_key, userId: row.user_id };
}

export async function findOrderById(orderId: string): Promise<
  (TicketOrderSummary & {
    idempotencyKey: string;
    userId: string;
    providerSuccessToken: string | null;
    inventoryReserved: boolean;
    quantity: number;
  }) | null
> {
  const result = await pool.query<OrderRow>(
    `SELECT ${ORDER_SELECT} FROM ticket_orders WHERE id = $1`,
    [orderId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...mapOrder(row),
    idempotencyKey: row.idempotency_key,
    userId: row.user_id,
    providerSuccessToken: row.provider_success_token,
    inventoryReserved: row.inventory_reserved,
    quantity: row.quantity,
  };
}

export async function findOrderByIdForUser(
  orderId: string,
  userId: string
): Promise<TicketOrderSummary | null> {
  const result = await pool.query<OrderRow>(
    `SELECT ${ORDER_SELECT} FROM ticket_orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

export async function updateOrderChainpayDetails(
  orderId: string,
  params: {
    providerToken: string;
    providerSuccessToken: string;
    paymentUrl: string;
  }
): Promise<void> {
  await pool.query(
    `UPDATE ticket_orders SET
       provider_token = $1,
       provider_success_token = $2,
       payment_url = $3,
       updated_at = NOW()
     WHERE id = $4`,
    [params.providerToken, params.providerSuccessToken, params.paymentUrl, orderId]
  );
}

export async function markOrderPaid(orderId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE ticket_orders SET
       status = 'paid',
       paid_at = NOW(),
       updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [orderId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markOrderCompleted(
  orderId: string,
  transactionHash: string
): Promise<void> {
  await pool.query(
    `UPDATE ticket_orders SET
       status = 'completed',
       transaction_hash = $1,
       completed_at = NOW(),
       updated_at = NOW()
     WHERE id = $2`,
    [transactionHash, orderId]
  );
}

export async function markOrderFailed(orderId: string, reason: string): Promise<void> {
  await pool.query(
    `UPDATE ticket_orders SET
       status = 'failed',
       failure_reason = $1,
       updated_at = NOW()
     WHERE id = $2`,
    [reason, orderId]
  );
}

export async function markOrderExpired(orderId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE ticket_orders SET status = 'expired', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [orderId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getTierPricing(tierId: string): Promise<{
  id: string;
  eventId: string;
  tierIndex: number;
  name: string;
  priceWei: string;
  priceDisplay: number | null;
  totalSupply: number;
  minted: number;
  maxPerWallet: number;
  status: string;
} | null> {
  const result = await pool.query<{
    id: string;
    event_id: string;
    tier_index: number;
    name: string;
    price_wei: string;
    price_display: string | null;
    total_supply: number;
    minted: number;
    max_per_wallet: number;
    status: string;
  }>(
    `SELECT id, event_id, tier_index, name, price_wei, price_display,
            total_supply, minted, max_per_wallet, status
     FROM ticket_tiers WHERE id = $1 AND deleted_at IS NULL`,
    [tierId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    tierIndex: row.tier_index,
    name: row.name,
    priceWei: row.price_wei,
    priceDisplay: row.price_display ? Number(row.price_display) : null,
    totalSupply: row.total_supply,
    minted: row.minted,
    maxPerWallet: row.max_per_wallet,
    status: row.status,
  };
}

export async function findOrderByIdempotencyKey(key: string): Promise<{ id: string; status: string } | null> {
  const result = await pool.query<{ id: string; status: string }>(
    `SELECT id, status FROM ticket_orders WHERE idempotency_key = $1`,
    [key]
  );
  return result.rows[0] ?? null;
}

export async function claimOrderForFulfillment(
  client: PoolClient,
  orderId: string
): Promise<OrderRow | null> {
  const result = await client.query<OrderRow>(
    `UPDATE ticket_orders SET status = 'minting', updated_at = NOW()
     WHERE id = $1 AND status IN ('paid', 'pending')
     RETURNING ${ORDER_SELECT}`,
    [orderId]
  );
  return result.rows[0] ?? null;
}
