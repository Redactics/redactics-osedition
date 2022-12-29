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
  return db.addIndex('helmcmds', 'helmcmds_clusterid', 'clusterId', false)
  .then(function() {
    return db.addIndex('helmcmds', 'helmcmds_cmd', 'cmd', false)
  })
  .then(function() {
    return db.addIndex('helmcmds', 'helmcmds_uuid', 'uuid', true)
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
