/**
 * Simulate ChainPay webhook for a pending order (local dev without public notifyUrl).
 *
 * Usage:
 *   node --env-file=../../.env ./node_modules/tsx/dist/cli.mjs src/scripts/simulate-chainpay-webhook.ts <orderId>
 */
import 'dotenv/config';
import { pool } from '../shared/db/postgres.service.js';

const orderId = process.argv[2];
const apiBase = process.env.API_BASE_URL ?? 'http://localhost:5000';

if (!orderId) {
  console.error('Usage: simulate-chainpay-webhook.ts <orderId>');
  process.exit(1);
}

async function main() {
  const result = await pool.query<{ provider_success_token: string | null; status: string }>(
    `SELECT provider_success_token, status FROM ticket_orders WHERE id = $1`,
    [orderId]
  );
  const row = result.rows[0];
  if (!row) {
    console.error('Order not found:', orderId);
    process.exit(1);
  }
  if (!row.provider_success_token) {
    console.error('Order has no provider_success_token — run checkout with CHAINPAY_API_KEY first');
    process.exit(1);
  }

  const url = `${apiBase}/api/webhooks/chainpay?order_id=${orderId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ successToken: row.provider_success_token }),
  });

  const body = await response.text();
  console.log('Status:', response.status);
  console.log('Body:', body);

  await pool.end();
  process.exit(response.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
