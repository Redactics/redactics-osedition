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
  return db.addColumn('databases', 'exportHookOption', {
    type: "string",
    notNull: false
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportHookImage', {
      type: "string",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportHookTag', {
      type: "string",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportHookCommand', {
      type: "string",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportHookSecrets', {
      type: "jsonb",
      notNull: false
    })
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
