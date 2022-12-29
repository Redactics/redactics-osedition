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
  return db.createTable('inputs', {
    id: { type: 'serial', primaryKey: true },
    uuid: { type: 'uuid', notNull: true, defaultValue: new String('uuid_generate_v4()') },
    databaseId: { type: 'int', notNull: true },
    inputName: { type: 'string', notNull: true },
    databaseType: { type: 'string', notNull: true },
    diskSize: { type: 'int' },
    enableSSL: { type: 'boolean' },
    tables: { type: 'jsonb' },
    createdAt: { type: 'timestamp', notNull: true, defaultValue: new String('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp', notNull: true, defaultValue: new String('CURRENT_TIMESTAMP') }
  });
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
