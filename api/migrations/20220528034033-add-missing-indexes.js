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
  return db.addIndex('workflowjobs', 'workflowjobs_uuid', 'uuid', true)
  .then(function() {
    return db.addIndex('workflowjobs', 'workflowjobs_databaseid', 'databaseId', false)
  })
  .then(function() {
    return db.addIndex('inputs', 'inputs_databaseid', 'databaseId', false)
  })
  .then(function() {
    return db.addIndex('datafeeds', 'datafeeds_databaseid', 'databaseId', false)
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
