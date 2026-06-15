/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE fraud_logs (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type          VARCHAR(100) NOT NULL,
      severity            VARCHAR(20) NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      user_id             UUID REFERENCES users(id),
      wallet_address      VARCHAR(42),
      ip_address          VARCHAR(45),
      device_fingerprint  VARCHAR(200),
      user_agent          TEXT,
      event_id            UUID REFERENCES events(id),
      ticket_id           UUID REFERENCES tickets(id),
      details             JSONB,
      resolved            BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_at         TIMESTAMPTZ,
      resolved_by_id      UUID REFERENCES platform_admins(id),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_fraud_user     ON fraud_logs(user_id);
    CREATE INDEX idx_fraud_wallet   ON fraud_logs(wallet_address);
    CREATE INDEX idx_fraud_event    ON fraud_logs(event_id);
    CREATE INDEX idx_fraud_severity ON fraud_logs(severity) WHERE resolved = FALSE;

    CREATE TABLE audit_logs (
      id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action                          VARCHAR(100) NOT NULL,
      entity_type                     VARCHAR(50) NOT NULL,
      entity_id                       UUID,
      performed_by_id                 UUID REFERENCES users(id),
      performed_by_platform_admin_id  UUID REFERENCES platform_admins(id),
      performed_by_wallet             VARCHAR(42),
      changes                         JSONB,
      status                          VARCHAR(10) NOT NULL DEFAULT 'success'
                                      CHECK (status IN ('success', 'failed')),
      error_message                   TEXT,
      ip_address                      VARCHAR(45),
      user_agent                      TEXT,
      created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_audit_action    ON audit_logs(action);
    CREATE INDEX idx_audit_entity    ON audit_logs(entity_type, entity_id);
    CREATE INDEX idx_audit_performer ON audit_logs(performed_by_id);
    CREATE INDEX idx_audit_time      ON audit_logs(created_at);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES users(id);

    CREATE TABLE loyalty_rewards (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reward_type       VARCHAR(50) NOT NULL,
      reward_metadata   JSONB,
      token_id          INTEGER,
      contract_address  VARCHAR(42),
      issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_loyalty_user ON loyalty_rewards(user_id);

    ALTER TABLE resale_listings ADD COLUMN IF NOT EXISTS on_chain_listing_id BIGINT;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE resale_listings DROP COLUMN IF EXISTS on_chain_listing_id;
    DROP TABLE IF EXISTS loyalty_rewards;
    ALTER TABLE users DROP COLUMN IF EXISTS referred_by_id;
    ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS fraud_logs;
  `);
};
