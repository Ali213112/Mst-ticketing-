import { pool } from '../db/postgres.service.js';

export async function isWalletBlacklisted(walletAddress: string): Promise<boolean> {
  const normalized = walletAddress.toLowerCase();
  const result = await pool.query<{ is_blacklisted: boolean }>(
    `SELECT is_blacklisted FROM wallets WHERE LOWER(wallet_address) = $1`,
    [normalized]
  );
  return result.rows[0]?.is_blacklisted ?? false;
}

export async function setWalletBlacklist(
  walletAddress: string,
  blacklist: boolean,
  adminId?: string
): Promise<void> {
  const normalized = walletAddress.toLowerCase();
  await pool.query(
    `UPDATE wallets SET is_blacklisted = $2, updated_at = NOW()
     WHERE LOWER(wallet_address) = $1`,
    [normalized, blacklist]
  );

  if (blacklist) {
    await logFraud({
      eventType: 'wallet_blacklisted',
      severity: 'high',
      walletAddress: normalized,
      details: { blacklistedBy: adminId },
    });
  }
}

export async function logFraud(params: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  walletAddress?: string;
  eventId?: string;
  ticketId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO fraud_logs (
       event_type, severity, user_id, wallet_address, event_id, ticket_id,
       ip_address, device_fingerprint, details
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      params.eventType,
      params.severity,
      params.userId ?? null,
      params.walletAddress?.toLowerCase() ?? null,
      params.eventId ?? null,
      params.ticketId ?? null,
      params.ipAddress ?? null,
      params.deviceFingerprint ?? null,
      params.details ? JSON.stringify(params.details) : null,
    ]
  );
}

export async function listFraudAlerts(params: {
  limit: number;
  offset: number;
}): Promise<
  Array<{
    id: string;
    ticketId: string;
    eventName: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
    walletAddress: string;
    blacklisted: boolean;
  }>
> {
  const result = await pool.query<{
    id: string;
    event_type: string;
    severity: string;
    wallet_address: string | null;
    ticket_id: string | null;
    created_at: Date;
    event_name: string | null;
    is_blacklisted: boolean | null;
  }>(
    `SELECT f.id, f.event_type, f.severity, f.wallet_address, f.ticket_id, f.created_at,
            e.name AS event_name,
            w.is_blacklisted
     FROM fraud_logs f
     LEFT JOIN events e ON e.id = f.event_id
     LEFT JOIN wallets w ON LOWER(w.wallet_address) = LOWER(f.wallet_address)
     WHERE f.resolved = FALSE
     ORDER BY
       CASE f.severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         ELSE 4
       END,
       f.created_at DESC
     LIMIT $1 OFFSET $2`,
    [params.limit, params.offset]
  );

  return result.rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id ?? '',
    eventName: row.event_name ?? 'Platform',
    severity: (row.severity === 'critical' ? 'high' : row.severity) as 'high' | 'medium' | 'low',
    message: row.event_type.replace(/_/g, ' '),
    timestamp: row.created_at.toISOString(),
    walletAddress: row.wallet_address ?? '',
    blacklisted: row.is_blacklisted ?? false,
  }));
}
