/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE events (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id                  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      created_by_id           UUID NOT NULL REFERENCES users(id),
      venue_id                UUID REFERENCES venues(id),
      name                    VARCHAR(255) NOT NULL,
      description             TEXT,
      image_ipfs_hash         VARCHAR(100),
      image_ipfs_url          VARCHAR(500),
      category                VARCHAR(100),
      tags                    TEXT[],
      age_restriction         SMALLINT,
      event_date              TIMESTAMPTZ NOT NULL,
      event_end_date          TIMESTAMPTZ,
      venue_name              VARCHAR(255),
      city                    VARCHAR(100),
      country                 VARCHAR(100),
      latitude                DECIMAL(10, 8),
      longitude               DECIMAL(11, 8),
      zones                   JSONB,
      contract_address        VARCHAR(42),
      contract_deployment_tx  VARCHAR(66),
      chain_id                INTEGER NOT NULL DEFAULT 4545,
      resale_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
      resale_price_cap_bps    SMALLINT CHECK (resale_price_cap_bps BETWEEN 0 AND 100000),
      resale_royalty_bps      SMALLINT CHECK (resale_royalty_bps BETWEEN 0 AND 10000),
      status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'published', 'live', 'ended', 'cancelled')),
      total_tickets_sold      INTEGER NOT NULL DEFAULT 0,
      total_revenue_wei       NUMERIC(78, 0) NOT NULL DEFAULT 0,
      total_checked_in        INTEGER NOT NULL DEFAULT 0,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at            TIMESTAMPTZ,
      ended_at                TIMESTAMPTZ,
      deleted_at              TIMESTAMPTZ
    );

    CREATE INDEX idx_events_org_id   ON events(org_id)     WHERE deleted_at IS NULL;
    CREATE INDEX idx_events_status   ON events(status)     WHERE deleted_at IS NULL;
    CREATE INDEX idx_events_date     ON events(event_date) WHERE deleted_at IS NULL;
    CREATE INDEX idx_events_city     ON events(city)       WHERE deleted_at IS NULL;
    CREATE INDEX idx_events_category ON events(category)   WHERE deleted_at IS NULL;
    CREATE INDEX idx_events_fts ON events USING GIN (
      to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, ''))
    );
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('events');
};
