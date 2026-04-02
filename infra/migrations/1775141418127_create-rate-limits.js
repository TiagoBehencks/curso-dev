exports.shorthands = undefined

exports.up = (pgm) => {
  pgm.createTable('rate_limits', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    ip_address: {
      type: 'varchar(45)',
      notNull: true,
    },
    endpoint: {
      type: 'varchar(100)',
      notNull: true,
    },
    attempts: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    window_start: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  })

  pgm.addConstraint('rate_limits', 'rate_limits_ip_endpoint_unique', {
    unique: ['ip_address', 'endpoint'],
  })

  pgm.createIndex('rate_limits', ['ip_address', 'endpoint'])
}

exports.down = (pgm) => {
  pgm.dropTable('rate_limits')
}
