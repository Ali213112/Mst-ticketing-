/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('faucet_claims', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    target_address: { type: 'varchar(42)', notNull: true },
    amount_wei: { type: 'numeric(78,0)', notNull: true },
    tx_hash: { type: 'varchar(66)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('faucet_claims', 'user_id');
  pgm.createIndex('faucet_claims', ['user_id', 'created_at']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('faucet_claims');
};
