/**
 * worker.ts — BullMQ / background job entry point
 *
 * Start with:  pnpm --filter api run worker:dev
 *
 * Jobs scheduled here:
 *  1. Orphan Reconciliation  — every 5 minutes
 *     Finds mint_idempotency records stuck in 'pending'/'failed' and fixes them.
 *
 * Future jobs to add here (Step 10):
 *  2. Email confirmation     — triggered per ticket purchase
 *  3. Blockchain tx polling  — verifies on-chain finality
 *  4. Settlement payouts     — nightly batch
 */

import 'dotenv/config';
import { runOrphanReconciliation } from './workers/orphan-reconcile.worker.js';

const ORPHAN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function startWorker(): Promise<void> {
  console.log('🔧 TicketChain Worker starting...');

  // ── 1. Orphan Reconciliation ──────────────────────────────────────────────
  // Run immediately on startup, then every 5 minutes
  console.log('[worker] Scheduling orphan reconciliation (every 5 min)');
  await runOrphanReconciliation().catch((err: unknown) => {
    console.error('[worker] Initial orphan reconciliation failed:', err);
  });

  setInterval(() => {
    void runOrphanReconciliation().catch((err: unknown) => {
      console.error('[worker] Orphan reconciliation error:', err);
    });
  }, ORPHAN_INTERVAL_MS);

  console.log('✅ TicketChain Worker running. Press Ctrl+C to stop.');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received — shutting down gracefully.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[worker] SIGINT received — shutting down gracefully.');
  process.exit(0);
});

void startWorker();
