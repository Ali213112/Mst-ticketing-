import { pool } from '../../shared/db/postgres.service.js';

export async function getOrgEarnings(orgId: string) {
  const result = await pool.query<{
    gross: string;
    commission: string;
    refunds: string;
    net: string;
  }>(
    `SELECT
       COALESCE(SUM(e.total_revenue_wei), 0)::text AS gross,
       COALESCE(SUM(e.total_revenue_wei * o.platform_commission_bps / 10000), 0)::text AS commission,
       COALESCE(SUM(s.refunds_issued_wei), 0)::text AS refunds,
       COALESCE(SUM(e.total_revenue_wei), 0)::text
         - COALESCE(SUM(e.total_revenue_wei * o.platform_commission_bps / 10000), 0)::numeric
         - COALESCE(SUM(s.refunds_issued_wei), 0)::numeric AS net
     FROM organisations o
     LEFT JOIN events e ON e.org_id = o.id AND e.deleted_at IS NULL
     LEFT JOIN settlements s ON s.org_id = o.id
     WHERE o.id = $1
     GROUP BY o.id`,
    [orgId]
  );

  const row = result.rows[0];
  return {
    grossRevenueWei: row?.gross ?? '0',
    commissionWei: row?.commission ?? '0',
    refundsWei: row?.refunds ?? '0',
    netPayoutWei: row?.net ?? '0',
  };
}
