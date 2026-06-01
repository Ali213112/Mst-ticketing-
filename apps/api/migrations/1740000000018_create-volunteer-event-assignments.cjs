/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE volunteer_event_assignments (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      permitted_zones TEXT[] NOT NULL DEFAULT '{}',
      assigned_by_id  UUID REFERENCES users(id),
      status          VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    );

    CREATE INDEX idx_vol_assignments_user  ON volunteer_event_assignments(user_id) WHERE status = 'active';
    CREATE INDEX idx_vol_assignments_event ON volunteer_event_assignments(event_id) WHERE status = 'active';

    ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE wallets DROP COLUMN IF EXISTS is_blacklisted;`);
  pgm.dropTable('volunteer_event_assignments');
};
