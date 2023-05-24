import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Agent, Workflow, RedactRules, RedactRuleset, RedactRulePresets, Input, Datafeed, HelmCmd, Notification, TableFullCopy, WorkflowInput } = DB.models;

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
  await TableFullCopy.destroy({truncate: true});
  await WorkflowInput.destroy({truncate: true});

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

  var ruleRedactEmail = redactRuleSets.find(r => {
    return (r.dataValues.redactKey === "redact_email");
  })
  var ruleReplacement = redactRuleSets.find(r => {
    return (r.dataValues.redactKey === "replacement");
  })
  var ruleRandomString = redactRuleSets.find(r => {
    return (r.dataValues.redactKey === "random_string");
  })

  const redactEmailPreset = await RedactRulePresets.create({
    ruleId: ruleRedactEmail.id,
    isDefault: false,
    presetName: "testRedactEmail",
    redactData: {
      domain: "redactics.com",
      prefix: "redacted"
    }
  });

  // set defaults
  await RedactRulePresets.create({
    ruleId: ruleRedactEmail.id,
    isDefault: true,
    presetName: "default-redactemail",
    redactData: {
      domain: "redactics.com",
      prefix: "redacted"
    }
  });
  await RedactRulePresets.create({
    ruleId: ruleReplacement.id,
    isDefault: true,
    presetName: "default-replacement",
    redactData: {
      replacement: "redacted"
    }
  });
  await RedactRulePresets.create({
    ruleId: ruleRandomString.id,
    isDefault: true,
    presetName: "default-randomstring",
    redactData: {
      chars: "10"
    }
  });

  return {
    redactRuleSets: redactRuleSets,
    redactEmailPreset: redactEmailPreset,
    ruleRedactEmail: ruleRedactEmail,
    ruleReplacement: ruleReplacement,
    ruleRandomString: ruleRandomString,
  }
}

