/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE resale_listings (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id           UUID NOT NULL UNIQUE REFERENCES tickets(id),
      event_id            UUID NOT NULL REFERENCES events(id),
      tier_id             UUID NOT NULL REFERENCES ticket_tiers(id),
      seller_user_id      UUID NOT NULL REFERENCES users(id),
      seller_wallet       VARCHAR(42) NOT NULL,
      face_price_wei      NUMERIC(78, 0) NOT NULL,
      ask_price_wei       NUMERIC(78, 0) NOT NULL,
      max_price_wei       NUMERIC(78, 0) NOT NULL,
      status              VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
      expires_at          TIMESTAMPTZ,
      buyer_user_id       UUID REFERENCES users(id),
      sold_at             TIMESTAMPTZ,
      sale_price_wei      NUMERIC(78, 0),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_resale_event_id ON resale_listings(event_id) WHERE status = 'active';
    CREATE INDEX idx_resale_seller   ON resale_listings(seller_user_id);
    CREATE INDEX idx_resale_status   ON resale_listings(status);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('resale_listings');
};
