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
    exportTableDataConfig: [{"public.athletes": {"table": "public.athletes", "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}, "public.marketing_campaign": {"table": "public.marketing_campaign", "numDays": null, "sampleFields": null, "createdAtField": null, "updatedAtField": null}}],
  });

  if (inputs && inputs.length) {
    let workflowInputPromises = [];
    inputs.forEach((input) => {
      workflowInputPromises.push(WorkflowInput.create({
        workflowId: sampleWorkflow.dataValues.id,
        inputId: input.dataValues.id,
        tables: ["public.marketing_campaign", "public.athletes"],
        enabled: true,
      }))
    });

    await Promise.all(workflowInputPromises);
  }

  return sampleWorkflow;
}

