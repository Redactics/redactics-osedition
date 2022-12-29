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
  return db.removeColumn('databases', 'exportSingleSchema')
  .then(() => {
    return db.removeColumn('databases', 'exportSingleDump')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableSchema')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableSchemaVal')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableSchemaConfig')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableData')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableDataVal')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportTableDataExtractConfig')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookOption')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookContainerConfig')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookContainerPlugin')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookPluginConfig')
  })
  .then(() => {
    return db.removeColumn('databases', 'exportHookSecrets')
  })
  .then(() => {
    return db.removeColumn('databases', 'sampleDatabase')
  })
  .then(() => {
    return db.removeColumn('databases', 'enableSSL')
  })
  .then(() => {
    return db.removeColumn('databases', 'diskSize')
  })
  .then(() => {
    return db.removeColumn('databases', 'version')
  })
  .then(() => {
    return db.removeColumn('databases', 'type')
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
