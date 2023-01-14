import app from "../app";
import request from 'supertest';
const agent = request.agent(app);

import DB from '../db/sequelize';
const { Workflow, WorkflowInput } = DB.models;

exports.genSampleERLWorkflow = async function(agentId, name, inputs) {
  let sampleWorkflow = await Workflow.create({
    workflowType: "ERL",
    name: name,
    agentId: agentId,
    schedule: "* 5 * * *",
    exportTableDataConfig: [{"athletes": {"table": "athletes", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "marketing_campaign": {"table": "marketing_campaign", "fields": [], "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
  });

  let workflowInputPromises = [];
  inputs.forEach((input) => {
    workflowInputPromises.push(WorkflowInput.create({
      workflowId: sampleWorkflow.dataValues.id,
      inputId: input.id,
      tables: ["marketing_campaign", "athletes"],
      enabled: true,
    }))
  });

  await Promise.all(workflowInputPromises);

  return sampleWorkflow;
}

