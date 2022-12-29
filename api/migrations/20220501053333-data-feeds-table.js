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
  return db.createTable('datafeeds', {
    id: { type: 'serial', primaryKey: true },
    uuid: { type: 'uuid', notNull: true, defaultValue: new String('uuid_generate_v4()') },
    databaseId: { type: 'int', notNull: true },
    dataFeed: { type: 'string', notNull: true },
    dataFeedConfig: { type: 'jsonb' },
    feedSecrets: { type: 'jsonb' },
    disabled: { type: 'boolean' },
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
