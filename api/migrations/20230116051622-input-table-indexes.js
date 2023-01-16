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
  return db.addIndex('workflowinputs', 'workflowinputs_enabled', 'enabled', false)
  .then(() => {
    return db.addIndex('workflowinputs', 'workflowinputs_workflowId', 'workflowId', false)
  })
  .then(() => {
    return db.addIndex('workflowinputs', 'workflowinputs_inputId', 'inputId', false)
  })
  .then(() => {
    return db.addIndex('tablefullcopies', 'tablefullcopies_inputId', 'inputId', false)
  })
  .then(() => {
    return db.addIndex('tablefullcopies', 'tablefullcopies_tableName', 'tableName', false)
  })
  .then(() => {
    return db.addIndex('notifications', 'notifications_uuid', 'uuid', true)
  })
  .then(() => {
    return db.addIndex('agentinputs', 'agentinputs_agentId', 'agentId', false)
  })
  .then(() => {
    return db.addIndex('agentinputs', 'agentinputs_inputId', 'inputId', false)
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
