/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE tickets (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id                UUID NOT NULL REFERENCES events(id),
      tier_id                 UUID NOT NULL REFERENCES ticket_tiers(id),
      tier_index              SMALLINT NOT NULL,
      owner_user_id           UUID REFERENCES users(id),
      owner_wallet_address    VARCHAR(42) NOT NULL,
      token_id                INTEGER NOT NULL,
      contract_address        VARCHAR(42) NOT NULL,
      transaction_hash        VARCHAR(66) NOT NULL,
      minted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      qr_secret               VARCHAR(64) NOT NULL,
      status                  VARCHAR(20) NOT NULL DEFAULT 'valid'
                              CHECK (status IN ('valid', 'used', 'cancelled', 'transferred', 'listed_for_resale')),
      used_at                 TIMESTAMPTZ,
      used_by_volunteer_id    UUID REFERENCES users(id),
      seat_number             VARCHAR(20),
      promo_code_used         VARCHAR(50),
      discount_applied_bps    SMALLINT,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (event_id, tier_index) REFERENCES ticket_tiers(event_id, tier_index)
    );

    CREATE INDEX idx_tickets_event_id  ON tickets(event_id);
    CREATE INDEX idx_tickets_owner     ON tickets(owner_user_id);
    CREATE INDEX idx_tickets_status    ON tickets(status);
    CREATE INDEX idx_tickets_contract  ON tickets(contract_address, token_id);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('tickets');
};
