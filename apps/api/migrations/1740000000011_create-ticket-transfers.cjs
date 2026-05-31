/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE ticket_transfers (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id             UUID NOT NULL REFERENCES tickets(id),
      event_id              UUID NOT NULL REFERENCES events(id),
      from_user_id          UUID NOT NULL REFERENCES users(id),
      from_wallet_address   VARCHAR(42) NOT NULL,
      to_user_id            UUID REFERENCES users(id),
      to_wallet_address     VARCHAR(42) NOT NULL,
      transfer_type         VARCHAR(20) NOT NULL DEFAULT 'gift'
                            CHECK (transfer_type IN ('gift', 'resale')),
      sale_price_wei        NUMERIC(78, 0),
      royalty_paid_wei      NUMERIC(78, 0),
      platform_fee_wei      NUMERIC(78, 0),
      transaction_hash      VARCHAR(66),
      block_number          BIGINT,
      transaction_timestamp TIMESTAMPTZ,
      status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_transfers_ticket ON ticket_transfers(ticket_id);
    CREATE INDEX idx_transfers_from   ON ticket_transfers(from_user_id);
    CREATE INDEX idx_transfers_to     ON ticket_transfers(to_user_id);
    CREATE INDEX idx_transfers_status ON ticket_transfers(status);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('ticket_transfers');
};
