//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { User, Company, CompanyUser, Cluster, Workflow, RedactRules, RedactRuleset, RedactRulePresets, EmailValidation, Scan, ScanTable, Input, Datafeed, WorkflowJob, Metric, TableFullCopy } = DB.models;
const util = require('util');

const { Op } = require('sequelize');

var redactRuleSets, userId, userUuid, companyId, apiKey, jwtToken, redactRulePresets, clusterId, clusterUuid, workflowId, workflowUuid, workflowWebUuid, workflowWebId, presetReplacement, redactEmailPreset, scan, scanTable, inputId, inputUuid, inputMMUuid, dataFeedUuid, workflowJobUuid, workflowJobId, workflowMMUuid;

const { genSeedData } = require('./seed');

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
    userId = seedData.userId;
    userUuid = seedData.userUuid;
    companyId = seedData.companyId;
    apiKey = seedData.apiKey;
    jwtToken = seedData.jwtToken;
  })

  it('create cluster', async () => {
    const res = await agent.post('/cluster')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      name: "newcluster",
      namespace: "redactics",
      nodeSelector: "default",
      configPath: "~/.redactics/values.yaml"
    })

    clusterUuid = res.body.uuid;
    var cluster = await Cluster.findOne({
      where: {
        name: "newcluster"
      }
    });
    clusterId = cluster.dataValues.id;
  })

  it('create ERL workflow', async() => {
    const res = await agent.post('/workflow')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
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

  it('create ERL workflow - invalid cluster ID', async() => {
    const res = await agent.post('/workflow')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: "e43e2f24-83c0-4f1d-8f34-687578721ebd",
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "blah",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(422);
  });

  it('create ERL Web workflow', async() => {
    const res = await agent.post('/workflow')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      name: "Test Web Workflow",
      workflowType: "multiTenantWebERL",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    expect(res.body.allDatabaseTables.length).toEqual(0);
    expect(res.body.inputs.length).toEqual(1);
    expect(res.body.datafeeds.length).toEqual(1);
    expect(res.body.redactrules.length).toEqual(0);
    expect(res.body.exportTableDataConfig.length).toEqual(0);
    workflowWebUuid = res.body.uuid;

    // validate input
    const workflow = await Workflow.findOne({
      where: {
        uuid: res.body.uuid
      }
    })
    workflowWebId = workflow.dataValues.id;

    const input = await Input.findOne({
      where: {
        inputName: "Sample Input"
      }
    });

    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowWebId
      }
    });

    expect(input.dataValues.workflowId).toEqual(workflow.dataValues.id);
    expect(input.dataValues.inputType).toEqual("postgresql");
    expect(input.dataValues.tables).toEqual(["athletes", "marketing_campaign"]);

    expect(dataFeed.dataValues.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("1.0.1");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("/bin/upload-to-s3 " + workflowWebUuid + " table-athletes.csv,table-marketing_campaign.csv s3://redactics-sample-exports/" + workflowWebUuid);
    expect(dataFeed.dataValues.dataFeedConfig.S3UploadBucket).toEqual("s3://redactics-sample-exports.s3.amazonaws.com");
  });

  it('update ERL workflow - invalid schedule', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
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

  it('update ERL workflow - invalid cluster ID', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: "e43e2f24-83c0-4f1d-8f34-687578721ebd",
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

  it('update ERL workflow - enable forget user feature', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      generateSoftDeleteQueries: true,
      userSearchEmailField: "marketing_campaign.email",
      maskingRules: [],
      inputs: [],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    expect(res.body.workflow.generateSoftDeleteQueries).toEqual(true);
  });

  it('update ERL workflow - invalid workflow ID', async() => {
    const res = await agent.put('/workflow/f1e5456c-89be-49c0-aa27-42af34b6c0f0')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
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

  it('update ERL workflow - add input', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs:[{
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
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

    var input = await Input.findOne({
      where: {
        workflowId: workflowId
      }
    })
    inputId = input.dataValues.id;
    inputUuid = input.dataValues.uuid;

    expect(res.body.updateHelmConfig).toBe(true);
  });

  it('update ERL workflow - update existing input while adding another, test upserting', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "25",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }, {
        inputName: "Test Input 2",
        inputType: "postgresql",
        diskSize: "1",
        enableSSL: false,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    var input = await Input.findOne({
      where: {
        uuid: inputUuid
      }
    })
    expect(input.dataValues.uuid).toEqual(inputUuid);

    input = await Input.findOne({
      where: {
        inputName: "Test Input 2"
      }
    })
    expect(input.dataValues).toBeDefined();
  });

  it('update ERL workflow - valid redaction rules and inputs', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        rule: "destruction"
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [],
      dataFeeds: [],
    })
    .expect(200);

    expect(res.body.workflow.uuid).toEqual(workflowUuid);
  });

  it('update ERL workflow with masking rule preset', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
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

  it('append redaction rules from scanner page - bogus workflow', async() => {
    scan = await Scan.create({
      workflowId: workflowId
    })

    scanTable = await ScanTable.create({
      scanId: scan.dataValues.id,
      tableName: "users",
      inputId: inputId
    })

    const res = await agent.put('/workflow/7b7d1178-9e15-4f81-a4ca-81141e3794ec/appendRedactionRules')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      appendRules: [{
        field: "newfield",
        tableId: scanTable.dataValues.uuid,
        hippaFieldId: "emailAddresses"
      }]
    })
    .expect(403);
  });

  it('append redaction rules from scanner page - existing rule', async() => {
    const res = await agent.put('/workflow/' + workflowUuid + '/appendRedactionRules')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      appendRules: [{
        field: "email",
        tableId: scanTable.dataValues.uuid,
        hippaFieldId: "emailAddresses"
      }]
    })

    var redactRules = await RedactRules.findAll({
      where: {
        workflowId: workflowId
      }
    })

    expect(redactRules.length).toEqual(2);
    expect(res.body.updated).toEqual(true);
    expect(res.body.foundExisting).toEqual(true);
  });

  it('remove existing rule', async() => {
    var removeRule = await RedactRules.destroy({
      where: {
        column: "email",
        workflowId: workflowId
      }
    })

    var redactRules = await RedactRules.findAll({
      where: {
        workflowId: workflowId
      }
    })

    expect(redactRules.length).toEqual(1);
  })

  it('append redaction rules from scanner page - replacement rule', async() => {
    const res = await agent.put('/workflow/' + workflowUuid + '/appendRedactionRules')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      appendRules: [{
        field: "newemail",
        tableId: scanTable.dataValues.uuid,
        hippaFieldId: "emailAddresses"
      }]
    })

    var redactRules = await RedactRules.findAll({
      where: {
        workflowId: workflowId
      }
    })

    expect(redactRules.length).toEqual(2);
    expect(res.body.updated).toEqual(true);
    expect(res.body.foundExisting).toEqual(false);
  });

  it('update ERL workflow with exports', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [],
    });

    var workflow = await Workflow.findOne({
      where: {
        uuid: workflowUuid
      }
    })
    expect(workflow.dataValues.exportTableDataConfig[0].athletes.table).toEqual("athletes");
    expect(workflow.dataValues.exportTableDataConfig[0].marketing_campaign.table).toEqual("marketing_campaign");
  });

  it('update ERL workflow with s3 upload data feed', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
        }
      }],
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
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("1.0.1");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("/bin/upload-to-s3 " + workflowUuid + " table-athletes.csv,table-marketing_campaign.csv s3://bucket");
    expect(dataFeed.dataValues.feedSecrets[0].secretKey).toEqual("credentials");
    expect(dataFeed.dataValues.feedSecrets[0].secretName).toEqual("aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretPath).toEqual("/root/.aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretType).toEqual("volume");
  });

  it('update ERL workflow with digital twin data feed', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {}
      }],
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
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enableDeltaUpdates": true
        }
      }],
    })
    .expect(400);
  });

  it('update ERL workflow with digital twin data feed, delta updates enabled with field provided', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "digitalTwin",
        "dataFeedConfig": {
          "enableDeltaUpdates": true,
          "deltaUpdateField": "updated_at"
        }
      }],
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
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
  });

  it('update ERL workflow with data repository', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "dataRepository",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
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

    expect(dataFeed.dataValues.dataFeedConfig.S3UploadBucket).toEqual("s3://bucket");
    expect(dataFeed.dataValues.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("1.0.1");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("/bin/upload-to-s3 " + workflowUuid + " table-athletes.csv,table-marketing_campaign.csv s3://bucket");
    expect(dataFeed.dataValues.feedSecrets[0].secretKey).toEqual("credentials");
    expect(dataFeed.dataValues.feedSecrets[0].secretName).toEqual("aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretPath).toEqual("/root/.aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretType).toEqual("volume");
  });

  it('test data feed upserting', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "dataRepository",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
        }
      }, {
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
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
        "dataFeed": "dataRepository",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
        }
      },
      {
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
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

  it('update ERL workflow with invalid data repository data feed and column exclusions combo', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": ["email"], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
      dataFeeds: [{
        "dataFeed": "dataRepository",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
        }
      }],
    })
    .expect(400);
  });

  it('update workflow with web ERL workflow', async() => {
    const exportTableDataConfig = [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}];

    const res = await agent.put('/workflow/' + workflowWebUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      name: "Test Web Workflow",
      workflowType: "multiTenantWebERL",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      exportTableDataConfig: exportTableDataConfig,
    })
    .expect(200);
    //console.log(res.body);

    expect(res.body.airflowResponse.conf.currentUser).toEqual(userUuid);
    expect(res.body.airflowResponse.conf.inputs.length).toEqual(1);
    expect(res.body.airflowResponse.conf.inputs[0].tables).toEqual(["athletes", "marketing_campaign"]);
    expect(res.body.airflowResponse.conf.redactRules[0].users.length).toEqual(2);
    expect(res.body.airflowResponse.conf.s3upload.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(res.body.airflowResponse.conf.s3upload.feedSecrets[0].secretName).toEqual("aws");
    expect(res.body.airflowResponse.conf.workflowId).toEqual(workflowWebUuid);
    expect(res.body.airflowResponse.conf.workflowJobId).toBeDefined();
    expect(res.body.airflowResponse.conf.export).toEqual(exportTableDataConfig);
    expect(res.body.airflowResponse.dag_id).toEqual("erl_taskflow_evaluation");
    expect(res.body.redactRuleUuids.length).toEqual(2);

    const workflow = await Workflow.findByPk(workflowWebId);
    var redactRules = await RedactRules.findAll({
      where: {
        workflowId: workflowWebId
      }
    });
    var dataFeed = await Datafeed.findOne({
      where: {
        workflowId: workflowWebId
      }
    })

    expect(workflow.dataValues.exportTableDataConfig[0].athletes.table).toEqual("athletes");
    expect(workflow.dataValues.exportTableDataConfig[0].marketing_campaign.table).toEqual("marketing_campaign");
    expect(redactRules.length).toEqual(2);
    expect(dataFeed.dataValues.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(dataFeed.dataValues.dataFeedConfig.tag).toEqual("1.0.1");
    expect(dataFeed.dataValues.dataFeedConfig.shell).toEqual("/bin/bash");
    expect(dataFeed.dataValues.dataFeedConfig.command).toEqual("/bin/upload-to-s3 " + workflowWebUuid + " table-athletes.csv,table-marketing_campaign.csv s3://redactics-sample-exports/" + workflowWebUuid);
    expect(dataFeed.dataValues.dataFeedConfig.S3UploadBucket).toEqual("s3://redactics-sample-exports.s3.amazonaws.com");
    expect(dataFeed.dataValues.feedSecrets[0].secretKey).toEqual("credentials");
    expect(dataFeed.dataValues.feedSecrets[0].secretName).toEqual("aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretPath).toEqual("/root/.aws");
    expect(dataFeed.dataValues.feedSecrets[0].secretType).toEqual("volume");
  });

  it('create mockDatabaseMigration workflow', async() => {
    const res = await agent.post('/workflow')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration"
    })
    .expect(200);
    workflowMMUuid = res.body.uuid;
  });

  it('update mockDatabaseMigration workflow', async() => {
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration",
      inputs:[{
        inputName: "Test Migration Input",
        inputType: "postgresql",
        enableSSL: true
      }],
      migrationNamespace: "redactics",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics_clone",
      migrationConfiguration: "helmhook",
      migrationHelmHookWeight: -10,
    })
    .expect(200);

    var input = await Input.findOne({
      where: {
        inputName: "Test Migration Input"
      }
    })
    inputMMUuid = input.dataValues.uuid;

    expect(res.body.workflow.migrationNamespace).toBe("redactics");
    expect(res.body.workflow.migrationDatabase).toBe("redactics");
    expect(res.body.workflow.migrationDatabaseClone).toBe("redactics_clone");
    expect(res.body.workflow.migrationConfiguration).toBe("helmhook");
    expect(res.body.workflow.migrationHelmHookWeight).toBe(-10);
  })

  it('update mockDatabaseMigration workflow, test adding existing input', async() => {
    // this tests the saveInputs method, the UI doesn't support this workflow type having
    // multiple input sources
    const res = await agent.put('/workflow/' + workflowMMUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Migration",
      workflowType: "mockDatabaseMigration",
      inputs:[{
        inputName: "Another Input",
        inputType: "postgresql",
        enableSSL: true
      }, {
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        enableSSL: true
      }],
      migrationNamespace: "redactics",
      migrationDatabase: "redactics",
      migrationDatabaseClone: "redactics_clone",
      migrationConfiguration: "helmhook",
      migrationHelmHookWeight: -10,
    })
    .expect(200);

    const workflow = await Workflow.findOne({
      where: {
        uuid: workflowMMUuid
      }
    })

    const inputs = await Input.findAll({
      where: {
        workflowId: workflow.dataValues.id,
        disabled: {
          [Op.not]: true,
        },
      }
    })
    expect(inputs.length).toEqual(2);
  });

  it('get workflows', async() => {
    const res = await agent.get('/workflow')
    .set('Cookie', 'token=' + jwtToken)
    .expect(200);

    expect(res.body.workflows.length).toEqual(3);
    expect(res.body.workflows[0].uuid).toEqual(workflowUuid);
    expect(res.body.workflows[0].name).toEqual("Test Workflow");
    expect(res.body.presets.length).toEqual(4);
    expect(res.body.redactrulesets.length).toEqual(4);
    expect(res.body.agents.length).toEqual(1);
    expect(res.body.agents[0].uuid).toEqual(clusterUuid);
  })

  it('ackException - no-op until we can mock Firebase', async() => {
    const res = await agent
    .put('/workflow/' + workflowUuid + '/ackException')
    .set('Cookie', 'token=' + jwtToken)
    .send({
      exceptionId: "exceptionId"
    })
    .expect(200);
  })

  it('ackAll - no-op until we can mock Firebase', async() => {
    const res = await agent
    .put('/workflow/ackAll')
    .set('Cookie', 'token=' + jwtToken)
    .expect(200);
  })

  it('acknowledge helm reminder', async() => {
    const res = await agent.post('/workflow/ackReminder')
    .set('Cookie', 'token=' + jwtToken)
    .expect(200);

    expect(res.body.ack).toBe(true);
  })
})

describe('Workflow jobs', () => {
  it('create workflow job not associated with a workflow', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .set({'x-api-key': apiKey})
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
    .set({'x-api-key': apiKey})
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

  it('verify updateHelmConfig setting for ERL workflow', async() => {
    const res = await agent.put('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Workflow",
      workflowType: "ERL",
      schedule: "0 0 * * *",
      maskingRules: [{
        databaseTable: "Test Input: users",
        column: "password",
        presetUuid: redactEmailPreset.dataValues.uuid
      }, {
        databaseTable: "Test Input: users",
        column: "email",
        rule: "redact_email"
      }],
      inputs:[{
        uuid: inputUuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: "20",
        enableSSL: true,
        tables: ["athletes", "marketing_campaign"]
      }],
      exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
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
        "dataFeed": "dataRepository",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
        }
      },
      {
        "dataFeed": "s3upload",
        "dataFeedConfig": {
          "S3UploadBucket": "bucket",
          "uploadFileChecked": ["table-athletes.csv","table-marketing_campaign.csv"]
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

    expect(res.body.updateHelmConfig).toBe(false);
  });

  it('create workflow job - missing API key', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .send({
      workflowId: workflowUuid,
      workflowType: "ERL"
    })
    .expect(403);
  });

  it('create workflow job - invalid API key', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .set({'x-api-key': 'c1b0f889-868f-46fb-a1c2-e40fe9f10f8a'})
    .send({
      workflowId: workflowUuid,
      workflowType: "ERL"
    })
    .expect(403);
  });

  it('create workflow job - invalid workflow ID', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .set({'x-api-key': apiKey})
    .send({
      workflowId: "c1b0f889-868f-46fb-a1c2-e40fe9f10f8a",
      workflowType: "ERL"
    })
    .expect(404);
  });

  it('create workflow job - invalid workflow type', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .set({'x-api-key': apiKey})
    .send({
      workflowId: workflowUuid,
      workflowType: "blah"
    })
    .expect(422);
  });

  it('get workflow jobs', async() => {
    const res = await agent
    .get('/workflow/jobs')
    .set('Cookie', 'token=' + jwtToken)
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
    .set('Cookie', 'token=' + jwtToken)
    .expect(200)

    const wfJob = res.body[0];
    expect(wfJob.progress).toEqual(10);
  });

  it('create workflow job for mockDatabaseMigration workflow', async() => {
    const res = await agent
    .post('/workflow/jobs')
    .set({'x-api-key': apiKey})
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Migration Workflow",
      workflowType: "mockDatabaseMigration",
      inputs:[{
        uuid: inputMMUuid,
        inputName: "Test Migration Input",
        inputType: "postgresql",
        enableSSL: true
      }],
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
    .set('Cookie', 'token=' + jwtToken)
    .send({
      clusterId: clusterUuid,
      name: "Test Migration Workflow",
      workflowType: "mockDatabaseMigration",
      inputs:[{
        uuid: inputMMUuid,
        inputName: "Test Migration Input",
        inputType: "postgresql",
        enableSSL: true
      }],
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
  it('get workflow - missing API key', async() => {
    const res = await agent
    .get('/workflow/' + workflowUuid)
    .expect(403);
  })

  it('get workflow - invalid API key', async() => {
    const res = await agent
    .get('/workflow/' + workflowUuid)
    .set({'x-api-key': 'c1b0f889-868f-46fb-a1c2-e40fe9f10f8a'})
    .expect(403);
  })

  it('get workflow - missing workflow', async() => {
    const res = await agent
    .get('/workflow/c1b0f889-868f-46fb-a1c2-e40fe9f10f8a')
    .set({'x-api-key': apiKey})
    .expect(404);
  })

  it('get workflow - unowned workflow', async() => {
    const workflow = await Workflow.findOne({
      where: {
        uuid: workflowUuid,
        companyId: companyId
      }
    });
    workflow.companyId = 999999;
    await workflow.save();

    await agent
    .get('/workflow/' + workflowUuid)
    .set({'x-api-key': apiKey})
    .expect(403);

    workflow.companyId = companyId;
    await workflow.save();
  });

  it('get ERL workflow', async() => {
    const workflow = await agent
    .get('/workflow/' + workflowUuid)
    .set({'x-api-key': apiKey})
    .expect(200);

    expect(workflow.body.id).toEqual(workflowUuid);
    expect(workflow.body.schedule).toEqual("0 0 * * *");
    expect(workflow.body.userSearchEmailField).toEqual("marketing_campaign.email");
    expect(workflow.body.redactRules[0].users.length).toEqual(2);
    expect(workflow.body.export[0].athletes.table).toEqual("athletes");
    expect(workflow.body.export[0].athletes.fields).toEqual([]);
    expect(workflow.body.export[0].marketing_campaign.table).toEqual("marketing_campaign");
    expect(workflow.body.export[0].marketing_campaign.fields).toEqual([]);
    expect(workflow.body.inputs[0].id).toEqual(inputUuid);
    expect(workflow.body.inputs[0].tables).toEqual(["athletes", "marketing_campaign"]);
    expect(workflow.body.dataFeeds[0].custom.dataFeed).toEqual("custom");
    expect(workflow.body.dataFeeds[0].custom.dataFeedConfig.image).toEqual("debian");
    expect(workflow.body.dataFeeds[0].custom.feedSecrets[0].secretKey).toEqual("key");
    expect(workflow.body.dataFeeds[0].dataRepository.dataFeed).toEqual("dataRepository");
    expect(workflow.body.dataFeeds[0].dataRepository.dataFeedConfig.image).toEqual("redactics/postexport-s3upload");
    expect(workflow.body.dataFeeds[0].dataRepository.dataFeedConfig.S3UploadBucket).toEqual("s3://bucket");
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
    .set({'x-api-key': apiKey})
    .expect(200);

    expect(workflow.body.id).toEqual(workflowMMUuid);
    expect(workflow.body.inputs[0].id).toEqual(inputMMUuid);
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
    .set({'x-api-key': apiKey})
    .send({
      exception: "some error",
      stackTrace: "error message details"
    })
    .expect(200);

    expect(res.body.exception).toEqual("some error");
    expect(res.body.stackTrace).toEqual("error message details");
    expect(res.body.status).toEqual("error");
    expect(res.body.currentTaskNum).toEqual(null);
  })

  it('postException - missing API key', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postException')
    .send({
      exception: "some error",
      stackTrace: "error message details"
    })
    .expect(403);
  })

  it('postException - invalid API key', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postException')
    .set({'x-api-key': 'c1b0f889-868f-46fb-a1c2-e40fe9f10f8a'})
    .send({
      exception: "some error",
      stackTrace: "error message details"
    })
    .expect(403);
  })

  it('postException - invalid workflow job ID', async() => {
    const res = await agent
    .put('/workflow/job/4ea29447-fb3b-4db1-a2eb-9a57dc228b56/postException')
    .set({'x-api-key': apiKey})
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
    // save this value for later
    workflowJobId = wfJob.dataValues.id;
    await wfJob.save();
  });

  it('postTaskEnd - progress from queued', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10,
      lastTask: "end-noop"
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

  it('postTaskEnd - missing API key', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(403);
  })

  it('postTaskEnd - invalid API key', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': 'c1b0f889-868f-46fb-a1c2-e40fe9f10f8a'})
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(403);
  })

  it('postTaskEnd - invalid workflow job ID', async() => {
    const res = await agent
    .put('/workflow/job/4ea29447-fb3b-4db1-a2eb-9a57dc228b56/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "applied Redactics redaction rules",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(404);
  })

  it('create some metrics', async() => {
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "tableRows",
      metricValue: 500,
      tableName: "athletes",
      metricMetadata: {
        "copy_status": "init"
      }
    });
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "tableRows",
      metricValue: 500,
      tableName: "marketing_campaign",
      metricMetadata: {
        "copy_status": "init"
      }
    });
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "redactedFields",
      metricValue: 5,
      tableName: "athletes"
    });
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "exportedTable",
      metricValue: 1,
      tableName: "athletes"
    });
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "initialCopies",
      metricValue: 500,
      metricMetadata: ["marketing_campaign"]
    });
    await Metric.create({
      workflowId: workflowId,
      companyId: companyId,
      workflowJobId: workflowJobId,
      runId: 100,
      metricName: "deltaCopies",
      metricValue: 500,
      metricMetadata: ["athletes"]
    });
  });

  it('postTaskEnd - trigger task completion', async() => {
    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.status).toEqual('completed');
    expect(wfJob.dataValues.currentTaskNum).toEqual(null);
    expect(wfJob.dataValues.outputSummary).toMatch(/1000 total rows created or updated, 5 column\(s\) containing PII\/confidential info, 1 table\(s\) exported./)
    expect(wfJob.dataValues.outputMetadata.copySummary[0]).toEqual("Your tables have been created for the first time on a brand new Redactics Agent installation")
    expect(wfJob.dataValues.outputMetadata.copySummary.length).toBe(1);
    expect(wfJob.dataValues.outputMetadata.deltaCopies[0]).toEqual("athletes")
    expect(wfJob.dataValues.outputMetadata.initialCopies[0]).toEqual("marketing_campaign")
    expect(wfJob.dataValues.outputSummary).toMatch(/processed by debian/)
    expect(wfJob.dataValues.outputSummary).toMatch(/uploaded to s3:\/\/bucket/)
    expect(wfJob.dataValues.outputSummary).toMatch(/uploaded to your internal data repository/)
    expect(wfJob.dataValues.outputSummary).toMatch(/uploaded to your internal data repository/)
  });

  it('Update tableRows metric to indicate schema change', async() => {
    let metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "athletes"
      }
    });
    metric.metricMetadata = {
      "copy_status": "schema-change-detected"
    }
    await metric.save();

    metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "marketing_campaign"
      }
    });
    metric.metricMetadata = {
      "copy_status": "schema-change-detected"
    }
    await metric.save();

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.outputMetadata.copySummary[0]).toEqual("A schema change to tables: athletes, marketing_campaign resulted in these tables being recreated from their source");
  })

  it('Update tableRows metric to indicate delta update for one table', async() => {
    let metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "athletes"
      }
    });
    metric.metricMetadata = {
      "copy_status": "delta"
    }
    await metric.save();

    metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "marketing_campaign"
      }
    });
    metric.metricMetadata = {
      "copy_status": "schema-change-detected"
    }
    await metric.save();

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.outputMetadata.copySummary[0]).toEqual("A schema change to tables: marketing_campaign resulted in these tables being recreated from their source");
  })

  it('Update tableRows metric to indicate missing delta update field', async() => {
    let metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "marketing_campaign"
      }
    });
    metric.metricMetadata = {
      "copy_status": "missing-delta-update-field"
    }
    await metric.save();

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.outputMetadata.copySummary[0]).toEqual("Your configuration is missing your \"Updated Date Field Name\" option which is preventing delta updates to your tables");
    expect(wfJob.dataValues.outputMetadata.copySummary.length).toBe(1);
  })

  it('Update tableRows metric to indicate initial copy', async() => {
    let metric = await Metric.findOne({
      where: {
        workflowJobId: workflowJobId,
        metricName: "tableRows",
        tableName: "marketing_campaign"
      }
    });
    metric.metricMetadata = {
      "copy_status": "initial-copy"
    }
    await metric.save();

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });

    expect(wfJob.dataValues.outputMetadata.copySummary[0]).toEqual("marketing_campaign has been created/recreated");
  })

  it('postTaskEnd - web ERL output links', async() => {
    await WorkflowJob.update({
      workflowType: "multiTenantWebERL"
    }, {
      where: {
        uuid: workflowJobUuid
      }
    })

    const res = await agent
    .put('/workflow/job/' + workflowJobUuid + '/postTaskEnd')
    .set({'x-api-key': apiKey})
    .send({
      task: "end-noop",
      totalTaskNum: 10,
      lastTask: "end-noop"
    })
    .expect(200);

    const wfJob = await WorkflowJob.findOne({
      where: {
        uuid: workflowJobUuid
      }
    });
    expect(wfJob.dataValues.outputLinks.includes("https://redactics-sample-exports.s3.amazonaws.com/" + workflowUuid + "/table-athletes.csv")).toEqual(true);
    expect(wfJob.dataValues.outputLinks.includes("https://redactics-sample-exports.s3.amazonaws.com/" + workflowUuid + "/table-marketing_campaign.csv")).toEqual(true);
  });

  it('markFullCopy - missing API key', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .send({
      inputId: inputUuid,
      tableName: "athletes"
    })
    .expect(403);
  })

  it('markFullCopy - invalid API key', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .set({'x-api-key': 'c1b0f889-868f-46fb-a1c2-e40fe9f10f8a'})
    .send({
      inputId: inputUuid,
      tableName: "athletes"
    })
    .expect(403);
  })

  it('markFullCopy - invalid input ID', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .set({'x-api-key': apiKey})
    .send({
      inputId: "c1b0f889-868f-46fb-a1c2-e40fe9f10f8a",
      tableName: "athletes"
    })
    .expect(404);
  })

  it('markFullCopy - initial', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .set({'x-api-key': apiKey})
    .send({
      inputId: inputUuid,
      tableName: "athletes"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findOne({
      where: {
        inputId: inputId,
        tableName: "athletes"
      }
    });
    expect(fullCopy.dataValues).toBeDefined();
  });

  it('markFullCopy - prevent duplicate', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .set({'x-api-key': apiKey})
    .send({
      inputId: inputUuid,
      tableName: "athletes"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findAll({
      where: {
        inputId: inputId,
        tableName: "athletes"
      }
    });
    expect(fullCopy.length).toEqual(1);
  });

  it('markFullCopy - second', async() => {
    const res = await agent
    .put('/workflow/markFullCopy')
    .set({'x-api-key': apiKey})
    .send({
      inputId: inputUuid,
      tableName: "marketing_campaign"
    })
    .expect(200);

    const fullCopy = await TableFullCopy.findAll({
      where: {
        inputId: inputId
      }
    });
    expect(fullCopy.length).toEqual(2);
  });
})

describe('Disable', () => {
  it('delete workflow', async() => {
    const res = await agent.delete('/workflow/' + workflowUuid)
    .set('Cookie', 'token=' + jwtToken)
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
    .set('Cookie', 'token=' + jwtToken)

    expect(res.status).toBe(200);
    const workflow = res.body.workflows.find(d => {
      return (d.uuid === workflowUuid);
    });
    expect(workflow).toBeUndefined();
  });
})