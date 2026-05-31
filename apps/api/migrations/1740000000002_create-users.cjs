/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      saral_user_id     VARCHAR(100) UNIQUE NOT NULL,
      email             VARCHAR(255) UNIQUE NOT NULL,
      wallet_address    VARCHAR(42)  UNIQUE NOT NULL,
      first_name        VARCHAR(100),
      last_name         VARCHAR(100),
      phone_number      VARCHAR(20),
      profile_image     VARCHAR(500),
      base_role         SMALLINT NOT NULL DEFAULT 0,
      status            VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'deleted')),
      last_login_at     TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at        TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX idx_users_email    ON users(email)         WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX idx_users_wallet   ON users(wallet_address) WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX idx_users_saral_id ON users(saral_user_id)  WHERE deleted_at IS NULL;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('users');
};
