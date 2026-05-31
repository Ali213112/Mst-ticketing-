/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE checkins (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id              UUID NOT NULL REFERENCES events(id),
      ticket_id             UUID NOT NULL REFERENCES tickets(id),
      checked_in_by_id      UUID NOT NULL REFERENCES users(id),
      qr_signature          VARCHAR(500),
      qr_nonce              VARCHAR(100),
      qr_timestamp          BIGINT,
      nfc_uid               VARCHAR(100),
      scan_method           VARCHAR(10) NOT NULL DEFAULT 'qr'
                            CHECK (scan_method IN ('qr', 'nfc', 'manual')),
      verification_success  BOOLEAN NOT NULL,
      failure_reason        VARCHAR(100),
      zone_accessed         VARCHAR(100),
      device_id             VARCHAR(100),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_checkins_event     ON checkins(event_id);
    CREATE INDEX idx_checkins_ticket    ON checkins(ticket_id);
    CREATE INDEX idx_checkins_volunteer ON checkins(checked_in_by_id);
    CREATE INDEX idx_checkins_time      ON checkins(created_at);
    CREATE UNIQUE INDEX idx_checkins_used ON checkins(ticket_id) WHERE verification_success = TRUE;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('checkins');
};
