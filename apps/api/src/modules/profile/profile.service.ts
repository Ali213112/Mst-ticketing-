import { randomBytes } from 'crypto';
import { z } from 'zod';
import { pool } from '../../shared/db/postgres.service.js';

const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
});

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await pool.query<{ referral_code: string | null }>(
    `SELECT referral_code FROM users WHERE id = $1`,
    [userId]
  );
  if (existing.rows[0]?.referral_code) {
    return existing.rows[0].referral_code;
  }

  const code = generateReferralCode();
  await pool.query(`UPDATE users SET referral_code = $1, updated_at = NOW() WHERE id = $2`, [
    code,
    userId,
  ]);
  return code;
}

export async function listUserRewards(userId: string) {
  const result = await pool.query<{
    id: string;
    reward_type: string;
    reward_metadata: Record<string, unknown> | null;
    token_id: number | null;
    contract_address: string | null;
    issued_at: Date;
  }>(
    `SELECT id, reward_type, reward_metadata, token_id, contract_address, issued_at
     FROM loyalty_rewards WHERE user_id = $1 ORDER BY issued_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    rewardType: row.reward_type,
    rewardMetadata: row.reward_metadata,
    tokenId: row.token_id,
    contractAddress: row.contract_address,
    issuedAt: row.issued_at.toISOString(),
  }));
}

export async function updateUserProfile(userId: string, body: unknown) {
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Invalid profile data', status: 400 as const };
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.firstName !== undefined) {
    fields.push(`first_name = $${idx++}`);
    values.push(parsed.data.firstName.trim() || null);
  }
  if (parsed.data.lastName !== undefined) {
    fields.push(`last_name = $${idx++}`);
    values.push(parsed.data.lastName.trim() || null);
  }
  if (parsed.data.phoneNumber !== undefined) {
    fields.push(`phone_number = $${idx++}`);
    values.push(parsed.data.phoneNumber.trim() || null);
  }

  if (fields.length === 0) {
    return { error: 'No fields to update', status: 400 as const };
  }

  values.push(userId);
  const result = await pool.query<{
    id: string;
    email: string;
    wallet_address: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  }>(
    `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING id, email, wallet_address, first_name, last_name, phone_number`,
    values
  );

  const row = result.rows[0];
  if (!row) {
    return { error: 'User not found', status: 404 as const };
  }

  return {
    profile: {
      id: row.id,
      email: row.email,
      walletAddress: row.wallet_address,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
    },
    status: 200 as const,
  };
}

export async function getReferralStats(userId: string) {
  const code = await ensureReferralCode(userId);

  const referrals = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users
     WHERE referred_by_id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const rewards = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM loyalty_rewards WHERE user_id = $1`,
    [userId]
  );

  return {
    referralCode: code,
    referralsCount: Number(referrals.rows[0]?.count ?? 0),
    rewardsCount: Number(rewards.rows[0]?.count ?? 0),
  };
}
