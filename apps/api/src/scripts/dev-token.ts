import 'dotenv/config';
import { pool } from '../shared/db/postgres.service.js';
import {
  getOrgMemberships,
  resolveAdminOrgIds,
  resolveSessionRole,
} from '../modules/auth/auth.repository.js';
import { ensureJwtKeysExist, signAccessToken } from '../modules/auth/token.service.js';

const email = process.argv[2] ?? 'founder@demo-org.com';

async function main(): Promise<void> {
  ensureJwtKeysExist();

  const userRes = await pool.query<{ id: string; wallet_address: string }>(
    `SELECT id, wallet_address FROM users WHERE email = $1`,
    [email]
  );
  const user = userRes.rows[0];
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  const memberships = await getOrgMemberships(user.id);
  const role = resolveSessionRole(memberships);
  const orgIds = resolveAdminOrgIds(memberships);
  const token = await signAccessToken({
    userId: user.id,
    role,
    walletAddress: user.wallet_address,
    orgIds,
    isPlatformAdmin: false,
  });

  console.log(token);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
