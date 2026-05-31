/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS web3auth_sub VARCHAR(100);
    ALTER TABLE users ALTER COLUMN saral_user_id DROP NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_web3auth_sub
      ON users(web3auth_sub)
      WHERE deleted_at IS NULL AND web3auth_sub IS NOT NULL;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_users_web3auth_sub;
    ALTER TABLE users DROP COLUMN IF EXISTS web3auth_sub;
    ALTER TABLE users ALTER COLUMN saral_user_id SET NOT NULL;
  `);
};
