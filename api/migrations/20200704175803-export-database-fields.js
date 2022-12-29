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
  return db.addColumn('databases', 'exportSingleSchema', {
    type: "boolean",
    notNull: false
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportSingleDump', {
      type: "boolean",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableSchema', {
      type: "boolean",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableSchemaVal', {
      type: "string",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableSchemaConfig', {
      type: "jsonb",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableData', {
      type: "boolean",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableDataVal', {
      type: "string",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableDataConfig', {
      type: "jsonb",
      notNull: false
    })
  })
  .then(function(resutls) {
    return db.addColumn('databases', 'exportTableDataExtractConfig', {
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
