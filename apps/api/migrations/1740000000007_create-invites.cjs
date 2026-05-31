/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE invites (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id              UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      invited_by_id       UUID NOT NULL REFERENCES users(id),
      invitee_email       VARCHAR(255) NOT NULL,
      invitee_phone       VARCHAR(20),
      role_to_assign      SMALLINT NOT NULL CHECK (role_to_assign IN (1, 2)),
      event_id            UUID REFERENCES events(id),
      invite_token        VARCHAR(500) UNIQUE NOT NULL,
      token_expires_at    TIMESTAMPTZ NOT NULL,
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
      accepted_at         TIMESTAMPTZ,
      accepted_by_id      UUID REFERENCES users(id),
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_invites_email   ON invites(invitee_email);
    CREATE INDEX idx_invites_status  ON invites(status);
    CREATE INDEX idx_invites_expires ON invites(token_expires_at);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('invites');
};
