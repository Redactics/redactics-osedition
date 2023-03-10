'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.runSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  .then(() => {
    return db.addColumn('databases', 'uuid', {
      type: "uuid",
      notNull: true,
      defaultValue: new String('uuid_generate_v4()')
    })
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
