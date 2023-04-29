//const { app } = require('../app');
import app from "../app"
import request from 'supertest';
const ragent = request.agent(app);

import DB from '../db/sequelize';
const { Input } = DB.models;

const { genSeedData } = require('./seed');
const { genSampleInput } = require('./sample-input');

var sampleInput;

beforeAll(done => {
  process.env.NODE_ENV = 'test';
  done();
})

afterAll(done => {
  done();
});

describe('Inputs endpoints', () => {
  it('apply seed data', async() => {
    await genSeedData();
  })

  it('generate sample input', async() => {
    sampleInput = await genSampleInput('Test Input');
  })

  it('get inputs', async() => {
    const res = await ragent.get('/input')
    expect(res.status).toBe(200);
    //console.log(res.body);

    const findInput = res.body.inputs.find((input) => {
      return (input.inputName === "Test Input")
    })

    expect(findInput.uuid).toEqual(sampleInput.dataValues.uuid);
    expect(findInput.inputType).toEqual("postgresql");
    expect(findInput.diskSize).toEqual(1);
    expect(findInput.enableSSL).toEqual(false);
    expect(findInput.sslMode).toEqual("prefer");
    expect(findInput.exportData).toEqual(true);
    expect(findInput.redacticsGenerated).toEqual(false);
  });

  it('change input to bogus type', async() => {
    const res = await ragent.put('/input')
    .send({
      inputs: [{
        uuid: sampleInput.dataValues.uuid,
        inputName: "Test Input",
        inputType: "bogus",
        diskSize: 1,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "prefer",
      }]
    })
    expect(res.status).toBe(400);
  });

  it('change input to bogus ssl mode', async() => {
    const res = await ragent.put('/input')
    .send({
      inputs: [{
        uuid: sampleInput.dataValues.uuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: 1,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "bogus",
      }]
    })
    expect(res.status).toBe(400);
  });

  it('change input to bogus disk size', async() => {
    const res = await ragent.put('/input')
    .send({
      inputs: [{
        uuid: sampleInput.dataValues.uuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: -1,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "prefer",
      }]
    })
    expect(res.status).toBe(400);
  });

  it('add new input', async() => {
    const res = await ragent.put('/input')
    .send({
      inputs: [{
        uuid: sampleInput.dataValues.uuid,
        inputName: "Test Input",
        inputType: "postgresql",
        diskSize: 1,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "prefer",
        extensionsSchema: "public",
      }, {
        inputName: "New Input",
        inputType: "postgresql",
        diskSize: 2,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "verify-full",
        extensionsSchema: "extensions",
      }]
    })
    expect(res.status).toBe(200);

    const inputs = await Input.findAll({})
    expect(inputs.length).toBe(2);
  })

  it('update existing input, disable existing input', async() => {
    const res = await ragent.put('/input')
    .send({
      inputs: [{
        uuid: sampleInput.dataValues.uuid,
        inputName: "Test Input Updated",
        inputType: "postgresql",
        diskSize: 1,
        enableSSL: false,
        exportData: true,
        redacticsGenerated: false,
        sslMode: "prefer",
      }]
    })
    expect(res.status).toBe(200);

    const updated = await Input.findOne({
      where: {
        inputName: "Test Input Updated"
      }
    })
    expect(updated).toBeDefined();

    const disabled = await Input.findOne({
      where: {
        disabled: true
      }
    })
    expect(disabled.dataValues.inputName).toEqual("New Input");
  });
})
