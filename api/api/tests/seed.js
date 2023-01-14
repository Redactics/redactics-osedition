import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Agent, Workflow, RedactRules, RedactRuleset, RedactRulePresets, Input, Datafeed, HelmCmd, Notification } = DB.models;

exports.genSeedData = async function() {
  await Agent.destroy({truncate: true});
  await Workflow.destroy({truncate: true});
  await RedactRules.destroy({truncate: true});
  await RedactRuleset.destroy({truncate: true});
  await RedactRulePresets.destroy({truncate: true});
  await Input.destroy({truncate: true});
  await Datafeed.destroy({truncate: true});
  await HelmCmd.destroy({truncate: true});
  await Notification.destroy({truncate: true});

  await RedactRuleset.create({
    redactKey: "redact_email",
    redactName: "Redact Email"
  });
  await RedactRuleset.create({
    redactKey: "destruction",
    redactName: "Destruction"
  });
  await RedactRuleset.create({
    redactKey: "replacement",
    redactName: "Replacement"
  });
  await RedactRuleset.create({
    redactKey: "random_string",
    redactName: "Random String"
  });

  var redactRuleSets = await RedactRuleset.findAll({});

  var ruleRedactEmail = redactRuleSets.filter(r => {
    return (r.dataValues.redactKey === "redact_email");
  })
  var ruleReplacement = redactRuleSets.filter(r => {
    return (r.dataValues.redactKey === "replacement");
  })
  var ruleRandomString = redactRuleSets.filter(r => {
    return (r.dataValues.redactKey === "random_string");
  })

  const redactEmailPreset = await RedactRulePresets.create({
    ruleId: ruleRedactEmail[0].id,
    isDefault: false,
    presetName: "testRedactEmail",
    redactData: {
      domain: "redactics.com",
      primaryKey: "id",
      prefix: "redacted"
    }
  });

  return {
    redactRuleSets: redactRuleSets,
    redactEmailPreset: redactEmailPreset,
    ruleRedactEmail: ruleRedactEmail[0],
    ruleReplacement: ruleReplacement[0],
    ruleRandomString: ruleRandomString[0],
  }
}

