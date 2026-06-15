import { pool } from '../../shared/db/postgres.service.js';
import { writeAuditLog } from '../../shared/audit/audit-log.service.js';

export async function listSettlements() {
  const result = await pool.query<{
    id: string;
    event_id: string | null;
    event_name: string | null;
    org_name: string;
    gross_revenue_wei: string;
    platform_commission_wei: string;
    net_payout_wei: string;
    status: string;
  }>(
    `SELECT s.id, s.event_id, e.name AS event_name, o.name AS org_name,
            s.gross_revenue_wei::text, s.platform_commission_wei::text,
            s.net_payout_wei::text, s.status
     FROM settlements s
     JOIN organisations o ON o.id = s.org_id
     LEFT JOIN events e ON e.id = s.event_id
     ORDER BY s.created_at DESC
     LIMIT 100`
  );

  return result.rows.map((row) => ({
    id: row.id,
    eventId: row.event_id ?? '',
    eventName: row.event_name ?? 'Org-wide',
    organisationName: row.org_name,
    grossRevenueWei: row.gross_revenue_wei,
    commissionWei: row.platform_commission_wei,
    netPayoutWei: row.net_payout_wei,
    status: row.status as 'pending' | 'completed',
  }));
}

export async function approveSettlement(
  settlementId: string,
  adminId: string
): Promise<{ success: true } | { error: string; status: number }> {
  const result = await pool.query<{ id: string; status: string }>(
    `SELECT id, status FROM settlements WHERE id = $1`,
    [settlementId]
  );
  const row = result.rows[0];
  if (!row) return { error: 'Settlement not found', status: 404 };
  if (row.status === 'completed') return { error: 'Already completed', status: 409 };

  await pool.query(
    `UPDATE settlements SET
       status = 'completed',
       settled_at = NOW(),
       settled_by_id = $1,
       updated_at = NOW()
     WHERE id = $2`,
    [adminId, settlementId]
  );

  await writeAuditLog({
    action: 'approved',
    entityType: 'settlement',
    entityId: settlementId,
    performedByPlatformAdminId: adminId,
  });

  return { success: true };
}

export async function createSettlementForEndedEvent(eventId: string): Promise<void> {
  const eventResult = await pool.query<{
    org_id: string;
    total_revenue_wei: string;
    platform_commission_bps: number;
    status: string;
  }>(
    `SELECT e.org_id, e.total_revenue_wei::text, o.platform_commission_bps, e.status
     FROM events e
     JOIN organisations o ON o.id = e.org_id
     WHERE e.id = $1`,
    [eventId]
  );
  const event = eventResult.rows[0];
  if (!event || event.status !== 'ended') return;

  const gross = BigInt(event.total_revenue_wei);
  const commission = (gross * BigInt(event.platform_commission_bps)) / 10000n;
  const net = gross - commission;

  await pool.query(
    `INSERT INTO settlements (
       org_id, event_id, gross_revenue_wei, platform_commission_wei,
       net_payout_wei, period_start, period_end, status
     ) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '30 days', NOW(), 'pending')`,
    [event.org_id, eventId, gross.toString(), commission.toString(), net.toString()]
  );
}
