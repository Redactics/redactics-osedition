//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const ragent = request.agent(app);

import DB from '../db/sequelize';
const { Agent, AgentInput, Workflow, RedactRules, RedactRuleset, HelmCmd, Input, Notification } = DB.models;
const util = require('util');

var sampleInput, sampleInput2, fernetKey, webserverKey, agentId, agentUuid, workflowId, workflowUuid, inputId, inputUuid, redactRuleSets, helmCmdUuid, redactRulePresets, workflowUuid, presetReplacement, redactEmailPreset, generatedAirflowDBPassword, generatedAirflowAPIPassword, dataFeedUuid, migrationWorkflow;

const { genSeedData } = require('./seed');
const { genSampleInput } = require('./sample-input');
const { genSampleERLWorkflow } = require('./sample-erl-workflow');
const { genSampleMockMigrationWorkflow } = require('./sample-mock-migration-workflow');

beforeAll(done => {
  process.env.NODE_ENV = 'test';
  done();
})

afterAll(done => {
  done();
});

describe('Agent endpoints', () => {
  it('apply seed data', async() => {
    var seedData = await genSeedData();
    redactRuleSets = seedData.redactRuleSets;
    redactEmailPreset = seedData.redactEmailPreset;
  })

  it('create sample inputs', async() => {
    sampleInput = await genSampleInput("Test Input");
    sampleInput2 = await genSampleInput("Test Input 2");
  })

  it('create agent with no inputs', async () => {
    const res = await ragent.post('/agent')
    .send({
      name: "emptyagent",
      namespace: "redactics",
      nodeSelector: "nodePool.agent",
      configPath: "~/.redactics/values.yaml"
    })
    expect(res.status).toBe(200);
    
    agentUuid = res.body.uuid;
  })

  it('get helm cmd, confirm no http NAS disk allocation', async () => {
    const res = await ragent
    .get('/agent/' + agentUuid + '/helmCmd')
    expect(res.status).toBe(200);
    
    expect(res.body.helmArgs.postgresql.persistence.enabled).toEqual(true);
    expect(res.body.helmArgs.postgresql.persistence.size).toEqual(5);
    expect(res.body.helmArgs.httpNas.persistence.enabled).toEqual(false);
    expect(!res.body.helmArgs.httpNas.persistence.size);
  });

  it('create agent with inputs', async () => {
    const res = await ragent.post('/agent')
    .send({
      name: "newagent",
      namespace: "redactics",
      nodeSelector: "nodePool.agent",
      configPath: "~/.redactics/values.yaml",
      inputs: [sampleInput.dataValues.uuid, sampleInput2.dataValues.uuid]
    })

    agentUuid = res.body.uuid;
    expect(res.body.name).toEqual("newagent");
    expect(res.body.namespace).toEqual("redactics");
    expect(res.body.nodeSelector).toEqual("nodePool.agent");
    expect(res.body.configPath).toEqual("~/.redactics/values.yaml");
    expect(res.body.fernetKey).toBeDefined();
    expect(res.body.webserverKey).toBeDefined();
    expect(res.body.generatedAirflowDBPassword).toBeDefined();
    expect(res.body.generatedAirflowAPIPassword).toBeDefined();
    fernetKey = res.body.fernetKey;
    webserverKey = res.body.webserverKey;
    generatedAirflowDBPassword = res.body.generatedAirflowDBPassword;
    generatedAirflowAPIPassword = res.body.generatedAirflowAPIPassword;

    var agent = await Agent.findOne({
      where: {
        name: "newagent"
      }
    });
    agentId = agent.dataValues.id;
    expect(agentId).toBeGreaterThan(0);

    var agentInputs = await AgentInput.findAll({
      where: {
        agentId: agentId
      }
    });
    expect(agentInputs.length).toEqual(2);
  })

  it('update agent with bogus input', async () => {
    const res = await ragent.put('/agent/' + agentUuid)
    .send({
      name: "newagentUpdate",
      namespace: "redactics",
      nodeSelector: "nodePool.agent",
      configPath: "~/.redactics/values.yaml",
      inputs: ["blah"]
    });
    expect(res.status).toBe(403);
  });

  it('update agent', async () => {
    const res = await ragent.put('/agent/' + agentUuid)
    .send({
      name: "newagentUpdate",
      namespace: "redactics",
      nodeSelector: "nodePool.agent",
      configPath: "~/.redactics/values.yaml",
      inputs: [sampleInput.dataValues.uuid]
    });

    expect(res.status).toBe(200);

    var agent = await Agent.findOne({
      where: {
        uuid: agentUuid
      }
    });
    expect(agent).toBeDefined();
    expect(agent.dataValues.name).toEqual("newagentUpdate");

    var agentInputs = await AgentInput.findAll({
      where: {
        agentId: agentId
      }
    });
    expect(agentInputs.length).toEqual(1);
    expect(agentInputs[0].dataValues.agentId).toEqual(agentId);
    expect(agentInputs[0].dataValues.inputId).toEqual(sampleInput.dataValues.id);
  })

  it('get agents', async () => {
    const res = await ragent.get('/agent')

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.find(c => {
      return (c.uuid === agentUuid)
    })).toBeDefined();
  });

  it('get helm cmd, confirm disk sizes and other updated settings', async () => {
    const res = await ragent
    .get('/agent/' + agentUuid + '/helmCmd')
    expect(res.status).toBe(200);
    console.log("HELM CMD")
    console.log(util.inspect(res.body, false, null, true));

    // get helm command
    const helmCmd = await HelmCmd.findOne({
      where: {
        agentId: agentId
      }
    })
    helmCmdUuid = helmCmd.dataValues.uuid;

    expect(res.body.helmArgs.agentId).toEqual(agentUuid);
    expect(res.body.helmArgs.namespace).toEqual("redactics");
    expect(res.body.helmArgs.nodeSelector).toEqual("nodePool.agent");
    expect(res.body.helmArgs.helmCmd).toEqual(helmCmdUuid);
    expect(res.body.helmArgs.lastAgentVersion).toEqual(null);
    expect(res.body.helmArgs.latestChartVersion).toEqual(process.env.LATEST_CHART_VERSION);
    expect(res.body.helmArgs.agentUpgradeAvailable).toEqual(false);
    expect(res.body.helmArgs.postgresql.persistence.enabled).toEqual(true);
    expect(res.body.helmArgs.postgresql.persistence.size).toEqual(6); // 1 GB + 5 GB buffer for Airflow data
    expect(res.body.helmArgs.httpNas.persistence.enabled).toEqual(true);
    expect(res.body.helmArgs.httpNas.persistence.size).toEqual(3);
  });

  it('verify helmCmd creation', async() => {
    const helmCmd = await HelmCmd.findOne({
      where: {
        uuid: helmCmdUuid
      }
    })

    // verify completeCmd was generated
    expect(helmCmd.dataValues.agentId).toEqual(agentId);
  })

  it('test for helm repo update', async () => {
    await Agent.update({
      lastAgentVersion: "1.0.0"
    }, {
      where: {
        uuid: agentUuid
      }
    });

    const res = await ragent
    .get('/agent/' + agentUuid + '/helmCmd')
    
    expect(res.body.helmArgs.lastAgentVersion).toEqual("1.0.0");
    expect(res.body.helmArgs.agentUpgradeAvailable).toEqual(true);
  });

  it('get helm config', async() => {
    const res = await ragent
    .get('/agent/' + agentUuid + '/helmConfig')
    expect(res.status).toBe(200);

    console.log("HELM CONFIG")
    console.log(util.inspect(res.body, false, null, true));
    expect(res.body.helmArgs.airflow.fernetKey).toEqual(fernetKey);
    expect(res.body.helmArgs.airflow.webserverSecretKey).toEqual(webserverKey);
    expect(res.body.helmArgs.airflow.connections.length).toEqual(2);
    expect(res.body.helmArgs.airflow.connections[0].id).toEqual(sampleInput.dataValues.uuid);
    expect(res.body.helmArgs.airflow.connections[0].type).toEqual("postgres");
    expect(res.body.helmArgs.airflow.connections[0].host).toEqual("changeme");
    expect(res.body.helmArgs.airflow.connections[0].port).toEqual(5432);
    expect(res.body.helmArgs.airflow.connections[0].login).toEqual("changeme");
    expect(res.body.helmArgs.airflow.connections[0].password).toBeDefined();
    expect(res.body.helmArgs.airflow.connections[0].schema).toEqual("changeme");
    expect(res.body.helmArgs.airflow.connections[1].id).toEqual("redacticsDB");
    expect(res.body.helmArgs.airflow.connections[1].type).toEqual("postgres");
    expect(res.body.helmArgs.airflow.connections[1].host).toEqual("agent-postgresql");
    expect(res.body.helmArgs.airflow.connections[1].port).toEqual(5432);
    expect(res.body.helmArgs.airflow.connections[1].login).toEqual("postgres");
    expect(res.body.helmArgs.airflow.connections[1].password).toEqual(generatedAirflowDBPassword);
    expect(res.body.helmArgs.airflow.connections[1].schema).toEqual("redactics_tmp");
    expect(res.body.helmArgs.postgresql.connection).toEqual("postgresql://postgres:" + generatedAirflowDBPassword +"@agent-postgresql:5432/postgres");
  });

  it('create migration mocking workflow to test updated helm config', async() => {
    migrationWorkflow = await genSampleMockMigrationWorkflow(agentId, "testmigration", [sampleInput]);
  });

  it('get helm config to check for migration mocking config', async() => {
    const res = await ragent
    .get('/agent/' + agentUuid + '/helmConfig')
    expect(res.status).toBe(200);

    const basicAuth = Buffer.from(`redactics:${generatedAirflowAPIPassword}`).toString('base64');

    console.log("HELM CONFIG")
    console.log(util.inspect(res.body, false, null, true));
    expect(res.body.helmArgs.webserver.enabled).toBe(true);
    expect(res.body.helmArgs.webserver.defaultUser.enabled).toBe(true);
    expect(res.body.helmArgs.webserver.defaultUser.role).toBe("User");
    expect(res.body.helmArgs.webserver.defaultUser.username).toBe("redactics");
    expect(res.body.helmArgs.webserver.defaultUser.email).toBe("redactics");
    expect(res.body.helmArgs.webserver.defaultUser.firstName).toBe("redactics");
    expect(res.body.helmArgs.webserver.defaultUser.lastName).toBe("redactics");
    expect(res.body.helmArgs.webserver.defaultUser.password).toBe(generatedAirflowAPIPassword);
    expect(res.body.helmArgs.redactics.basicAuth).toBe(basicAuth);
    expect(res.body.helmArgs.redactics.migrationNamespaces).toEqual(["redactics"]);
  });

  it('create additional input source', async() => {
    await genSampleInput("Additional input")
  });

  it('get helm config, assure that input is not mapped to agent', async() => {
    const res = await ragent
    .get('/agent/' + agentUuid + '/helmConfig')
    expect(res.status).toBe(200);

    expect(res.body.helmArgs.airflow.connections.length).toEqual(2);
  });

  it('test agent heartbeat - initial contact', async() => {
    const res = await ragent
    .put('/agent/' + agentUuid + '/heartbeat')
    .send({
      agentVersion: '1.0.0'
    })

    expect(res.status).toBe(200);
    var agent = await Agent.findOne({
      where: {
        uuid: agentUuid
      }
    })
    expect(agent.dataValues.agentInstallationDate).toBeDefined();
    expect(agent.dataValues.lastAgentVersion).toEqual('1.0.0');

    // confirm that notification has been created
    const notif = await Notification.findOne({
      where: {
        firstHeartbeat: true
      }
    })
    expect(notif.dataValues.agentId).toEqual(agentId);
    expect(notif.dataValues.acked).toEqual(false);
  })

  it('test agent heartbeat - via Helm post-upgrade hook', async() => {
    const res = await ragent
    .put('/agent/' + agentUuid + '/heartbeat')
    .send({
      agentVersion: '1.0.0',
      helmCmd: helmCmdUuid
    })

    expect(res.status).toBe(200);
    var agent = await Agent.findOne({
      where: {
        uuid: agentUuid
      }
    });

    var helmCmd = await HelmCmd.findOne({
      where: {
        uuid: helmCmdUuid
      }
    })

    expect(agent.dataValues.agentInstallationDate).toBeDefined();
    expect(agent.dataValues.lastHeartBeatDate).toBeDefined();
    expect(agent.dataValues.lastAgentVersion).toEqual('1.0.0');
    expect(helmCmd.dataValues.heartbeat).toEqual(true);

    // ensure heartbeat is only recorded once
    const notif = await Notification.findAll({
      where: {
        firstHeartbeat: true
      }
    })
    expect(notif.length).toEqual(1);
  })

  it('delete agent', async () => {
    const res = await ragent
    .delete('/agent/' + agentUuid)
    expect(res.status).toBe(200);

    var agent = await Agent.findOne({
      where: {
        uuid: agentUuid
      }
    });
    expect(agent.dataValues.disabled).toEqual(true)
  })

  it('confirm agent is no longer being returned in listings', async () => {
    const res = await ragent.get('/agent')

    expect(res.status).toBe(200);
    const agent = res.body.find(c => {
      return (c.uuid === agentUuid);
    });
    expect(agent).toBeUndefined();
  });

})
