import { pool } from '../../shared/db/postgres.service.js';
import { checkDatabaseConnection } from '../../shared/db/postgres.service.js';
import { checkRedisConnection } from '../../shared/cache/redis.service.js';
import { checkMstRpcConnection } from '../../shared/blockchain/mst.service.js';

export async function getPlatformKPIs() {
  const [tickets, revenue, commission, tenants, dbOk, redisOk, mst] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tickets WHERE status NOT IN ('cancelled')`
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(total_revenue_wei), 0)::text AS total FROM events WHERE deleted_at IS NULL`
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(
         e.total_revenue_wei * o.platform_commission_bps / 10000
       ), 0)::text AS total
       FROM events e
       JOIN organisations o ON o.id = e.org_id
       WHERE e.deleted_at IS NULL`
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM organisations WHERE status = 'active' AND deleted_at IS NULL`
    ),
    checkDatabaseConnection().catch(() => false),
    checkRedisConnection().catch(() => false),
    checkMstRpcConnection(),
  ]);

  return {
    totalTicketsSold: Number(tickets.rows[0]?.count ?? 0),
    grossRevenueWei: revenue.rows[0]?.total ?? '0',
    commissionRevenueWei: commission.rows[0]?.total ?? '0',
    activeTenants: Number(tenants.rows[0]?.count ?? 0),
    rpcHealth: mst.ok ? 'healthy' : 'degraded',
    dbHealth: dbOk && redisOk ? 'healthy' : 'degraded',
  };
}
