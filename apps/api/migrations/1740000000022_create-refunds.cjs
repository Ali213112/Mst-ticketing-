/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE refunds (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id           UUID NOT NULL REFERENCES tickets(id),
      event_id            UUID NOT NULL REFERENCES events(id),
      user_id             UUID NOT NULL REFERENCES users(id),
      org_id              UUID NOT NULL REFERENCES organisations(id),
      refund_amount_wei   NUMERIC(78, 0) NOT NULL,
      refund_reason       VARCHAR(255),
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
      reviewed_by_id      UUID REFERENCES users(id),
      reviewed_at         TIMESTAMPTZ,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_refunds_event ON refunds(event_id);
    CREATE INDEX idx_refunds_user ON refunds(user_id);
    CREATE INDEX idx_refunds_status ON refunds(status);
    CREATE INDEX idx_refunds_org ON refunds(org_id);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('refunds');
};
