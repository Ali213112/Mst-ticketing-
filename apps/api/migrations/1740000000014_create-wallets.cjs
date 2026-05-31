/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE wallets (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      wallet_address        VARCHAR(42) UNIQUE NOT NULL,
      balance_wei           NUMERIC(78, 0) NOT NULL DEFAULT 0,
      balance_display       NUMERIC(20, 8) NOT NULL DEFAULT 0,
      total_earnings_wei    NUMERIC(78, 0) NOT NULL DEFAULT 0,
      total_withdrawn_wei   NUMERIC(78, 0) NOT NULL DEFAULT 0,
      is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
      last_synced_at        TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('wallets');
};
