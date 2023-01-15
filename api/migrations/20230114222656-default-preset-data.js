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
  return db.runSql("INSERT into redactrulepresets (\"ruleId\", \"isDefault\", \"presetName\", \"redactData\")  SELECT id, true, 'default-redactemail', '{\"domain\": \"redactics.com\", \"prefix\": \"redacted\", \"primaryKey\": \"id\"}' from redactrulesets WHERE \"redactKey\" = 'redact_email'")
  .then(() => {
    return db.runSql("INSERT into redactrulepresets (\"ruleId\", \"isDefault\", \"presetName\", \"redactData\")  SELECT id, true, 'default-replacement', '{\"replacement\": \"redacted\"}' from redactrulesets WHERE \"redactKey\" = 'replacement'")
  })
  .then(() => {
    return db.runSql("INSERT into redactrulepresets (\"ruleId\", \"isDefault\", \"presetName\", \"redactData\")  SELECT id, true, 'default-randomstring', '{\"chars\": \"10\"}' from redactrulesets WHERE \"redactKey\" = 'random_string'")
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};