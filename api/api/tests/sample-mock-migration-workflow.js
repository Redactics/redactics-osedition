import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Workflow, WorkflowInput } = DB.models;

exports.genSampleMockMigrationWorkflow = async function(agentId, name, inputs) {
  let sampleWorkflow = await Workflow.create({
    workflowType: "mockDatabaseMigration",
    name: name,
    agentId: agentId,
    migrationNamespace: "redactics",
    migrationDatabase: "redactics",
    migrationDatabaseClone: "redactics_clone",
    migrationConfiguration: "helmhook"
  });

  let workflowInputPromises = [];
  inputs.forEach((input) => {
    workflowInputPromises.push(WorkflowInput.create({
      workflowId: sampleWorkflow.dataValues.id,
      inputId: input.id,
      tables: [],
      enabled: true,
    }))
  });

  await Promise.all(workflowInputPromises);

  return sampleWorkflow;
}

