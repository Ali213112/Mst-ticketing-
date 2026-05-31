/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE organisations (
      id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name                          VARCHAR(255) NOT NULL,
      slug                          VARCHAR(100) UNIQUE NOT NULL,
      description                   TEXT,
      logo_url                      VARCHAR(500),
      banner_url                    VARCHAR(500),
      website_url                   VARCHAR(255),
      custom_domain                 VARCHAR(255),
      brand_primary_color           VARCHAR(7),
      brand_secondary_color         VARCHAR(7),
      tax_id                        VARCHAR(50),
      gst_number                    VARCHAR(50),
      registration_number           VARCHAR(100),
      country                       VARCHAR(100),
      city                          VARCHAR(100),
      kyc_documents                 JSONB,
      super_admin_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      super_admin_wallet_address    VARCHAR(42) NOT NULL,
      org_registry_contract_address VARCHAR(42),
      chain_id                      INTEGER NOT NULL DEFAULT 4545,
      subscription_plan             VARCHAR(50) NOT NULL DEFAULT 'starter'
                                    CHECK (subscription_plan IN ('starter', 'growth', 'enterprise')),
      subscription_expires_at       TIMESTAMPTZ,
      api_key                       VARCHAR(100) UNIQUE,
      api_key_created_at            TIMESTAMPTZ,
      status                        VARCHAR(20) NOT NULL DEFAULT 'pending_verification'
                                    CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
      verification_status           VARCHAR(20) NOT NULL DEFAULT 'unverified'
                                    CHECK (verification_status IN ('unverified', 'under_review', 'verified', 'rejected')),
      verified_at                   TIMESTAMPTZ,
      verified_by_id                UUID REFERENCES platform_admins(id),
      platform_commission_bps       SMALLINT NOT NULL DEFAULT 200
                                    CHECK (platform_commission_bps BETWEEN 0 AND 10000),
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at                    TIMESTAMPTZ,
      UNIQUE (super_admin_id)
    );

    CREATE INDEX idx_organisations_status ON organisations(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_organisations_slug   ON organisations(slug);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('organisations');
};
