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
  return db.createTable('databases', {
    id: { type: 'serial', primaryKey: true },
    schedule: 'string',
    type: 'string',
    version: 'string',
    lastException: 'string',
    lastStackTrace: 'string',
    lastReportedDate: 'timestamp'
  });
};

exports.down = function(db) {
  return db.dropTable('databases');
};

exports._meta = {
  "version": 1
};
