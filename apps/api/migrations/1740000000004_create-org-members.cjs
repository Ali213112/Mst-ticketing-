/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE org_members (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      user_id         UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
      role            SMALLINT NOT NULL CHECK (role IN (1, 2, 3)),
      assigned_by_id  UUID REFERENCES users(id),
      assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status          VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive', 'suspended')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at      TIMESTAMPTZ,
      UNIQUE (org_id, user_id)
    );

    CREATE INDEX idx_org_members_org  ON org_members(org_id)  WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_members_user ON org_members(user_id) WHERE deleted_at IS NULL;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('org_members');
};
