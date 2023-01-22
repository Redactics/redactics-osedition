import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Agent, AgentInput } = DB.models;

exports.genSampleAgent = async function(agentName, inputs) {
  let sampleAgent = await Agent.create({
    name: agentName,
    namespace: "redactics",
    fernetKey: "key",
    generatedAirflowDBPassword: "password",
    generatedAirflowAPIPassword: "password",
    webserverKey: "key"
  });

  if (inputs && inputs.length) {
    let agentInputPromises = [];
    inputs.forEach((input) => {
      agentInputPromises.push(AgentInput.create({
        inputId: input.dataValues.id,
        agentId: sampleAgent.dataValues.id
      }))
    });

    await Promise.all(agentInputPromises);
  }

  return sampleAgent;
}

