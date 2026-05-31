import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../shared/db/postgres.service.js';
import { ROLES } from '@ticketchain/shared';

const PLATFORM_ADMIN_EMAIL = 'admin@ticketchain.com';
const PLATFORM_ADMIN_PASSWORD = 'ChangeMe123!';

const SUPER_ADMIN_EMAIL = 'founder@demo-org.com';
const SUPER_ADMIN_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingAdmin = await client.query(
      `SELECT id FROM platform_admins WHERE email = $1`,
      [PLATFORM_ADMIN_EMAIL]
    );

    if (existingAdmin.rowCount === 0) {
      const passwordHash = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 12);
      await client.query(
        `INSERT INTO platform_admins (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)`,
        [PLATFORM_ADMIN_EMAIL, passwordHash, 'Platform', 'Admin']
      );
      console.log(`Created platform admin: ${PLATFORM_ADMIN_EMAIL}`);
    } else {
      console.log('Platform admin already exists — skipping');
    }

    let userId: string;

    const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, [
      SUPER_ADMIN_EMAIL,
    ]);

    if (existingUser.rowCount === 0) {
      const userResult = await client.query(
        `INSERT INTO users (saral_user_id, email, wallet_address, first_name, last_name, base_role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['saral_demo_founder_001', SUPER_ADMIN_EMAIL, SUPER_ADMIN_WALLET, 'Demo', 'Founder', ROLES.CONSUMER]
      );
      userId = userResult.rows[0].id as string;

      await client.query(
        `INSERT INTO wallets (user_id, wallet_address)
         VALUES ($1, $2)`,
        [userId, SUPER_ADMIN_WALLET]
      );

      console.log(`Created org founder user: ${SUPER_ADMIN_EMAIL}`);
    } else {
      userId = existingUser.rows[0].id as string;
      console.log('Org founder user already exists — skipping');
    }

    const existingOrg = await client.query(`SELECT id FROM organisations WHERE slug = $1`, [
      'demo-events',
    ]);

    if (existingOrg.rowCount === 0) {
      const orgResult = await client.query(
        `INSERT INTO organisations (
           name, slug, description, super_admin_id, super_admin_wallet_address,
           status, verification_status, verified_at, country, city
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
         RETURNING id`,
        [
          'Demo Events Co',
          'demo-events',
          'Sample organisation for local development',
          userId,
          SUPER_ADMIN_WALLET,
          'active',
          'verified',
          'India',
          'Mumbai',
        ]
      );

      const orgId = orgResult.rows[0].id as string;

      await client.query(
        `INSERT INTO org_members (org_id, user_id, role, assigned_by_id)
         VALUES ($1, $2, $3, $4)`,
        [orgId, userId, ROLES.SUPER_ADMIN, userId]
      );

      console.log('Created demo organisation: demo-events');
    } else {
      console.log('Demo organisation already exists — skipping');
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
