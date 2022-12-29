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
  return db.addColumn('databases', 'exportHookContainerConfig', {
    type: "jsonb",
    notNull: false
  })
  .then(() => {
    return db.addColumn('databases', 'exportHookContainerPlugin', {
      type: "string",
      notNull: false
    })
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookCommand');
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookTag');
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookImage');
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
