import { pool } from '../../shared/db/postgres.service.js';
import { parsePagination } from '../../shared/utils/pagination.js';
import { checkMstRpcConnection } from '../../shared/blockchain/mst.service.js';
import { env } from '../../config/env.js';

export async function listPlatformEvents(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM events WHERE deleted_at IS NULL`
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const result = await pool.query<{
    id: string;
    org_id: string;
    org_name: string;
    name: string;
    status: string;
    event_date: Date;
    city: string | null;
    total_tickets_sold: number;
  }>(
    `SELECT e.id, e.org_id, o.name AS org_name, e.name, e.status, e.event_date, e.city, e.total_tickets_sold
     FROM events e
     JOIN organisations o ON o.id = e.org_id
     WHERE e.deleted_at IS NULL
     ORDER BY e.event_date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    rows: result.rows.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      orgName: r.org_name,
      name: r.name,
      status: r.status,
      eventDate: r.event_date.toISOString(),
      city: r.city,
      totalTicketsSold: r.total_tickets_sold,
    })),
    meta: { page, limit, total },
  };
}

export async function listPlatformTickets(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const countResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM tickets`);
  const total = Number(countResult.rows[0]?.count ?? 0);

  const result = await pool.query<{
    id: string;
    event_name: string;
    org_name: string;
    tier_name: string;
    owner_wallet: string;
    status: string;
    created_at: Date;
  }>(
    `SELECT t.id, e.name AS event_name, o.name AS org_name, tt.name AS tier_name,
            t.owner_wallet_address AS owner_wallet, t.status, t.created_at
     FROM tickets t
     JOIN ticket_tiers tt ON tt.id = t.tier_id
     JOIN events e ON e.id = tt.event_id
     JOIN organisations o ON o.id = e.org_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    rows: result.rows.map((r) => ({
      id: r.id,
      eventName: r.event_name,
      orgName: r.org_name,
      tierName: r.tier_name,
      ownerWallet: r.owner_wallet,
      status: r.status,
      createdAt: r.created_at.toISOString(),
    })),
    meta: { page, limit, total },
  };
}

export async function listPlatformAdmins() {
  const result = await pool.query<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    status: string;
    last_login_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, email, first_name, last_name, status, last_login_at, created_at
     FROM platform_admins ORDER BY created_at DESC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    status: r.status,
    lastLoginAt: r.last_login_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function listPlatformRefunds() {
  const result = await pool.query<{
    id: string;
    event_id: string;
    event_name: string;
    org_name: string;
    user_id: string;
    refund_amount_wei: string;
    refund_reason: string | null;
    status: string;
    created_at: Date;
  }>(
    `SELECT r.id, r.event_id, e.name AS event_name, o.name AS org_name,
            r.user_id, r.refund_amount_wei::text, r.refund_reason, r.status, r.created_at
     FROM refunds r
     JOIN events e ON e.id = r.event_id
     JOIN organisations o ON o.id = r.org_id
     ORDER BY r.created_at DESC
     LIMIT 200`
  );
  return result.rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    eventName: r.event_name,
    orgName: r.org_name,
    userId: r.user_id,
    refundAmountWei: r.refund_amount_wei,
    refundReason: r.refund_reason,
    status: r.status,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function reviewPlatformRefund(refundId: string, action: 'approve' | 'reject', reviewerId: string) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const result = await pool.query(
    `UPDATE refunds SET status = $1, reviewed_by_id = $2, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $3 AND status = 'pending'`,
    [status, reviewerId, refundId]
  );
  if ((result.rowCount ?? 0) === 0) return { error: 'Refund not found or already reviewed', status: 404 as const };
  return { success: true };
}

export async function getBlockchainHealth() {
  const rpcOk = await checkMstRpcConnection();
  return {
    rpcHealth: rpcOk ? 'operational' : 'degraded',
    chainId: env.MST_CHAIN_ID,
    rpcUrl: env.MST_RPC_URL,
    deployerConfigured: Boolean(env.MST_DEPLOYER_PRIVATE_KEY),
  };
}
