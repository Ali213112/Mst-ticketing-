/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE ticket_orders (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id                 UUID NOT NULL REFERENCES users(id),
      event_id                UUID NOT NULL REFERENCES events(id),
      tier_id                 UUID NOT NULL REFERENCES ticket_tiers(id),
      quantity                SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),
      amount_fiat             NUMERIC(20, 8) NOT NULL,
      currency                VARCHAR(3) NOT NULL DEFAULT 'INR',
      payment_provider        VARCHAR(50) NOT NULL,
      payment_method          VARCHAR(50) NOT NULL,
      status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN (
                                'pending', 'paid', 'minting', 'completed',
                                'failed', 'expired', 'cancelled'
                              )),
      idempotency_key         VARCHAR(200) UNIQUE NOT NULL,
      provider_token          VARCHAR(255),
      provider_success_token  VARCHAR(500),
      payment_url             VARCHAR(1000),
      transaction_hash        VARCHAR(66),
      inventory_reserved      BOOLEAN NOT NULL DEFAULT FALSE,
      paid_at                 TIMESTAMPTZ,
      completed_at            TIMESTAMPTZ,
      expires_at              TIMESTAMPTZ NOT NULL,
      failure_reason          TEXT,
      metadata                JSONB,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_ticket_orders_user_id   ON ticket_orders(user_id);
    CREATE INDEX idx_ticket_orders_status    ON ticket_orders(status);
    CREATE INDEX idx_ticket_orders_expires   ON ticket_orders(expires_at) WHERE status = 'pending';
    CREATE INDEX idx_ticket_orders_provider  ON ticket_orders(provider_token) WHERE provider_token IS NOT NULL;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('ticket_orders');
};
