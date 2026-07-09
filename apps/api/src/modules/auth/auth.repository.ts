import type { PoolClient } from 'pg';
import { pool } from '../../shared/db/postgres.service.js';
import { ROLES, type Role } from '@ticketchain/shared';

export interface DbUser {
  id: string;
  web3auth_sub: string | null;
  email: string;
  wallet_address: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  bio: string | null;
  profile_image: string | null;
  base_role: number;
}

export interface OrgMembership {
  org_id: string;
  role: number;
}

export async function findUserByWeb3AuthSub(sub: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    `SELECT id, web3auth_sub, email, wallet_address, first_name, last_name, phone_number, bio, profile_image, base_role
     FROM users WHERE web3auth_sub = $1 AND deleted_at IS NULL`,
    [sub]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    `SELECT id, web3auth_sub, email, wallet_address, first_name, last_name, phone_number, bio, profile_image, base_role
     FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserByWallet(walletAddress: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    `SELECT id, web3auth_sub, email, wallet_address, first_name, last_name, phone_number, bio, profile_image, base_role
     FROM users WHERE LOWER(wallet_address) = LOWER($1) AND deleted_at IS NULL`,
    [walletAddress]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(userId: string): Promise<DbUser | null> {
  const result = await pool.query<DbUser>(
    `SELECT id, web3auth_sub, email, wallet_address, first_name, last_name, phone_number, bio, profile_image, base_role
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function getOrgMemberships(userId: string): Promise<OrgMembership[]> {
  const result = await pool.query<OrgMembership>(
    `SELECT org_id, role FROM org_members
     WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL`,
    [userId]
  );
  return result.rows;
}

export async function createWeb3AuthUser(
  client: PoolClient,
  params: {
    sub: string;
    email: string;
    walletAddress: string;
    firstName?: string;
    lastName?: string;
  }
): Promise<DbUser> {
  const result = await client.query<DbUser>(
    `INSERT INTO users (web3auth_sub, email, wallet_address, first_name, last_name, base_role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, web3auth_sub, email, wallet_address, first_name, last_name, phone_number, bio, profile_image, base_role`,
    [
      params.sub,
      params.email,
      params.walletAddress.toLowerCase(),
      params.firstName ?? null,
      params.lastName ?? null,
      ROLES.CONSUMER,
    ]
  );

  const user = result.rows[0];
  await client.query(
    `INSERT INTO wallets (user_id, wallet_address) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET wallet_address = EXCLUDED.wallet_address, updated_at = NOW()`,
    [user.id, params.walletAddress.toLowerCase()]
  );

  return user;
}

export async function updateUserWallet(
  client: PoolClient,
  userId: string,
  walletAddress: string
): Promise<void> {
  await client.query(
    `UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE id = $2`,
    [walletAddress.toLowerCase(), userId]
  );
  await client.query(
    `UPDATE wallets SET wallet_address = $1, updated_at = NOW() WHERE user_id = $2`,
    [walletAddress.toLowerCase(), userId]
  );
}

export function resolveSessionRole(memberships: OrgMembership[]): Role {
  if (memberships.length === 0) return ROLES.CONSUMER;
  const highest = Math.max(...memberships.map((m) => m.role));
  return highest as Role;
}

export function resolveAdminOrgIds(memberships: OrgMembership[]): string[] {
  return memberships.filter((m) => m.role >= ROLES.ADMIN).map((m) => m.org_id);
}
