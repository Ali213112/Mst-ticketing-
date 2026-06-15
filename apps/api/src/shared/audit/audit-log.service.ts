import { pool } from '../db/postgres.service.js';

export async function writeAuditLog(params: {
  action: string;
  entityType: string;
  entityId?: string;
  performedById?: string;
  performedByPlatformAdminId?: string;
  performedByWallet?: string;
  changes?: Record<string, unknown>;
  status?: 'success' | 'failed';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (
       action, entity_type, entity_id,
       performed_by_id, performed_by_platform_admin_id, performed_by_wallet,
       changes, status, error_message, ip_address, user_agent
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      params.action,
      params.entityType,
      params.entityId ?? null,
      params.performedById ?? null,
      params.performedByPlatformAdminId ?? null,
      params.performedByWallet ?? null,
      params.changes ? JSON.stringify(params.changes) : null,
      params.status ?? 'success',
      params.errorMessage ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  );
}

export async function listAuditLogs(params: {
  limit: number;
  offset: number;
}): Promise<{
  rows: Array<{
    id: string;
    timestamp: string;
    userId: string;
    action: string;
    ipAddress: string;
    details: string;
  }>;
  total: number;
}> {
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_logs`
  );

  const result = await pool.query<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    performed_by_id: string | null;
    performed_by_platform_admin_id: string | null;
    changes: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: Date;
  }>(
    `SELECT id, action, entity_type, entity_id, performed_by_id,
            performed_by_platform_admin_id, changes, ip_address, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [params.limit, params.offset]
  );

  return {
    total: Number(countResult.rows[0]?.count ?? 0),
    rows: result.rows.map((row) => ({
      id: row.id,
      timestamp: row.created_at.toISOString(),
      userId: row.performed_by_id ?? row.performed_by_platform_admin_id ?? 'system',
      action: `${row.entity_type}.${row.action}`,
      ipAddress: row.ip_address ?? '',
      details: row.changes ? JSON.stringify(row.changes) : '',
    })),
  };
}
