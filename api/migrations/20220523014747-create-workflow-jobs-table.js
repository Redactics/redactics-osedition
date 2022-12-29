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
  return db.createTable('workflowjobs', {
    id: { type: 'serial', primaryKey: true },
    uuid: { type: 'uuid', notNull: true, defaultValue: new String('uuid_generate_v4()') },
    databaseId: { type: 'int', notNull: true },
    workflowType: { type: 'string', notNull: true },
    status: { type: 'string' },
    exception: { type: 'string' },
    stackTrace: { type: 'string' },
    currentTaskNum: { type: 'int' },
    totalTaskNum: { type: 'int' },
    outputUrl: { type: 'string' },
    lastTask: { type: 'string' },
    lastTaskEnd: { type: 'timestamp' },
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
