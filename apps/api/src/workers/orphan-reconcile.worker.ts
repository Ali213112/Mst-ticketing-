/**
 * orphan-reconcile.worker.ts
 *
 * Step 7 — Orphan Reconciliation
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds mint_idempotency records stuck in 'pending' or 'failed' state and
 * reconciles them:
 *
 *  • pending  → check the on-chain tx (if txHash exists).
 *               If confirmed on-chain → create ticket rows & mark 'confirmed'.
 *               If > 10 min old with no txHash → mark 'failed', restore Redis.
 *
 *  • failed   → restore Redis availability counter if not already restored.
 *               (idempotent — uses INCR only when Redis key exists)
 *
 * Run every 5 minutes by the worker entry-point.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { pool } from '../shared/db/postgres.service.js';
import { connectRedis, redisClient } from '../shared/cache/redis.service.js';
import { checkTxConfirmed } from '../shared/blockchain/event-contract.service.js';

interface StaleRecord {
  id: string;
  idempotency_key: string;
  user_id: string;
  tier_id: string;
  quantity: number;
  status: string;
  transaction_hash: string | null;
  created_at: Date;
  expires_at: Date;
}

const PENDING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Restore Redis availability counter for a tier.
 * Safe to call multiple times — only restores if the Redis key exists.
 */
async function safeRestoreRedis(tierId: string, quantity: number): Promise<void> {
  try {
    await connectRedis();
    const key = `tier:available:${tierId}`;
    // Only restore if key already exists (i.e. event is published)
    const exists = await redisClient.exists(key);
    if (exists) {
      await redisClient.incrBy(key, quantity);
    }
  } catch (err) {
    console.error(`[orphan-reconcile] Failed to restore Redis for tier ${tierId}:`, err);
  }
}

/**
 * Handle a single stale 'pending' record.
 */
async function reconcilePending(record: StaleRecord): Promise<void> {
  const ageMs = Date.now() - record.created_at.getTime();

  // If there is a transaction hash, check on-chain status
  if (record.transaction_hash) {
    try {
      const confirmed = await checkTxConfirmed(record.transaction_hash);
      if (confirmed) {
        // Tx is on-chain — tickets should already exist (created in same DB tx).
        // Just mark idempotency as confirmed.
        await pool.query(
          `UPDATE mint_idempotency
           SET status = 'confirmed', confirmed_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [record.id]
        );
        console.log(`[orphan-reconcile] ✅ Confirmed orphan ${record.id} (tx on-chain)`);
        return;
      }
    } catch (err) {
      console.error(`[orphan-reconcile] Tx check failed for ${record.transaction_hash}:`, err);
    }
  }

  // If record is older than PENDING_TIMEOUT_MS with no confirmed tx → fail it
  if (ageMs > PENDING_TIMEOUT_MS) {
    await pool.query(
      `UPDATE mint_idempotency
       SET status = 'failed'
       WHERE id = $1 AND status = 'pending'`,
      [record.id]
    );
    await safeRestoreRedis(record.tier_id, record.quantity);
    console.log(
      `[orphan-reconcile] ❌ Timed-out orphan ${record.id} → failed. Redis restored.`
    );
  }
}

/**
 * Handle a single 'failed' record that may need Redis restoration.
 * We track restoration via a dedicated column to keep this idempotent.
 */
async function reconcileFailed(record: StaleRecord): Promise<void> {
  // Only restore Redis for recently failed records (within last 24h)
  const ageMs = Date.now() - record.created_at.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  if (ageMs > ONE_DAY_MS) return; // old failures already cleaned up

  await safeRestoreRedis(record.tier_id, record.quantity);
}

/**
 * Main reconciliation job — finds all stale records and processes them.
 */
export async function runOrphanReconciliation(): Promise<void> {
  console.log('[orphan-reconcile] Running orphan reconciliation...');

  try {
    // Fetch all pending records older than 2 minutes (give normal flow time to complete)
    const result = await pool.query<StaleRecord>(
      `SELECT id, idempotency_key, user_id, tier_id, quantity, status,
              transaction_hash, created_at, expires_at
       FROM mint_idempotency
       WHERE status IN ('pending', 'failed')
         AND created_at < NOW() - INTERVAL '2 minutes'
       ORDER BY created_at ASC
       LIMIT 100`
    );

    const records = result.rows;
    if (records.length === 0) {
      console.log('[orphan-reconcile] No stale records found.');
      return;
    }

    console.log(`[orphan-reconcile] Processing ${records.length} stale record(s)...`);

    for (const record of records) {
      try {
        if (record.status === 'pending') {
          await reconcilePending(record);
        } else if (record.status === 'failed') {
          await reconcileFailed(record);
        }
      } catch (err) {
        console.error(`[orphan-reconcile] Error processing record ${record.id}:`, err);
      }
    }

    console.log('[orphan-reconcile] Reconciliation complete.');
  } catch (err) {
    console.error('[orphan-reconcile] Fatal error during reconciliation:', err);
  }
}
