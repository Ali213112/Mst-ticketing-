/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE organisations
      ADD COLUMN IF NOT EXISTS org_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS founder_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pending_founder_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS platform_notes TEXT,
      ADD COLUMN IF NOT EXISTS wallet_confirmed_at TIMESTAMPTZ;

    ALTER TABLE organisations
      ALTER COLUMN super_admin_id DROP NOT NULL;

    ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_role_to_assign_check;
    ALTER TABLE invites ADD CONSTRAINT invites_role_to_assign_check
      CHECK (role_to_assign IN (1, 2, 3));

    ALTER TABLE invites ADD COLUMN IF NOT EXISTS invitee_name VARCHAR(255);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE invites DROP COLUMN IF EXISTS invitee_name;
    ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_role_to_assign_check;
    ALTER TABLE invites ADD CONSTRAINT invites_role_to_assign_check
      CHECK (role_to_assign IN (1, 2));

    ALTER TABLE organisations
      DROP COLUMN IF EXISTS wallet_confirmed_at,
      DROP COLUMN IF EXISTS platform_notes,
      DROP COLUMN IF EXISTS pending_founder_email,
      DROP COLUMN IF EXISTS founder_name,
      DROP COLUMN IF EXISTS founder_phone,
      DROP COLUMN IF EXISTS postal_code,
      DROP COLUMN IF EXISTS state,
      DROP COLUMN IF EXISTS org_type;
  `);
};
