import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Input } = DB.models;

exports.genSampleInput = async function(inputName) {
  let sampleInput = await Input.create({
    inputName: inputName,
    inputType: "postgresql",
    diskSize: 1,
    enableSSL: false,
    exportData: true,
    redacticsGenerated: false,
    sslMode: "prefer",
    extensionsSchema: "public",
  });

  return sampleInput;
}

