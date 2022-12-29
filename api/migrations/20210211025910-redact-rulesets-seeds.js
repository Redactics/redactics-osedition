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
  return db.insert('redactrulesets', ['redactKey', 'redactName'], ['redact_email', 'Redact Email'])
  .then(function() {
    return db.insert('redactrulesets', ['redactKey', 'redactName'], ['destruction', 'Destruction'])
  })
  .then(function() {
    return db.insert('redactrulesets', ['redactKey', 'redactName'], ['replacement', 'Replacement'])
  })
  .then(function() {
    return db.insert('redactrulesets', ['redactKey', 'redactName'], ['random_string', 'Random String'])
  })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
