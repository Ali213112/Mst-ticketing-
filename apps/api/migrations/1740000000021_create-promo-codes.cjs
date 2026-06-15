/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE promo_codes (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
      tier_id           UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL,
      code              VARCHAR(50) NOT NULL,
      discount_type     VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_wei')),
      discount_value    NUMERIC(78, 0) NOT NULL,
      max_uses          INTEGER,
      uses_remaining    INTEGER,
      max_per_user      SMALLINT NOT NULL DEFAULT 1,
      valid_from        TIMESTAMPTZ,
      valid_until       TIMESTAMPTZ,
      status            VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'exhausted', 'expired')),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (org_id, code)
    );

    CREATE INDEX idx_promos_event ON promo_codes(event_id) WHERE status = 'active';
    CREATE INDEX idx_promos_code ON promo_codes(code);
    CREATE INDEX idx_promos_org ON promo_codes(org_id) WHERE status = 'active';
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('promo_codes');
};
