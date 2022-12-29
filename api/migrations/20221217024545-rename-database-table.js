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
  return db.renameTable('databases', 'workflows')
  .then(() => {
    return db.renameColumn('workflowjobs', 'databaseId', 'workflowId')
  })
  .then(() => {
    return db.renameColumn('datafeeds', 'databaseId', 'workflowId')
  })
  .then(() => {
    return db.renameColumn('inputs', 'databaseId', 'workflowId')
  })
  .then(() => {
    return db.renameColumn('inputs', 'databaseType', 'inputType')
  })
  .then(() => {
    return db.renameColumn('redactrules', 'databaseId', 'workflowId')
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
