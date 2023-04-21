//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Workflow, WorkflowInput, RedactRules, RedactRuleset, RedactRulePresets, EmailValidation, Scan, ScanTable, Input, Datafeed, WorkflowJob, Notification, TableFullCopy } = DB.models;
const util = require('util');

const { Op } = require('sequelize');

var redactRuleSets, sampleInput, sampleInput2, sampleAgent, workflowInputs, maskingRules, exportTableDataConfig, s3DataFeed, digitalTwinDataFeed, redactRulePresets, agentId, agentUuid, workflowId, workflowUuid, workflowWebUuid, workflowWebId, presetReplacement, redactEmailPreset, scan, scanTable, inputId, inputUuid, inputMMUuid, dataFeedUuid, workflowJobUuid, workflowJobId, workflowMMUuid;

const { genSeedData } = require('./seed');
const { genSampleInput } = require('./sample-input');
const { genSampleAgent } = require('./sample-agent');

beforeAll(done => {
  process.env.NODE_ENV = 'test';
  done();
})

afterAll(done => {
  done();
});

describe('Workflow endpoints', () => {
  it('apply seed data', async() => {
    var seedData = await genSeedData();
    redactRuleSets = seedData.redactRuleSets;
    redactEmailPreset = seedData.redactEmailPreset;
  })

  it('create sample inputs', async () => {
    sampleInput = await genSampleInput('Test Input');
    sampleInput2 = await genSampleInput('Test Input2');
  });

  it('create sample agent', async () => {
    sampleAgent = await genSampleAgent('Test Agent', [sampleInput]);
    agentUuid = sampleAgent.dataValues.uuid;
    agentId = sampleAgent.dataValues.id;
  })

  it('create ERL workflow', async() => {
    const res = await agent.post('/workflow')
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    expect(res.body.allDatabaseTables.length).toEqual(0);
    expect(res.body.inputs.length).toEqual(0);
    expect(res.body.datafeeds.length).toEqual(0);
    expect(res.body.redactrules.length).toEqual(0);
    expect(res.body.exportTableDataConfig.length).toEqual(0);
    workflowUuid = res.body.uuid;
  });

  it('create ERL workflow - invalid agent ID', async() => {
    const res = await agent.post('/workflow')
    .send({
      agentId: "e43e2f24-83c0-4f1d-8f34-687578721ebd",
      name: "Test Workflow",
      workflowType: "ERL",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(404);
  });

  it('create invalid workflow type', async() => {
    const res = await agent.post('/workflow')
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "blah",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(422);
  });

  it('update ERL workflow - invalid schedule', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "blah",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(422);
  });

  it('update ERL workflow - invalid agent ID', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: "e43e2f24-83c0-4f1d-8f34-687578721ebd",
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(404);
  });

  it('update ERL workflow - invalid workflow ID', async() => {
    const res = await agent.put('/workflow/f1e5456c-89be-49c0-aa27-42af34b6c0f0')
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(404);
  });

  it('update ERL workflow - add invalid input', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs: {
        uuid: "f1e5456c-89be-49c0-aa27-42af34b6c0f0",
        enabled: true,
        tables: ["public.athletes", "public.marketing_campaign"]
      },
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(400);
  });

  it('update ERL workflow - add input', async() => {
    workflowInputs = [{
      uuid: sampleInput.dataValues.uuid,
      enabled: true,
      tables: ["public.marketing_campaign", "public.athletes", "public.marketing_campaign"], // assure de-duplication and sorting
    }];

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs: workflowInputs,
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    var workflow = await Workflow.findOne({
      where: {
        uuid: workflowUuid
      }
    })
    workflowId = workflow.dataValues.id;

    var wfInput = await WorkflowInput.findOne({
      where: {
        workflowId: workflowId
      }
    })
    expect(wfInput).toBeDefined();
    expect(wfInput.dataValues.enabled).toEqual(true);
    expect(wfInput.dataValues.inputId).toEqual(sampleInput.dataValues.id);
    expect(wfInput.dataValues.workflowId).toEqual(workflowId);
    expect(wfInput.dataValues.tables).toEqual(["public.athletes", "public.marketing_campaign"]);
  });

  it('update ERL workflow - valid redaction rules and inputs', async() => {
    maskingRules = [{
      databaseTable: "Test Input",
      schema: "public",
      table: "users",
      column: "password",
      rule: "destruction"
    }, {
      databaseTable: "Test Input",
      schema: "public",
      table: "users",
      column: "email",
      rule: "redact_email"
    }]

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    expect(res.body.workflow.uuid).toEqual(workflowUuid);
  });

  it('update ERL workflow with masking rule preset', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input",
        schema: "public",
        table: "users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input",
        schema: "public",
        table: "users",
        column: "email",
        rule: "redact_email"
      }],
      inputs: workflowInputs,
      exportTableDataConfig: [],
      dataFeeds: []
    })
    .expect(200);

    expect(res.body.workflow.uuid).toEqual(workflowUuid);

    var redactRule = await RedactRules.findOne({
      where: {
        presetId: redactEmailPreset.dataValues.id
      }
    })
    expect(redactRule.dataValues).toBeDefined();
  });

  it('update ERL workflow with exports', async() => {
    exportTableDataConfig = [{"public.athletes": {"table": "public.athletes", "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}, {"public.marketing_campaign": {"table": "public.marketing_campaign", "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}];

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [],
    });

    var workflow = await Workflow.findOne({
      where: {
        uuid: workflowUuid
      }
    })
    expect(workflow.dataValues.exportTableDataConfig[0]["public.athletes"].table).toEqual("public.athletes");
    expect(workflow.dataValues.exportTableDataConfig[1]["public.marketing_campaign"].table).toEqual("public.marketing_campaign");
  });

  it('update ERL workflow with s3 upload data feed', async() => {
    s3DataFeed = [{
      "dataFeed": "s3upload",
      "dataFeedConfig": {
        "S3UploadBucket": "bucket"
      }
    }];

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: s3DataFeed,
    })
    .expect(200);

    // verify data feed record was created successfully
    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId
      }
    })

    expect(dataFeed.dataValues.dataFeedConfig.S3UploadBucket).toEqual("s3://bucket");
    expect(dataFeed.dataValues.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("1.1.0");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("/bin/upload-to-s3 " + workflowUuid + " s3://bucket");
    expect(dataFeed.dataValues.feedSecrets[0].secretKey).toEqual("credentials");
    expect(dataFeed.dataValues.feedSecrets[0].secretName).toEqual("aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretPath).toEqual("/root/.aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretType).toEqual("volume");
  });

  it('update ERL workflow with digital twin data feed', async() => {
    digitalTwinDataFeed = {
      "dataFeed": "digitalTwin",
      "dataFeedConfig": {}
    };

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [digitalTwinDataFeed],
    })
    .expect(200);

    // verify data feed record was created successfully with connection Id
    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId
      }
    })
  
    expect(dataFeed.dataValues.dataFeed).toEqual("digitalTwin");
  });

  it('update ERL workflow with digital twin data feed, delta updates enabled with no field provided', async() => {
    digitalTwinDataFeed.dataFeedConfig.enableDeltaUpdates = true;

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [digitalTwinDataFeed],
    })
    .expect(400);
  });

  it('update ERL workflow with digital twin data feed, delta updates enabled with field provided', async() => {
    digitalTwinDataFeed.dataFeedConfig.deltaUpdateField = "updated_at";

    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [digitalTwinDataFeed],
    })
    .expect(200);

    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId
      }
    })
  
    expect(dataFeed.dataValues.dataFeedConfig.deltaUpdateField).toEqual("updated_at");
  });

  it('update ERL workflow with digital twin data feed, post update prepared statements enabled with no fields provided', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [{
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enablePostUpdatePreparedStatements": true
        }
      }],
    })
    .expect(400);
  });

  it('update ERL workflow with digital twin data feed, post update prepared statements enabled with fields provided', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [{
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enablePostUpdatePreparedStatements": true,
          "postUpdateKeyValues": [{
            "key": "company",
            "value": "ACME"
          }]
        }
      }],
    })
    .expect(200);

    // verify data feed record was created successfully, and there is only one datafeed for the workflow
    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId
      }
    })
    dataFeedUuid = dataFeed.dataValues.uuid;
  });

  it('test data feed upserting', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [{
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket"
        }
      }, {
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enableDeltaUpdates": true,
          "deltaUpdateField": "updated_at",
          "enablePostUpdatePreparedStatements": true,
          "postUpdateKeyValues": [{
            "key": "company",
            "value": "ACME"
          }]
        }
      }],
    })
    .expect(200);

    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId,
        uuid: dataFeedUuid
      }
    })   
    expect(dataFeed.dataValues).toBeDefined()
  });

  it('update ERL workflow with custom data feed', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .send({
      agentId: agentUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: maskingRules,
      inputs: workflowInputs,
      exportTableDataConfig: exportTableDataConfig,
      dataFeeds: [{
        "dataFeed": "custom",
        "dataFeedConfig": {
          "image": "debian",
          "tag": "12",
          "args": "args",
          "command": "command",
          "shell": "/bin/bash"
        },
        feedSecrets: [{
          "secretKey": "key",
          "secretName": "name",
          "secretPath": "/path/to/something",
          "secretType": "volume"
        }, {
          "secretKey": "key",
          "secretName": "name",
          "envName": "ENV_VAR",
          "secretType": "env"
        }]
      },
      {
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket"
        }
      }, {
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enableDeltaUpdates": true,
          "deltaUpdateField": "updated_at",
          "enablePostUpdatePreparedStatements": true,
          "postUpdateKeyValues": [{
            "key": "company",
            "value": "ACME"
          }]
        }
      }],
    })
    .expect(200);

    // verify data feed record was created successfully
    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowId,
        dataFeed: "custom"
      }
    })

    expect(dataFeed.dataValues.dataFeedConfig.image).toEqual("debian");
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("12");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("command");
    expect(dataFeed.dataValues.dataFeedConfig.args).toEqual("args");
    expect(dataFeed.dataValues.feedSecrets[0].secretKey).toEqual("key");
    expect(dataFeed.dataValues.feedSecrets[0].secretName).toEqual("name");
    expect(dataFeed.dataValues.feedSecrets[0].secretPath).toEqual("/path/to/something");
    expect(dataFeed.dataValues.feedSecrets[0].secretType).toEqual("volume");
    expect(dataFeed.dataValues.feedSecrets[1].secretKey).toEqual("key");
    expect(dataFeed.dataValues.feedSecrets[1].secretName).toEqual("name");
    expect(dataFeed.dataValues.feedSecrets[1].envName).toEqual("ENV_VAR");
    expect(dataFeed.dataValues.feedSecrets[1].secretType).toEqual("env");
  });

  it('create mockDatabaseMigration workflow', async() => {
    const res = await agent.post('/workflow')
    .send({
      agentId: agentUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration"
    })
    .expect(200);
    workflowMMUuid = res.body.uuid;
  });

  it('assure mockDatabaseMigration valid database clone name', async() => {
    // database and database clone names match
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .send({
      agentId: agentUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration",
      inputs: workflowInputs,
      migrationNamespace: "redactics",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics",
      migrationConfiguration: "helmhook",
      migrationHelmHookWeight: -10,
    })
    .expect(400);
  });

  it('update mockDatabaseMigration workflow', async() => {
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .send({
      agentId: agentUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration",
      inputs: workflowInputs,
      migrationNamespace: "redactics",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics_clone",
      migrationConfiguration: "helmhook",
      migrationHelmHookWeight: -10,
    })
    .expect(200);

    expect(res.body.workflow.migrationNamespace).toBe("redactics");
    expect(res.body.workflow.migrationDatabase).toBe("redactics");
    expect(res.body.workflow.migrationDatabaseClone).toBe("redactics_clone");
    expect(res.body.workflow.migrationConfiguration).toBe("helmhook");
    expect(res.body.workflow.migrationHelmHookWeight).toBe(-10);
  })

  xit('test attaching multiple inputs to mockDatabaseMigration workflow', async() => {

  })

  it('get workflows', async() => {
    const res = await agent.get('/workflow')
    .expect(200);

    expect(res.body.workflows.length).toEqual(2);
    expect(res.body.workflows[0].uuid).toEqual(workflowUuid);
    expect(res.body.workflows[0].name).toEqual("Test Workflow");
    expect(res.body.workflows[0].inputs[0].enabled).toEqual(true);
    expect(res.body.workflows[0].inputs[0].inputName).toEqual('Test Input');
    expect(res.body.workflows[0].inputs[0].tables).toEqual(['public.athletes', 'public.marketing_campaign']);
    // assure output data source options exclude configured inputs
    expect(res.body.workflows[0].allOutputs.length).toEqual(1);
    expect(res.body.workflows[0].allOutputs[0].uuid).toEqual(sampleInput2.dataValues.uuid);
    expect(res.body.presets.length).toEqual(4);
    expect(res.body.redactrulesets.length).toEqual(4);
    expect(res.body.agents.length).toEqual(1);
    expect(res.body.agents[0].uuid).toEqual(agentUuid);
    expect(res.body.agentInputs.length).toEqual(1);
    expect(res.body.agentInputs[0].inputName).toEqual('Test Input');
    expect(res.body.agentInputs[0].uuid).toEqual(sampleInput.dataValues.uuid);
    expect(res.body.agentInputs[0].redacticsGenerated).toEqual(false);
  })
})

it('ERL workflows should skip inputs with no tables', async() => {
  await WorkflowInput.update({
    tables: []
  }, {
    where: {
      inputId: sampleInput.dataValues.id
    }
  });

  const res = await agent.get('/workflow')
  .expect(200);

  expect(!res.body.workflows[0].inputs.length);
});

it('ERL workflows should skip disabled inputs', async() => {
  await WorkflowInput.update({
    tables: ["public.athletes", "public.marketing_campaign"]
  }, {
    where: {
      inputId: sampleInput.dataValues.id
    }
  });

  await Input.update({
    disabled: true
  }, {
    where: {
      uuid: sampleInput.dataValues.uuid
    }
  });

  const res = await agent.get('/workflow')
  .expect(200);

  expect(!res.body.workflows[0].inputs.length);
  expect(!res.body.agentInputs.length);

  // re-enable input
  await Input.update({
    disabled: false
  }, {
    where: {
      uuid: sampleInput.dataValues.uuid
    }
  });
});

it('ERL workflows should skip disabled workflow inputs', async() => {
  await WorkflowInput.update({
    enabled: false
  }, {
    where: {
      inputId: sampleInput.dataValues.id
    }
  });

  const res = await agent.get('/workflow')
  .expect(200);

  expect(!res.body.workflows[0].inputs.length);
  expect(!res.body.agentInputs.length);

  // re-enable workflow input
  await WorkflowInput.update({
    enabled: true
  }, {
    where: {
      inputId: sampleInput.dataValues.id
    }
  });
});

describe('Workflow jobs', () => {
  it('create workflow job not associated with a workflow', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowType: "ERL"
    })
    .expect(200);

    expect(res.body.workflowId).toEqual(null);
    expect(res.body.workflowType).toEqual("ERL");
    expect(res.body.status).toEqual("queued");
    expect(res.body.currentTaskNum).toEqual(0);
  });

  it('create workflow job for ERL workflow', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowId: workflowUuid,
      workflowType: "ERL"
    })
    .expect(200);

    workflowJobUuid = res.body.uuid;

    expect(res.body.workflowId).toEqual(workflowUuid);
    expect(res.body.workflowType).toEqual("ERL");
    expect(res.body.status).toEqual("queued");
    expect(res.body.currentTaskNum).toEqual(0);
  });

  it('create workflow job - invalid workflow ID', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowId: "c1b0f889-868f-46fb-a1c2-e40fe9f10f8a",
      workflowType: "ERL"
    })
    .expect(404);
  });

  it('create workflow job - invalid workflow type', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowId: workflowUuid,
      workflowType: "blah"
    })
    .expect(422);
  });

  it('get workflow jobs', async() => {
    const res = await agent
    .get('/workflow/jobs')
    .expect(200)

    const wfJob = res.body[0];
    expect(wfJob.uuid).toBeDefined();
    expect(wfJob.workflowName).toEqual('Test Workflow');
    expect(wfJob.workflowId).toEqual(workflowUuid);
    expect(wfJob.status).toEqual('queued');
    expect(wfJob.workflowType).toEqual('ERL');
  });

  it('set job progress', async() => {
    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    })
    wfJob.totalTaskNum = 10;
    wfJob.currentTaskNum = 1;
    await wfJob.save();
  });

  it('get workflow jobs - check for job progress', async() => {
    const res = await agent
    .get('/workflow/jobs')
    .expect(200)

    const wfJob = res.body[0];
    expect(wfJob.progress).toEqual(10);
  });

  it('create workflow job for mockDatabaseMigration workflow', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowId: workflowMMUuid,
      workflowType: "mockDatabaseMigration"
    })
    .expect(200);

    expect(res.body.workflowId).toEqual(workflowMMUuid);
    expect(res.body.workflowType).toEqual("mockDatabaseMigration");
    expect(res.body.status).toEqual("queued");
    expect(res.body.currentTaskNum).toEqual(0);
  });

  it('verify updateHelmConfig setting for mockDatabaseMigration workflow', async() => {
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .send({
      agentId: agentUuid,
      name: "Test Migration Workflow",
      workflowType: "mockDatabaseMigration",
      inputs: workflowInputs,
      migrationNamespace: "redactics",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics_clone",
      migrationHelmHookWeight: -10,
    })
    .expect(200);

    expect(res.body.updateHelmConfig).toBe(false);
  });

  it('verify updateHelmConfig setting for mockDatabaseMigration workflow after changing namespace', async() => {
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .send({
      agentId: agentUuid,
      name: "Test Migration Workflow",
      workflowType: "mockDatabaseMigration",
      inputs: workflowInputs,
      migrationNamespace: "redacticsnew",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics_clone",
      migrationHelmHookWeight: -10,
    })
    .expect(200);

    expect(res.body.updateHelmConfig).toBe(true);
  });
});

describe('Workflow endpoints invoked by Agent', () => {
  it('get workflow - missing workflow', async() => {
    const res = await agent
    .get('/workflow/c1b0f889-868f-46fb-a1c2-e40fe9f10f8a')
    .expect(404);
  })

  it('get ERL workflow', async() => {
    const workflow = await agent
    .get('/workflow/' + workflowUuid)
    .expect(200);

    expect(workflow.body.id).toEqual(workflowUuid);
    expect(workflow.body.schedule).toEqual("0 0 * * *");
    expect(workflow.body.redactRules[0]["public.users"].length).toEqual(2);
    expect(workflow.body.export[0]["public.athletes"].table).toEqual("public.athletes");
    expect(workflow.body.export[1]["public.marketing_campaign"].table).toEqual("public.marketing_campaign");
    expect(workflow.body.inputs[0].id).toEqual(sampleInput.dataValues.uuid);
    expect(workflow.body.inputs[0].tables).toEqual(["public.athletes", "public.marketing_campaign"]);
    expect(workflow.body.dataFeeds[0].custom.dataFeed).toEqual("custom");
    expect(workflow.body.dataFeeds[0].custom.dataFeedConfig.image).toEqual("debian");
    expect(workflow.body.dataFeeds[0].custom.feedSecrets[0].secretKey).toEqual("key");
    expect(workflow.body.dataFeeds[0].s3upload.dataFeed).toEqual("s3upload");
    expect(workflow.body.dataFeeds[0].s3upload.dataFeedConfig.image).toEqual("redactics/postexport-s3upload"); 
    expect(workflow.body.dataFeeds[0].digitalTwin.dataFeedConfig.enableDeltaUpdates).toEqual(true); 
    expect(workflow.body.dataFeeds[0].digitalTwin.dataFeedConfig.deltaUpdateField).toEqual("updated_at"); 
    expect(workflow.body.dataFeeds[0].digitalTwin.dataFeedConfig.enablePostUpdatePreparedStatements).toEqual(true); 
    expect(workflow.body.dataFeeds[0].digitalTwin.dataFeedConfig.postUpdateKeyValues["company"]).toEqual("ACME");
  });

  it('get mockDatabaseMigration workflow', async() => {
    const workflow = await agent
    .get('/workflow/' + workflowMMUuid)
    .expect(200);

    expect(workflow.body.id).toEqual(workflowMMUuid);
    expect(workflow.body.inputs[0].id).toEqual(sampleInput.dataValues.uuid);
    expect(workflow.body.migrationDatabase).toEqual("redactics");
    expect(workflow.body.migrationDatabaseClone).toEqual("redactics_clone");
  })

  it('postException', async() => {
    var wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });
    wfJob.currentTaskNum = 10;
    await wfJob.save();

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postException')
    .send({
      exception: "some error",
      stackTrace: "error message details"
    })
    .expect(200);

    expect(res.body.exception).toEqual("some error");
    expect(res.body.stackTrace).toEqual("error message details");
    expect(res.body.status).toEqual("error");
    expect(res.body.currentTaskNum).toEqual(null);

    // verify notification
    const notif = await Notification.findOne({
      where: {
        exception: "some error"
      }
    });
    expect(notif.dataValues.acked).toEqual(false);
    expect(notif.dataValues.stackTrace).toEqual("error message details");
    expect(notif.dataValues.workflowId).toEqual(workflowId);
  })

  it('postException - invalid workflow job ID', async() => {
    const res = await agent
    .put('/workflow/job/4ea29447-fb3b-4db1-a2eb-9a57dc228b56/postException')
    .send({
      exception: "some error",
      stackTrace: "error message details"
    })
    .expect(404);
  })

  it('reset workflow job to queued', async() => {
    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    })
    wfJob.status = "queued";
    wfJob.exception = "";
    wfJob.stackTrace = "";
    await wfJob.save();
  });

  it('postTaskEnd - progress from queued', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10,
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    })

    expect(wfJob.dataValues.currentTaskNum).toEqual(1);
    expect(wfJob.dataValues.totalTaskNum).toEqual(10);
    expect(wfJob.dataValues.lastTask).toEqual("applied Redactics redaction rules");
    expect(wfJob.dataValues.lastTaskEnd).toBeDefined();
    expect(wfJob.dataValues.status).toEqual("inProgress");
  })

  it('postTaskEnd - invalid workflow job ID', async() => {
    const res = await agent
    .put('/workflow/job/4ea29447-fb3b-4db1-a2eb-9a57dc228b56/postTaskEnd')
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10
    })
    .expect(404);
  })

  it('postJobEnd - invalid workflow job ID', async() => {
    const res = await agent
    .put('/workflow/job/4ea29447-fb3b-4db1-a2eb-9a57dc228b56/postJobEnd')
    .expect(404);
  })

  it('postJobEnd', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postJobEnd')
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.status).toEqual('completed');
    expect(wfJob.dataValues.currentTaskNum).toEqual(null);
    expect(wfJob.dataValues.exception).toEqual("");
    expect(wfJob.dataValues.stackTrace).toEqual("");
    expect(wfJob.dataValues.outputSummary).toMatch(/replicated to your digital twin database/);
    expect(wfJob.dataValues.outputSummary).toMatch(/uploaded to s3:\/\/bucket/);
    expect(wfJob.dataValues.outputSummary).toMatch(/processed by debian/);
  })

  it('markFullCopy - invalid input ID', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .send({
      inputId: "c1b0f889-868f-46fb-a1c2-e40fe9f10f8a",
      tableName: "public.athletes"
    })
    .expect(404);
  })

  it('markFullCopy - initial', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .send({
      inputId: sampleInput.dataValues.uuid,
      tableName: "public.athletes"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findOne({
      where: {
        inputId: sampleInput.dataValues.id,
        tableName: "public.athletes"
      }
    });
    expect(fullCopy.dataValues).toBeDefined();
  });

  it('markFullCopy - prevent duplicate', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .send({
      inputId: sampleInput.dataValues.uuid,
      tableName: "public.athletes"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findAll({
      where: {
        inputId: sampleInput.dataValues.id,
        tableName: "public.athletes"
      }
    });
    expect(fullCopy.length).toEqual(1);
  });

  it('markFullCopy - second', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .send({
      inputId: sampleInput.dataValues.uuid,
      tableName: "public.marketing_campaign"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findAll({
      where: {
        inputId: sampleInput.dataValues.id
      }
    });
    expect(fullCopy.length).toEqual(2);
  });
})

describe('Disable', () => {
  it('delete workflow', async() => {
    const res = await agent.delete('/workflow/' + workflowUuid)
    .expect(200);

    expect(res.body.deleted).toBe(true);

    var workflow = await Workflow.findOne({
      where: {
        uuid: workflowUuid
      }
    })
    expect(workflow.dataValues.disabled).toBe(true);
  })

  it('confirm workflow is no longer being returned in listings', async () => {
    const res = await agent.get('/workflow')

    expect(res.status).toBe(200);
    const workflow = res.body.workflows.find(d => {
      return (d.uuid === workflowUuid);
    });
    expect(workflow).toBeUndefined();
  });
})