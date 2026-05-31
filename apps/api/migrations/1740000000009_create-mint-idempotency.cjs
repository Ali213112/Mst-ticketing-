/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE mint_idempotency (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      idempotency_key  VARCHAR(200) UNIQUE NOT NULL,
      transaction_hash VARCHAR(66) UNIQUE,
      token_id         INTEGER,
      status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'failed')),
      user_id          UUID NOT NULL REFERENCES users(id),
      tier_id          UUID NOT NULL REFERENCES ticket_tiers(id),
      quantity         SMALLINT NOT NULL DEFAULT 1,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at     TIMESTAMPTZ,
      expires_at       TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX idx_idempotency_key    ON mint_idempotency(idempotency_key);
    CREATE INDEX idx_idempotency_tx     ON mint_idempotency(transaction_hash);
    CREATE INDEX idx_idempotency_status ON mint_idempotency(status);
    CREATE INDEX idx_idempotency_expiry ON mint_idempotency(expires_at) WHERE status = 'pending';
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('mint_idempotency');
};
