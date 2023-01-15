//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const ragent = request.agent(app);

import DB from '../db/sequelize';
const { Notification } = DB.models;

const { genSeedData } = require('./seed');
const { genSampleInput } = require('./sample-input');
const { genSampleAgent } = require('./sample-agent');
const { genSampleERLWorkflow } = require('./sample-erl-workflow');

var sampleAgent, sampleWorkflow, sampleInput, heartNotif, exceptionNotif;

beforeAll(done => {
  process.env.NODE_ENV = 'test';
  done();
})

afterAll(done => {
  done();
});

describe('Notifications endpoints', () => {
  it('apply seed data', async() => {
    await genSeedData();
  })

  it('create sample input', async() => {
    sampleInput = await genSampleInput("Test Input");
  })

  it('create sample agent', async() => {
    sampleAgent = await genSampleAgent("Test Agent", [sampleInput]);
  })

  it('create sample workflow', async() => {
    sampleWorkflow = await genSampleERLWorkflow(sampleAgent.dataValues.id, "Test Workflow", [sampleInput]);
  })

  it('create first heartbeat notification', async() => {
    await Notification.create({
      acked: false,
      agentId: sampleAgent.dataValues.id,
      firstHeartbeat: true
    })
  });

  it('create first workflow notification', async() => {
    await Notification.create({
      acked: false,
      workflowId: sampleWorkflow.dataValues.id,
      exception: "exception",
      stackTrace: "stack trace"
    })
  });

  it('get notifications', async() => {
    const res = await ragent.get('/notification')
    expect(res.status).toBe(200);
    //console.log(res.body);

    heartNotif = res.body.notifications.find((notif) => {
      return (notif.firstHeartbeat)
    })
    exceptionNotif = res.body.notifications.find((notif) => {
      return (notif.exception)
    })
    expect(heartNotif.agentName).toEqual("Test Agent");
    expect(heartNotif.acked).toEqual(false);
    expect(heartNotif.firstHeartbeat).toEqual(true);
    expect(heartNotif.agentId).toEqual(sampleAgent.dataValues.uuid);

    expect(exceptionNotif.acked).toEqual(false);
    expect(exceptionNotif.workflowName).toEqual("Test Workflow");
    expect(exceptionNotif.exception).toEqual("exception");
    expect(exceptionNotif.stackTrace).toEqual("stack trace");
    expect(exceptionNotif.workflowId).toEqual(sampleWorkflow.dataValues.uuid);
  });

  it('ack exeption', async() => {
    const res = await ragent.put('/notification/' + exceptionNotif.uuid + '/ackException')
    expect(res.status).toBe(200);

    const notif = await Notification.findOne({
      where: {
        exception: "exception"
      }
    });
    expect(notif.dataValues.acked).toEqual(true);
  });

  it('ack all', async() => {
    const res = await ragent.put('/notification/ackAll')
    expect(res.status).toBe(200);

    const notif = await Notification.findOne({
      where: {
        acked: false
      }
    });
    expect(!notif);
  });

})
