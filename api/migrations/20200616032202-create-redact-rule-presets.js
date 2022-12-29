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
  return db.createTable('redactrulepresets', {
    id: { type: 'serial', primaryKey: true },
    uuid: { type: "uuid", notNull: true, defaultValue: new String('uuid_generate_v4()') },
    ruleId: { type: 'int', notNull: true },
    isDefault: 'boolean'
  });
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
