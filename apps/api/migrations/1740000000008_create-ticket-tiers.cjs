/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE ticket_tiers (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      tier_index            SMALLINT NOT NULL,
      name                  VARCHAR(100) NOT NULL,
      description           TEXT,
      zone                  VARCHAR(100),
      total_supply          INTEGER NOT NULL CHECK (total_supply > 0),
      minted                INTEGER NOT NULL DEFAULT 0 CHECK (minted >= 0),
      max_per_wallet        SMALLINT NOT NULL DEFAULT 4,
      price_wei             NUMERIC(78, 0) NOT NULL,
      price_display         NUMERIC(20, 8),
      sale_start_at         TIMESTAMPTZ,
      sale_end_at           TIMESTAMPTZ,
      early_bird_end_at     TIMESTAMPTZ,
      early_bird_price_wei  NUMERIC(78, 0),
      is_transferable       BOOLEAN NOT NULL DEFAULT TRUE,
      royalty_bps           SMALLINT NOT NULL DEFAULT 500 CHECK (royalty_bps BETWEEN 0 AND 10000),
      metadata_ipfs_hash    VARCHAR(100),
      metadata_ipfs_uri     VARCHAR(500),
      resale_enabled        BOOLEAN,
      resale_price_cap_bps  SMALLINT,
      status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'sold_out', 'disabled')),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at            TIMESTAMPTZ,
      UNIQUE (event_id, tier_index)
    );

    CREATE INDEX idx_tiers_event_id ON ticket_tiers(event_id) WHERE deleted_at IS NULL;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('ticket_tiers');
};
