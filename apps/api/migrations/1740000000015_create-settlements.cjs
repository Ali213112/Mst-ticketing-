/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE settlements (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id                  UUID NOT NULL REFERENCES organisations(id),
      event_id                UUID REFERENCES events(id),
      gross_revenue_wei       NUMERIC(78, 0) NOT NULL DEFAULT 0,
      platform_commission_wei NUMERIC(78, 0) NOT NULL DEFAULT 0,
      royalties_paid_wei      NUMERIC(78, 0) NOT NULL DEFAULT 0,
      refunds_issued_wei      NUMERIC(78, 0) NOT NULL DEFAULT 0,
      net_payout_wei          NUMERIC(78, 0) NOT NULL DEFAULT 0,
      period_start            TIMESTAMPTZ NOT NULL,
      period_end              TIMESTAMPTZ NOT NULL,
      status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      transaction_hash        VARCHAR(66),
      settled_at              TIMESTAMPTZ,
      settled_by_id           UUID REFERENCES platform_admins(id),
      gst_applicable          BOOLEAN NOT NULL DEFAULT FALSE,
      gst_amount_wei          NUMERIC(78, 0) NOT NULL DEFAULT 0,
      invoice_number          VARCHAR(50),
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_settlements_org    ON settlements(org_id);
    CREATE INDEX idx_settlements_event  ON settlements(event_id);
    CREATE INDEX idx_settlements_status ON settlements(status);
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('settlements');
};
