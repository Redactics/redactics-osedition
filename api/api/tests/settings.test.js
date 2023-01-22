//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { RedactRulePresets } = DB.models;
const util = require('util');

var redactRuleSets, redactRulePresets, ruleRedactEmail, ruleReplacement, ruleRandomString, presetReplacement, newRedactEmail, newReplacement;

const { genSeedData } = require('./seed');

beforeAll(done => {
  process.env.NODE_ENV = 'test';
  done();
})

afterAll(done => {
  done();
});

describe('Settings endpoints', () => {
  it('apply seed data', async() => {
    var seedData = await genSeedData();
    redactRuleSets = seedData.redactRuleSets;
    ruleRedactEmail = seedData.ruleRedactEmail;
    ruleReplacement = seedData.ruleReplacement;
    ruleRandomString = seedData.ruleRandomString;
  })

  it('get settings - no custom presets', async () => {
    const res = await agent.get('/settings')

    expect(res.status).toBe(200);

    // verify default presets for each redact rule have been created
    var searchRedactEmail = res.body.defaults.filter(d => {
      return d.rule === "redact_email"
    });
    var searchReplacement = res.body.defaults.filter(d => {
      return d.rule === "replacement"
    });
    var searchRandomString = res.body.defaults.filter(d => {
      return d.rule === "random_string"
    });
    expect(searchRedactEmail.length).toBe(1);
    expect(searchReplacement.length).toBe(1);
    expect(searchRandomString.length).toBe(1);

    expect(searchRedactEmail[0].isDefault).toBe(true);
    expect(searchRedactEmail[0].redactData.domain).toBe("redactics.com");
    expect(searchRedactEmail[0].redactData.prefix).toBe("redacted");
    expect(searchRedactEmail[0].redactData.primaryKey).toBe("id");

    expect(searchReplacement[0].isDefault).toBe(true);
    expect(searchReplacement[0].redactData.replacement).toBe("redacted");

    expect(searchRandomString[0].isDefault).toBe(true);
    expect(searchRandomString[0].redactData.chars).toBe("10");

    // verify rulesets have been outputted
    var searchRedactEmail = res.body.rulesets.filter(d => {
      return d.redactKey === "redact_email"
    });
    var searchReplacement = res.body.rulesets.filter(d => {
      return d.redactKey === "replacement"
    });
    var searchRandomString = res.body.rulesets.filter(d => {
      return d.redactKey === "random_string"
    });
    expect(searchRedactEmail.length).toBe(1);
    expect(searchReplacement.length).toBe(1);
    expect(searchRandomString.length).toBe(1);
  })

  it('save settings: rule defaults', async () => {
    var payload = [{
      "uuid": ruleRedactEmail.uuid,
      "redactData": {
        "prefix": "removed",
        "primaryKey": "uuid",
        "domain": "gmail.com"
      }
    }, {
      "uuid": ruleReplacement.uuid,
      "redactData": {
        "replacement": "removed"
      }
    }, {
      "uuid": ruleRandomString.uuid,
      "redactData": {
        "chars": "20"
      }
    }]

    const res = await agent.put('/settings/saveRuleDefaults')
    .send(payload)

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);
  })

  it('save settings: new custom preset', async () => {
    var payload = [{
      key: "new1",
      rule: "redact_email",
      presetName: "newRedactEmail",
      redactData: {
        prefix: "test",
        primaryKey: "id",
        domain: "company.com"
      }
    }];

    const res = await agent.post('/settings/presets')
    .send(payload)

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);

    var rule = await RedactRulePresets.findOne({
      where: {
        presetName: "newRedactEmail"
      }
    })
    expect(rule.dataValues.ruleId).toBe(ruleRedactEmail.id);
    expect(rule.dataValues.uuid).toBeDefined();
    expect(rule.dataValues.presetName).toBe("newRedactEmail");
    expect(rule.dataValues.isDefault).toBe(false);
    expect(rule.dataValues.redactData.prefix).toBe("test");
    expect(rule.dataValues.redactData.primaryKey).toBe("id");
    expect(rule.dataValues.redactData.domain).toBe("company.com");

  })

  it('save settings: multiple new custom presets', async () => {
    var payload = [{
      key: "new1",
      rule: "redact_email",
      presetName: "newRedactEmail2",
      redactData: {
        prefix: "test",
        primaryKey: "id",
        domain: "company.com"
      }
    }, {
      key: "new2",
      rule: "replacement",
      presetName: "newReplacement2",
      redactData: {
        replacement: "test"
      }
    }];

    const res = await agent.post('/settings/presets')
    .send(payload)

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);

    var rule = await RedactRulePresets.findOne({
      where: {
        presetName: "newRedactEmail2"
      }
    })
    newRedactEmail = rule.dataValues;
    expect(rule.dataValues.ruleId).toBe(ruleRedactEmail.id);

    var rule = await RedactRulePresets.findOne({
      where: {
        presetName: "newReplacement2"
      }
    })
    newReplacement = rule.dataValues;
    expect(rule.dataValues.ruleId).toBe(ruleReplacement.id);
  })

  it('save settings: update a custom preset', async () => {
    var payload = [{
      uuid: newRedactEmail.uuid,
      key: newRedactEmail.uuid,
      rule: "redact_email",
      presetName: "newRedactEmailUpdate",
      redactData: {
        prefix: "testing",
        primaryKey: "id",
        domain: "redactics.com"
      }
    }];

    const res = await agent.post('/settings/presets')
    .send(payload)

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);

    var rule = await RedactRulePresets.findOne({
      where: {
        uuid: newRedactEmail.uuid
      }
    })
    expect(rule.dataValues.presetName).toBe("newRedactEmailUpdate");
    expect(rule.dataValues.redactData.prefix).toBe("testing");
  })

  it('save settings: delete a custom preset', async () => {
    var payload = [{
      uuid: newRedactEmail.uuid,
      key: "delete1",
      rule: "redact_email",
      presetName: "newRedactEmailUpdate",
      redactData: {
        prefix: "testing",
        primaryKey: "id",
        domain: "redactics.com"
      }
    }];

    const res = await agent.post('/settings/presets')
    .send(payload)

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(true);

    var rule = await RedactRulePresets.findOne({
      where: {
        uuid: newRedactEmail.uuid
      }
    })
    expect(rule).toBe(null);
  })

})
