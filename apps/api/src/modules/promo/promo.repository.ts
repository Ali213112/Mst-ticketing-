import { pool } from '../../shared/db/postgres.service.js';

export interface PromoRow {
  id: string;
  org_id: string;
  event_id: string | null;
  tier_id: string | null;
  code: string;
  discount_type: string;
  discount_value: string;
  max_uses: number | null;
  uses_remaining: number | null;
  max_per_user: number;
  valid_from: Date | null;
  valid_until: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PromoCodeSummary {
  id: string;
  orgId: string;
  eventId: string | null;
  tierId: string | null;
  code: string;
  discountType: 'percentage' | 'fixed_wei';
  discountValue: string;
  maxUses: number | null;
  usesRemaining: number | null;
  maxPerUser: number;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const SELECT = `
  id, org_id, event_id, tier_id, code, discount_type, discount_value,
  max_uses, uses_remaining, max_per_user, valid_from, valid_until, status, created_at, updated_at
`;

function mapPromo(row: PromoRow): PromoCodeSummary {
  return {
    id: row.id,
    orgId: row.org_id,
    eventId: row.event_id,
    tierId: row.tier_id,
    code: row.code,
    discountType: row.discount_type as PromoCodeSummary['discountType'],
    discountValue: row.discount_value,
    maxUses: row.max_uses,
    usesRemaining: row.uses_remaining,
    maxPerUser: row.max_per_user,
    validFrom: row.valid_from?.toISOString() ?? null,
    validUntil: row.valid_until?.toISOString() ?? null,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listPromoCodesByOrg(orgId: string): Promise<PromoCodeSummary[]> {
  const result = await pool.query<PromoRow>(
    `SELECT ${SELECT} FROM promo_codes WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows.map(mapPromo);
}

export async function findPromoById(orgId: string, promoId: string): Promise<PromoCodeSummary | null> {
  const result = await pool.query<PromoRow>(
    `SELECT ${SELECT} FROM promo_codes WHERE id = $1 AND org_id = $2`,
    [promoId, orgId]
  );
  const row = result.rows[0];
  return row ? mapPromo(row) : null;
}

export async function createPromoCode(
  orgId: string,
  params: {
    code: string;
    discountType: 'percentage' | 'fixed_wei';
    discountValue: string;
    eventId?: string;
    tierId?: string;
    maxUses?: number;
    maxPerUser?: number;
    validFrom?: string;
    validUntil?: string;
  }
): Promise<PromoCodeSummary> {
  const result = await pool.query<PromoRow>(
    `INSERT INTO promo_codes (
       org_id, event_id, tier_id, code, discount_type, discount_value,
       max_uses, uses_remaining, max_per_user, valid_from, valid_until
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING ${SELECT}`,
    [
      orgId,
      params.eventId ?? null,
      params.tierId ?? null,
      params.code.toUpperCase(),
      params.discountType,
      params.discountValue,
      params.maxUses ?? null,
      params.maxUses ?? null,
      params.maxPerUser ?? 1,
      params.validFrom ?? null,
      params.validUntil ?? null,
    ]
  );
  return mapPromo(result.rows[0]!);
}

export async function updatePromoCode(
  orgId: string,
  promoId: string,
  fields: Record<string, unknown>
): Promise<PromoCodeSummary | null> {
  const allowed = [
    'event_id',
    'tier_id',
    'discount_type',
    'discount_value',
    'max_uses',
    'uses_remaining',
    'max_per_user',
    'valid_from',
    'valid_until',
    'status',
  ] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return findPromoById(orgId, promoId);

  values.push(promoId, orgId);
  const result = await pool.query<PromoRow>(
    `UPDATE promo_codes SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND org_id = $${values.length}
     RETURNING ${SELECT}`,
    values
  );
  const row = result.rows[0];
  return row ? mapPromo(row) : null;
}

export async function deletePromoCode(orgId: string, promoId: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM promo_codes WHERE id = $1 AND org_id = $2`, [
    promoId,
    orgId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function validatePromoCode(
  code: string,
  tierId: string,
  userId: string
): Promise<{ valid: boolean; discountWei: string; reason?: string }> {
  const result = await pool.query<PromoRow & { tier_event_id: string; price_wei: string }>(
    `SELECT p.*, t.event_id AS tier_event_id, t.price_wei::text
     FROM promo_codes p
     JOIN ticket_tiers t ON t.id = $2
     WHERE p.code = $1 AND p.status = 'active'
       AND (p.event_id IS NULL OR p.event_id = t.event_id)
       AND (p.tier_id IS NULL OR p.tier_id = t.id)
       AND (p.valid_from IS NULL OR p.valid_from <= NOW())
       AND (p.valid_until IS NULL OR p.valid_until >= NOW())`,
    [code.toUpperCase(), tierId]
  );
  const promo = result.rows[0];
  if (!promo) return { valid: false, discountWei: '0', reason: 'INVALID_CODE' };

  if (promo.uses_remaining !== null && promo.uses_remaining <= 0) {
    return { valid: false, discountWei: '0', reason: 'CODE_EXHAUSTED' };
  }

  const userUses = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM tickets WHERE promo_code_used = $1 AND owner_user_id = $2`,
    [promo.code, userId]
  );
  if (parseInt(userUses.rows[0]?.count ?? '0', 10) >= promo.max_per_user) {
    return { valid: false, discountWei: '0', reason: 'MAX_USES_REACHED' };
  }

  const tierPrice = BigInt(promo.price_wei);
  let discountWei: bigint;
  if (promo.discount_type === 'percentage') {
    discountWei = (tierPrice * BigInt(promo.discount_value)) / 10000n;
  } else {
    discountWei = BigInt(promo.discount_value);
  }

  return { valid: true, discountWei: discountWei.toString() };
}
