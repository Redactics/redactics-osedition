import { Request, Response } from 'express';
import fetch from 'node-fetch';
import Workflow from '../models/workflow';
import logger from '../config/winston';
import sequelize from '../db/sequelize';
import {
  RedacticsRequest, WorkflowCreate, WorkflowUpdate, AirflowException, OutputMetadata,
  TaskStart, RedactRuleRecord, InputRecord, WorkflowInputRecord, WorkflowJobRecord, WorkflowJobListEntry,
} from '../types/redactics';

// models
import Input from '../models/input';
import DataFeed from '../models/datafeed';
import RedactRule from '../models/redactrule';
import RedactRuleset from '../models/redactruleset';
import RedactRulePreset from '../models/redactrulepreset';
import Agent from '../models/agent';
import AgentInput from '../models/agentinput';
import WorkflowInput from '../models/workflowinput';
import WorkflowJob from '../models/workflowjob';
import TableFullCopy from '../models/tablefullcopy';

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

function getApiKey(req: Request) {
  if (req.headers['x-api-key']) {
    return req.headers['x-api-key'];
  }
  return '';
}

export async function getWorkflows(req: RedacticsRequest, res: Response) {
  try {
    let redactrulesets = await RedactRuleset.findAll({});
    // type indexedArray
    const redactrules: { [key: number]: string } = {};

    redactrulesets.forEach((c: any) => {
      redactrules[c.id] = c.redactKey;
    });

    let presets = await RedactRulePreset.findAll({
      where: {
        companyId: req.currentUser.companyId,
      },
    });
    // type indexedArray
    const presetrules: { [key: number]: string } = {};

    presets.forEach((p: any) => {
      presetrules[p.id] = p.uuid;
    });
   
    let workflows = await Workflow.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
        companyId: req.currentUser.companyId,
      },
      order: [
        ['createdAt', 'ASC'],
      ],
      include: ['redactrules', 'inputs', 'datafeeds'],
    });

    let agents = await Agent.findAll({
      where: {
        companyId: req.currentUser.companyId,
        disabled: {
          [Op.not]: true,
        },
      },
    });
    // type indexedArray
    const agentIds: { [key: number]: string } = {};
    const agentIdKeys:number[] = [];
    const agentNames: { [key: number]: string } = {};

    agents = agents.map((agent: any) => {
      const a = agent;
      agentIds[a.dataValues.id] = a.dataValues.uuid;
      agentIdKeys.push(a.dataValues.id);
      agentNames[a.dataValues.id] = a.dataValues.name;
      delete a.dataValues.id;
      delete a.dataValues.companyId;

      return a.dataValues;
    });

    let allInputs = await Input.findAll({
      where: {
        companyId: req.currentUser.companyId,
        disabled: {
          [Op.not]: true,
        },
      }
    })

    let agentInputs = await AgentInput.findAll({
      where: {
        agentId: {
          [Op.in]: agentIdKeys,
        },
      }
    });

    redactrulesets = redactrulesets.map((rs: any) => {
      const r = rs;
      delete r.dataValues.id;

      return r.dataValues;
    });

    presets = presets.map((ps: any) => {
      const p = ps;
      delete p.dataValues.id;
      delete p.dataValues.companyId;
      p.dataValues.rule = redactrules[p.dataValues.ruleId];
      delete p.dataValues.ruleId;

      return p.dataValues;
    });

    workflows = workflows.map((db: any) => {
      const d = db;
      const { agentId } = d.dataValues;
      delete d.dataValues.id;
      delete d.dataValues.companyId;
      // replace with UUID
      d.dataValues.agentId = agentIds[agentId];
      // attach agent name for display purposes
      d.dataValues.agentName = agentNames[agentId];
      d.dataValues.redactrules.map((rr: any) => {
        const r = rr;
        delete r.dataValues.id;
        delete r.dataValues.workflowId;
        delete r.dataValues.companyId;
        r.dataValues.presetUuid = presetrules[r.dataValues.presetId];
        if (r.dataValues.presetUuid) {
          // format ruleset key as a preset
          r.dataValues.rule = `preset-${r.dataValues.presetUuid}`;
        } else {
          r.dataValues.rule = redactrules[r.dataValues.ruleId];
        }
        delete r.dataValues.ruleId;
        delete r.dataValues.presetId;

        return r.dataValues;
      });
      const allDatabaseTables:string[] = [];
      d.dataValues.inputs = d.dataValues.inputs.map((input: any) => {
        const wi = input;
        const inputData = allInputs.find((i: any) => {
          return (i.dataValues.id === wi.dataValues.inputId)
        });
        if (inputData) {
          wi.dataValues.inputName = inputData.dataValues.inputName;
          wi.dataValues.uuid = inputData.dataValues.uuid;
        }
        if (wi.dataValues.tables && wi.dataValues.tables.length) {
          wi.dataValues.tables.forEach((t:string) => {
            allDatabaseTables.push(`${wi.dataValues.inputName}: ${t}`);
          });
        }
        else {
          wi.dataValues.tables = [];
        }
        delete wi.dataValues.id;
        delete wi.dataValues.inputId;
        delete wi.dataValues.workflowId;
        return wi.dataValues;
      });
      d.dataValues.allDatabaseTables = allDatabaseTables;

      d.dataValues.datafeeds = d.dataValues.datafeeds.filter((df: any) => (
        !(df.dataValues.disabled))).map((datafeed: any) => {
        const df = datafeed;
        delete df.dataValues.id;
        delete df.dataValues.workflowId;

        return df.dataValues;
      });

      return d.dataValues;
    });

    agentInputs = agentInputs.map((ai:any) => {
      const i = ai;
      const inputData = allInputs.find((i: any) => {
        return (i.dataValues.id === ai.dataValues.inputId)
      });
      if (inputData) {
        i.dataValues.inputName = inputData.dataValues.inputName;
        i.dataValues.uuid = inputData.dataValues.uuid;
      }
      delete i.dataValues.id;
      delete i.dataValues.agentId;
      delete i.dataValues.inputId;

      return i.dataValues;
    });

    res.send({
      workflows,
      presets,
      redactrulesets,
      agents,
      agentInputs,
    });
  } catch (e) {
    logger.error(e.stack);
    res.status(500).send(e);
  }
}

export async function getWorkflow(req: RedacticsRequest, res: Response) {
  try {
    const workflow = await Workflow.findOne({
      where: {
        uuid: req.params.uuid,
        disabled: {
          [Op.not]: true,
        },
      },
      include: ['redactrules', 'inputs', 'datafeeds'],
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'invalid workflow ID' });
    }

    const workflowInputs = await WorkflowInput.findAll({
      where: {
        workflowId: workflow.dataValues.id
      },
      include: [Input]
    });

    const allRedactRuleSets = await RedactRuleset.findAll({});
    const allRedactRules = await RedactRule.findAll({});
    const allRedactRulePresets = await RedactRulePreset.findAll({});

    // build inputs
    const inputs:any = [];
    const inputIds:number[] = [];

    workflowInputs.forEach((i:any) => {
      inputIds.push(i.dataValues.Input.id);
    });

    const allFullCopies = await TableFullCopy.findAll({
      where: {
        inputId: {
          [Op.in]: inputIds,
        }
      }
    });

    workflowInputs.forEach((i:any) => {
      const fullCopies:string[] = [];
      allFullCopies.forEach((c:any) => {
        if (c.dataValues.inputId === i.dataValues.Input.id) {
          fullCopies.push(c.dataValues.tableName);
        }
      })

      inputs.push({
        id: i.dataValues.Input.dataValues.uuid,
        tables: i.dataValues.tables,
        fullcopies: fullCopies,
      });
    });

    // build redact rules
    const rules = allRedactRules.filter((r:any) => (
      r.dataValues.workflowId === workflow.dataValues.id
    ));
    const redactRules:any = [];

    Object.values(rules).forEach((r:any) => {
      let preset;

      // see if there is already a rule for current table, append columns if there is
      const tableSearch = redactRules.find((rule:any) => Object.keys(rule)[0] === r.table);
      const rule:any = tableSearch || {};
      if (!rule[r.table]) {
        rule[r.table] = [];
      }
      const column:any = {};
      const ruleset = allRedactRuleSets.find((p:any) => (p.dataValues.id === r.ruleId));

      if (r.presetId) {
        preset = allRedactRulePresets.find((p:any) => (p.dataValues.id === r.presetId));
      } else {
        // get default data
        preset = allRedactRulePresets.find((p:any) => (p.dataValues.isDefault
          && p.dataValues.ruleId === r.ruleId));

        if (preset) {
          preset = preset.dataValues;
        } else {
          // no default value saved to DB, provide default
          switch (ruleset.redactKey) {
            case 'replacement':
              preset = {
                redactData: {
                  replacement: 'redacted',
                },
              };
              break;

            case 'redact_email':
              preset = {
                redactData: {
                  domain: 'redactics.com',
                  prefix: 'redacted',
                  primaryKey: 'id',
                },
              };
              break;

            case 'random_string':
              preset = {
                redactData: {
                  chars: '25',
                },
              };
              break;

            default:
              preset = {
                redactData: {},
              };
              break;
          }
        }
      }

      column[r.column] = { rule: ruleset.redactKey, ...preset.redactData };

      rule[r.table].push(column);
      if (!tableSearch) {
        // prevent duplicate table entries
        redactRules.push(rule);
      }
    });

    // build dataFeeds
    const dataFeeds:any = {};
    workflow.dataValues.datafeeds.filter((i:any) => (!(i.disabled))).forEach((feed:any) => {
      const df:any = feed;
      // drop UI fields unused by the Agent
      if (df.dataValues.dataFeed === 's3upload' || df.dataValues.dataFeed === 'dataRepository') {
        delete df.dataValues.dataFeedConfig.addAllS3Uploads;
        delete df.dataValues.dataFeedConfig.uploadFileChecked;
        delete df.dataValues.dataFeedConfig.s3Bucket;
      } else if (df.dataValues.dataFeed === 'digitalTwin') {
        df.dataValues.dataFeedConfig.connectionId = df.dataValues.uuid;

        if (df.dataValues.dataFeedConfig.enablePostUpdatePreparedStatements) {
          const postUpdateKeyValues:any = {};
          df.dataValues.dataFeedConfig.postUpdateKeyValues.forEach((kv:any) => {
            postUpdateKeyValues[kv.key] = kv.value;
          });
          df.dataValues.dataFeedConfig.postUpdateKeyValues = postUpdateKeyValues;
        }
      }

      dataFeeds[df.dataValues.dataFeed] = {
        dataFeed: df.dataValues.dataFeed,
        dataFeedConfig: df.dataValues.dataFeedConfig,
        feedSecrets: df.dataValues.feedSecrets,
      };
    });

    const wkConfig:any = {
      id: workflow.dataValues.uuid,
      schedule: workflow.dataValues.schedule,
      // TODO: remove once users are using Agent 2.5.0+
      deltaUpdateField: workflow.dataValues.deltaUpdateField,
      redactRules,
      userSearchEmailField: workflow.dataValues.userSearchEmailField,
      userSearchEmailRelations: workflow.dataValues.userSearchEmailRelations,
      export: workflow.dataValues.exportTableDataConfig,
      dataFeeds: [dataFeeds],
      inputs,
    };

    if (workflow.dataValues.workflowType === 'mockDatabaseMigration') {
      wkConfig.migrationDatabase = workflow.dataValues.migrationDatabase;
      wkConfig.migrationDatabaseClone = workflow.dataValues.migrationDatabaseClone;
    }

    // console.log(wkConfig);
    return res.send(wkConfig);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

async function regenERLEvaluationDataFeed(workflow:any) {
  // reset/save s3 upload datafeed
  await DataFeed.destroy({
    where: {
      workflowId: workflow.dataValues.id,
    },
  });
  const uploadFiles = 'table-athletes.csv,table-marketing_campaign.csv';
  const uploadBucket = `s3://redactics-sample-exports/${workflow.dataValues.uuid}`;
  const dataFeedConfig = {
    image: (process.env.NODE_ENV === 'development') ? 'localhost:5010/postexport-s3upload' : 'redactics/postexport-s3upload',
    tag: '1.0.1',
    shell: '/bin/bash',
    command: `/bin/upload-to-s3 ${workflow.dataValues.uuid} ${uploadFiles} ${uploadBucket}`,
    args: '',
    uploadFileChecked: ['table-marketing_campaign.csv', 'table-athletes.csv'],
    S3UploadBucket: 's3://redactics-sample-exports.s3.amazonaws.com',
  };
  const dataFeedSecrets = [{
    secretKey: 'credentials', secretName: 'aws', secretPath: '/root/.aws', secretType: 'volume',
  }];
  const df = await DataFeed.create({
    dataFeedConfig,
    feedSecrets: dataFeedSecrets,
    dataFeed: 's3upload',
    workflowId: workflow.dataValues.id,
  });

  delete df.dataValues.id;
  delete df.dataValues.workflowId;

  return df.dataValues;
}

export async function createWorkflow(req: RedacticsRequest, res: Response) {
  try {
    const workflowRecord:WorkflowCreate = {
      companyId: req.currentUser.companyId || 0,
      name: req.body.name,
      workflowType: req.body.workflowType,
      exportTableDataConfig: [],
    };

    if (req.body.workflowType.match(/^(ERL|mockDatabaseMigration)$/)) {
      // ensure user owns agentId
      const agent = await Agent.findOne({
        where: {
          uuid: req.body.agentId,
          companyId: req.currentUser.companyId,
        },
      });

      if (!agent) {
        // this should not happen since agent selections come from a dropdown
        return res.status(404).json({
          errors: [{
            msg: 'Invalid agent ID',
          }],
        });
      }

      workflowRecord.agentId = agent.dataValues.id;
    }

    if (!req.body.workflowType.match(/^(ERL|multiTenantWebERL|mockDatabaseMigration)$/)) {
      return res.status(422).json({
        errors: [{
          msg: 'Invalid workflow type',
        }],
      });
    }

    const wfCreate = await Workflow.create(workflowRecord);
    const response = wfCreate.dataValues;

    let inputRecord:InputRecord;
    if (req.body.workflowType === 'multiTenantWebERL') {
      // create sample database input
      inputRecord = {
        inputType: 'postgresql',
        inputName: 'Sample Input',
        exportData: true
      };
      const input = await Input.create(inputRecord);
      inputRecord.uuid = input.dataValues.uuid;
      await WorkflowInput.create({
        workflowId: wfCreate.dataValues.id,
        inputId: input.dataValues.id,
        tables: ['athletes', 'marketing_campaign']
      });
      response.inputs = [inputRecord];
      // generate datafeed
      const dataFeed = await regenERLEvaluationDataFeed(wfCreate);
      response.datafeeds = [dataFeed];
    } else {
      response.inputs = [];
      response.datafeeds = [];
    }

    // strip primary key from response since we display UUIDs instead
    delete response.id;
    response.agentId = req.body.agentId;
    response.redactrules = [];
    response.allDatabaseTables = [];

    return res.send(response);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

async function triggerWorkflowJobUIRefresh(uuid:string, refresh:boolean) {
  // TODO: refactor
  // const db = firebaseAdmin.database();
  // const ref = db.ref(`workflowJobProgress/${uuid}`).child('triggerRefresh');
  // ref.update({
  //   refresh,
  // });
}

async function removeProgressData(uuid:string, workflowJobId:string) {
  // TODO: refactor
  // const db = firebaseAdmin.database();
  // const ref = db.ref(`workflowJobProgress/${uuid}`).child(workflowJobId);
  // await ref.remove();
}

async function saveRedactRules(workflow:any, req: RedacticsRequest) {
  let rule;
  let ruleId;
  let preset;
  let presetId;
  const redactrulePromises:any = [];

  // recreate redact rules, delete current
  await RedactRule.destroy({
    where: {
      workflowId: workflow.dataValues.id,
    },
  });

  // record UUIDs for UI update
  const redactRuleUuids: string[] = [];

  // get all presets and rulesets
  const presets = await RedactRulePreset.findAll({
    where: {
      companyId: req.currentUser.companyId,
    },
  });
  const redactRules = await RedactRuleset.findAll({});

  // skip saving blank rules (when GUI section is disabled)
  Object.values(req.body.maskingRules.filter((r:any) => (
    !!((r.databaseTable && r.column))))).forEach((r:any) => {
    if (r.presetUuid) {
      // preset used
      preset = presets.find((p:any) => (p.uuid === r.presetUuid));
      ruleId = preset.ruleId;
      presetId = preset.id;
    } else {
      // preset not used, apply defaults
      rule = redactRules.find((p:any) => (p.redactKey === r.rule));
      ruleId = rule.id;
      presetId = null;
    }

    // determine table based on databaseTable, table record is for forget user feature
    const databaseTableArr = r.databaseTable.split(': ');
    const table = databaseTableArr[(databaseTableArr.length - 1)];
    const redactRule:RedactRuleRecord = {
      companyId: req.currentUser.companyId,
      workflowId: workflow.dataValues.id,
      databaseTable: r.databaseTable,
      table,
      column: r.column,
      ruleId,
      presetId,
    };

    redactrulePromises.push(RedactRule.create(redactRule));
  });

  const ruleCreate = await Promise.all(redactrulePromises);
  ruleCreate.forEach((r:any) => {
    redactRuleUuids.push(r.dataValues.uuid);
  });
  return redactRuleUuids;
}

async function saveInputs(workflow:any, req: RedacticsRequest) {
  const inputrulePromises:any = [];
  const inputs = await Input.findAll({
    where: {
      workflowId: workflow.id,
      disabled: {
        [Op.not]: true,
      },
    },
  });

  const savedInputs:string[] = [];
  await WorkflowInput.destroy({
    where: {
      workflowId: workflow.id
    }
  })
  Object.values(req.body.inputs).forEach((i:any) => {
    const input = inputs.find((input:any) => {
      return (input.dataValues.uuid === i.uuid)
    });

    const inputRecord:WorkflowInputRecord = {
      workflowId: workflow.dataValues.id,
      inputId: input.dataValues.id,
      tables: i.tables,
      enabled: i.enabled,
    };
    console.log("INPUT RECORD", inputRecord);
    inputrulePromises.push(WorkflowInput.create(inputRecord));
    savedInputs.push(input.dataValues.uuid);
  });
  // disable inputs no longer defined
  inputs.forEach((input:any) => {
    if (!savedInputs.includes(input.dataValues.uuid)) {
      // disable input
      inputrulePromises.push(Input.update({
        disabled: true,
      }, {
        where: {
          uuid: input.dataValues.uuid,
        },
      }));
    }
  });
  await Promise.all(inputrulePromises);
}

async function saveERL(req: RedacticsRequest, res: Response) {
  const t = await sequelize.transaction();
  let response;
  const dataFeedPromises:any = [];

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // validate schedule
    let validSchedule = false;
    if (req.body.schedule === 'None'
      || req.body.schedule === '@hourly'
      || req.body.schedule === '@daily'
      || req.body.schedule === '@weekly'
      || req.body.schedule === '@monthly'
      || req.body.schedule.match(/^[0-9*,-/]+?\s[0-9*,-/]+?\s[0-9*,-/]+?\s[0-9*,-/]+?\s[0-9*,-/]+?$/)) {
      validSchedule = true;
    }
    if (!validSchedule) {
      return res.status(422).json({
        errors: [{
          msg: 'Invalid schedule',
        }],
      });
    }

    const agent = await Agent.findOne({
      where: {
        uuid: req.body.agentId,
        companyId: req.currentUser.companyId,
      },
    });

    if (!agent) {
      // this should not happen since agent selections come from a dropdown
      return res.status(404).json({
        errors: [{
          msg: 'Invalid agent ID',
        }],
      });
    }

    // get workflowId
    const workflow = await Workflow.findOne({
      where: {
        uuid: req.params.uuid,
        companyId: req.currentUser.companyId,
      },
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'workflow not found' });
    }

    let columnExclusion:boolean = false;
    if (req.body.dataFeeds && req.body.dataFeeds.length) {
      // verify no column output exclusion with data feeds that clone data
      const cloneFeeds = req.body.dataFeeds.find((df:any) => ((df.dataFeed === 'dataRepository')));
      if (cloneFeeds) {
        if (req.body.exportTableDataConfig.find((cf:any) => (!!(Object.values(cf).find(
          (c:any) => (!!((c.fields && c.fields.length))),
        ))))
        ) {
          columnExclusion = true;
        }
      }
      if (columnExclusion) {
        return res.status(400).json({ errors: 'Data feed does not permit column exclusion' });
      }

      // verify valid delta update digital twin settings
      const digitalTwin = req.body.dataFeeds.find((df:any) => ((df.dataFeed === 'digitalTwin')));
      if (digitalTwin) {
        if (digitalTwin.dataFeedConfig.enableDeltaUpdates
          && !digitalTwin.dataFeedConfig.deltaUpdateField) {
          return res.status(400).json({ error: 'You must provide your data update field to enable delta updates' });
        }
        if (digitalTwin.dataFeedConfig.enablePostUpdatePreparedStatements
          && (!digitalTwin.dataFeedConfig.postUpdateKeyValues
            || !digitalTwin.dataFeedConfig.postUpdateKeyValues.length
          )) {
          return res.status(400).json({ error: 'You must provide some key/value pairs for your prepared statements' });
        }
      }
    }

    // save redact rules
    const redactRuleUuids = await saveRedactRules(workflow, req);
    // save inputs
    await saveInputs(workflow, req);

    // save (upsert) data feeds
    const dfUuids:string[] = [];
    const dataFeeds = await DataFeed.findAll({
      where: {
        workflowId: workflow.id,
        disabled: {
          [Op.not]: true,
        },
      },
    });
    dataFeeds.forEach((df:any) => {
      dfUuids.push(df.dataValues.uuid);
    });

    const savedDataFeeds:string[] = [];
    if (req.body.dataFeeds && req.body.dataFeeds.length) {
      Object.values(req.body.dataFeeds).forEach((feed:any) => {
        const df:any = feed;
        df.workflowId = workflow.dataValues.id;
        if (df.dataFeed === 's3upload' || df.dataFeed === 'dataRepository') {
          if (!df.dataFeedConfig.S3UploadBucket.match(/^s3:\/\//)) {
            // ensure bucket URL is prefaced with s3 protocol
            df.dataFeedConfig.S3UploadBucket = `s3://${df.dataFeedConfig.S3UploadBucket}`;
          }
          const uploadFiles = df.dataFeedConfig.uploadFileChecked.join(',');
          df.dataFeedConfig.image = (process.env.NODE_ENV === 'development') ? 'localhost:5010/postexport-s3upload' : 'redactics/postexport-s3upload';
          df.dataFeedConfig.tag = '1.0.1';
          df.dataFeedConfig.shell = '/bin/bash';
          df.dataFeedConfig.command = `/bin/upload-to-s3 ${workflow.dataValues.uuid} ${uploadFiles} ${df.dataFeedConfig.S3UploadBucket}`;
          df.dataFeedConfig.args = '';
          df.feedSecrets = [{
            secretKey: 'credentials', secretName: 'aws', secretPath: '/root/.aws', secretType: 'volume',
          }];
        }
        if (dfUuids.includes(df.uuid)) {
          // update data feed
          dataFeedPromises.push(DataFeed.update(df, {
            where: {
              uuid: df.uuid,
            },
            returning: true,
            plain: true,
          }));
          savedDataFeeds.push(df.uuid);
        } else {
          // new data feed
          delete df.uuid;
          dataFeedPromises.push(DataFeed.create(df));
        }
      });
    }
    dataFeeds.forEach((df:any) => {
      if (!savedDataFeeds.includes(df.dataValues.uuid)) {
        // disable data feed
        dataFeedPromises.push(DataFeed.update({
          disabled: true,
        }, {
          where: {
            uuid: df.dataValues.uuid,
          },
        }));
      }
    });
    await Promise.all(dataFeedPromises);

    const workflowUpdate:WorkflowUpdate = {
      name: req.body.name,
      agentId: agent.id,
      schedule: req.body.schedule,
      exportTableDataConfig: req.body.exportTableDataConfig,
      generateSoftDeleteQueries: req.body.generateSoftDeleteQueries,
      userSearchEmailField: req.body.userSearchEmailField,
      userSearchEmailDBTable: req.body.userSearchEmailDBTable,
      userSearchEmailColumn: req.body.userSearchEmailColumn,
    };

    // console.log("UPDATE", workflowUpdate);

    const wfUpdate = await Workflow.update(workflowUpdate, {
      where: {
        uuid: req.params.uuid,
        companyId: req.currentUser.companyId,
      },
      returning: true,
      plain: true,
    });

    response = wfUpdate[1].dataValues;
    // strip primary key from response since we display UUIDs instead
    delete response.id;
    response.agentId = agent.uuid;

    // determine if ERL workflow is new based on whether it has any jobs to
    // display UI feedback about updating helm config file
    const workflowJob:any = await WorkflowJob.findOne({
      where: {
        workflowType: 'ERL',
        companyId: req.currentUser.companyId,
      },
    });

    return res.send({
      workflow: response,
      redactRuleUuids,
      updateHelmConfig: (!workflowJob),
    });
  } catch (e) {
    // console.log(e);
    logger.error(e.stack);

    await t.rollback();
    return res.status(500).send(e);
  } finally {
    t.commit();
  }
}

async function saveMockMigration(req: RedacticsRequest, res: Response) {
  const t = await sequelize.transaction();
  let response;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const agent = await Agent.findOne({
      where: {
        uuid: req.body.agentId,
        companyId: req.currentUser.companyId,
      },
    });

    if (!agent) {
      // this should not happen since agent selections come from a dropdown
      return res.status(404).json({
        errors: [{
          msg: 'Invalid agent ID',
        }],
      });
    }

    if (!req.body.migrationNamespace || !req.body.migrationDatabase
      || !req.body.migrationDatabaseClone) {
      return res.status(400).json({ errors: 'missing required fields' });
    }

    // get workflowId
    const workflow = await Workflow.findOne({
      where: {
        uuid: req.params.uuid,
        companyId: req.currentUser.companyId,
      },
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'workflow not found' });
    }

    // show UI feedback about updating helm config file if namespace has changed
    const oldMigrationNamespace = workflow.dataValues.migrationNamespace;

    // save inputs
    await saveInputs(workflow, req);

    const workflowUpdate:WorkflowUpdate = {
      name: req.body.name,
      agentId: agent.id,
      migrationNamespace: req.body.migrationNamespace,
      migrationDatabase: req.body.migrationDatabase,
      migrationDatabaseClone: req.body.migrationDatabaseClone,
      migrationConfiguration: req.body.migrationConfiguration,
      migrationHelmHookWeight: req.body.migrationHelmHookWeight,
    };

    const wfUpdate = await Workflow.update(workflowUpdate, {
      where: {
        uuid: req.params.uuid,
        companyId: req.currentUser.companyId,
      },
      returning: true,
      plain: true,
    });

    response = wfUpdate[1].dataValues;
    // strip primary key from response since we display UUIDs instead
    delete response.id;
    response.agentId = agent.uuid;

    // determine if migration workflow is new based on whether it has any jobs
    // to display UI feedback about updating helm config file
    const workflowJob:any = await WorkflowJob.findAll({
      where: {
        workflowType: 'mockDatabaseMigration',
        companyId: req.currentUser.companyId,
      },
    });
    // loop through jobs and check if outputMetadata contains req.body.migrationDatabase

    return res.send({
      updateHelmConfig: !!((oldMigrationNamespace !== req.body.migrationNamespace || !workflowJob)),
      workflow: response,
    });
  } catch (e) {
    // console.log(e);
    logger.error(e.stack);

    await t.rollback();
    return res.status(500).send(e);
  } finally {
    t.commit();
  }
}

async function buildRedactRuleConfig(workflow:any, req: RedacticsRequest) {
  const allRedactRuleSets = await RedactRuleset.findAll({});
  const allRedactRules = await RedactRule.findAll({
    where: {
      companyId: req.currentUser.companyId,
    },
  });
  const allRedactRulePresets = await RedactRulePreset.findAll({
    where: {
      companyId: req.currentUser.companyId,
    },
  });

  const rules = allRedactRules.filter((r:any) => (
    r.dataValues.workflowId === workflow.dataValues.id
  ));
  const redactRules:any = [];

  Object.values(rules).forEach((r:any) => {
    let preset;

    // see if there is already a rule for current table, append columns if there is
    const tableSearch = redactRules.find((rule:any) => Object.keys(rule)[0] === r.table);
    const rule:any = tableSearch || {};
    if (!rule[r.table]) {
      rule[r.table] = [];
    }
    const column:any = {};
    const ruleset = allRedactRuleSets.find((p:any) => (p.dataValues.id === r.ruleId));

    if (r.presetId) {
      preset = allRedactRulePresets.find((p:any) => (p.dataValues.id === r.presetId));
    } else {
      // get default data
      preset = allRedactRulePresets.find((p:any) => (p.dataValues.isDefault
        && p.dataValues.ruleId === r.ruleId));

      if (preset) {
        preset = preset.dataValues;
      } else {
        // no default value saved to DB, provide default
        switch (ruleset.redactKey) {
          case 'replacement':
            preset = {
              redactData: {
                replacement: 'redacted',
              },
            };
            break;

          case 'redact_email':
            preset = {
              redactData: {
                domain: 'redactics.com',
                prefix: 'redacted',
                primaryKey: 'id',
              },
            };
            break;

          case 'random_string':
            preset = {
              redactData: {
                chars: '25',
              },
            };
            break;

          default:
            preset = {
              redactData: {},
            };
            break;
        }
      }
    }

    column[r.column] = { rule: ruleset.redactKey, ...preset.redactData };

    rule[r.table].push(column);
    if (!tableSearch) {
      // prevent duplicate table entries
      redactRules.push(rule);
    }
  });
  return redactRules;
}

async function saveERLEvaluation(req: RedacticsRequest, res: Response) {
  const t = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // get workflowId
    const workflow = await Workflow.findOne({
      where: {
        uuid: req.params.uuid,
        companyId: req.currentUser.companyId,
      },
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'workflow not found' });
    }

    // save redact rules
    const redactRuleUuids = await saveRedactRules(workflow, req);
    // regenerate preset datafeed
    const dataFeed = await regenERLEvaluationDataFeed(workflow);

    const workflowUpdate:WorkflowUpdate = {
      name: req.body.name,
      exportTableDataConfig: req.body.exportTableDataConfig,
    };

    // console.log("UPDATE", workflowUpdate);

    await Workflow.update(workflowUpdate, {
      where: {
        uuid: req.params.uuid,
      },
    });

    // build input Airflow config
    const inputData = await Input.findAll({
      where: {
        workflowId: workflow.dataValues.id,
        disabled: {
          [Op.not]: true,
        },
      },
      order: [
        ['createdAt', 'ASC'],
      ],
    });
    const inputs:any[] = [];
    inputData.forEach((i:any) => {
      inputs.push({
        id: i.dataValues.uuid,
        tables: i.dataValues.tables,
      });
    });
    // build redact rule config
    const redactRules = await buildRedactRuleConfig(workflow, req);

    const createWfJob:WorkflowJobRecord = {
      workflowId: workflow.dataValues.id,
      workflowType: 'multiTenantWebERL',
      status: 'queued',
      currentTaskNum: 0,
    };

    const wfJob = await WorkflowJob.create(createWfJob);

    const wfConf = {
      inputs,
      export: req.body.exportTableDataConfig,
      redactRules,
      s3upload: {
        dataFeedConfig: dataFeed.dataFeedConfig,
        feedSecrets: dataFeed.feedSecrets,
      },
      workflowJobId: wfJob.dataValues.uuid,
      workflowId: workflow.dataValues.uuid,
    };

    let data:any;
    if (process.env.NODE_ENV !== 'test') {
      const authorization = `Basic ${Buffer.from(`${process.env.AIRFLOW_BASIC_AUTH_USER}:${process.env.AIRFLOW_BASIC_AUTH_PASS}`).toString('base64')}`;
      const response = await fetch(`${process.env.AIRFLOW_API_URL}/api/v1/dags/erl_taskflow_evaluation/dagRuns`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify({
          dag_run_id: wfJob.dataValues.uuid,
          conf: wfConf,
        }),
      });

      data = await response.json();
      // console.log('RESPONSE', data, JSON.stringify(data));

      // trigger a UI refresh
      //triggerWorkflowJobUIRefresh(company.dataValues.uuid, true);
    } else {
      // mock response
      data = {
        conf: wfConf,
        dag_id: 'erl_taskflow_evaluation',
        dag_run_id: '3a58e92c-05a3-4ee5-9f07-dd4ae3db7ecb',
        end_date: null,
        execution_date: '2022-06-25T06:45:15.401842+00:00',
        external_trigger: true,
        logical_date: '2022-06-25T06:45:15.401842+00:00',
        start_date: null,
        state: 'queued',
      };
    }

    return res.send({
      airflowResponse: data,
      redactRuleUuids,
    });
  } catch (e) {
    // console.log(e);
    logger.error(e.stack);

    await t.rollback();
    return res.status(500).send(e);
  } finally {
    t.commit();
  }
}

export async function updateWorkflow(req: RedacticsRequest, res: Response) {
  switch (req.body.workflowType) {
    case 'ERL':
      saveERL(req, res);
      break;

    case 'multiTenantWebERL':
      saveERLEvaluation(req, res);
      break;

    case 'mockDatabaseMigration':
      saveMockMigration(req, res);
      break;

    default:
      res.status(422).json({ errors: 'invalid workflow type' });
      break;
  }
}

export async function deleteWorkflow(req: RedacticsRequest, res: Response) {
  try {
    // confirm ownership of database
    const workflow = await Workflow.findOne({
      where: {
        uuid: req.params.uuid,
      },
    });
    if (!workflow) {
      return res.status(403).json({ errors: 'you do not have permission to delete this workflow' });
    }

    // soft delete
    workflow.disabled = true;
    await workflow.save();

    return res.send({
      deleted: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function getWorkflowJobs(req: RedacticsRequest, res: Response) {
  try {
    const wfJobs = await WorkflowJob.findAll({
      where: {
        companyId: req.currentUser.companyId,
      },
      order: [
        ['createdAt', 'DESC'],
      ],
      include: Workflow,
      limit: 25,
    });

    const wfJobData = wfJobs.map((j:any) => {
      const progress = (j.dataValues.status === 'error' || j.dataValues.status === 'completed'
        || !j.dataValues.totalTaskNum)
        ? 0
        : Math.round((j.dataValues.currentTaskNum / j.dataValues.totalTaskNum) * 100);

      const wfJob:WorkflowJobListEntry = {
        uuid: j.dataValues.uuid,
        status: j.dataValues.status,
        createdAt: j.dataValues.createdAt,
        lastTaskEnd: j.dataValues.lastTaskEnd,
        workflowType: j.dataValues.workflowType,
        outputSummary: j.dataValues.outputSummary,
        outputLinks: j.dataValues.outputLinks,
        outputMetadata: j.dataValues.outputMetadata,
        exception: j.dataValues.exception,
        stackTrace: j.dataValues.stackTrace,
        progress,
      };
      if (j.dataValues.Workflow) {
        wfJob.workflowName = j.dataValues.Workflow.dataValues.name;
        wfJob.workflowId = j.dataValues.Workflow.dataValues.uuid;
      }

      return wfJob;
    });

    if (process.env.NODE_ENV !== 'test') {
      // const company = await Company.findByPk(req.currentUser.companyId);
      // triggerWorkflowJobUIRefresh(company.dataValues.uuid, false);
    }
    return res.send(wfJobData);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function createWorkflowJob(req: Request, res: Response) {
  try {
    let validWorkflowType = false;
    switch (req.body.workflowType) {
      case 'ERL':
      case 'multiTenantWebERL':
      case 'sampletable-athletes':
      case 'sampletable-marketing_campaign':
      case 'piiscanner':
      case 'usersearch':
      case 'mockDatabaseMigration':
        validWorkflowType = true;
        break;

      default:
        break;
    }
    if (!validWorkflowType) {
      return res.status(422).json({ errors: 'invalid workflow type' });
    }

    const createWfJob:WorkflowJobRecord = {
      workflowType: req.body.workflowType,
      status: 'queued',
      currentTaskNum: 0,
    };
    let workflow:any;
    if (req.body.workflowId) {
      // verify workflow ownership
      workflow = await Workflow.findOne({
        where: {
          uuid: req.body.workflowId,
        },
      });
      if (!workflow) {
        return res.status(404).json({ errors: 'invalid workflow ID' });
      }
      createWfJob.workflowId = workflow.dataValues.id;
    }
    const wfJob = await WorkflowJob.create(createWfJob);

    // const company = await Company.findByPk(apiKeyOwner.dataValues.companyId);
    // triggerWorkflowJobUIRefresh(company.dataValues.uuid, true);

    if (workflow) {
      wfJob.workflowId = workflow.dataValues.uuid;
    }
    delete wfJob.dataValues.id;
    return res.send(wfJob);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function postJobException(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const exception:AirflowException = {
      exception: req.body.exception,
      stackTrace: req.body.stackTrace,
      workflowJobId: req.params.uuid,
    };

    const job = await WorkflowJob.findOne({
      where: {
        uuid: req.params.uuid,
      }
    });
    if (!job) {
      return res.status(404).json({ errors: 'this workflow job does not exist' });
    }

    // TODO: refactor
    // if (process.env.NODE_ENV !== 'test') {
    //   // post to notification center

    //   const db = firebaseAdmin.database();
    //   const ref = db.ref('notifications').child(company.dataValues.uuid);

    //   const fbException:any = exception;
    //   fbException.ack = false;
    //   fbException.timestamp = Date.now();
    //   if (job.dataValues.workflowId) {
    //     const workflow = await Workflow.findByPk(job.dataValues.workflowId);
    //     fbException.workflowId = job.dataValues.workflowId;
    //     fbException.workflowName = workflow.dataValues.name;
    //   }

    //   await ref.push().set(fbException);
    // }

    job.exception = exception.exception;
    job.stackTrace = exception.stackTrace;
    job.status = 'error';
    job.currentTaskNum = null;
    await job.save();

    // removeProgressData(company.dataValues.uuid, req.params.uuid);
    // triggerWorkflowJobUIRefresh(company.dataValues.uuid, true);

    return res.send(job);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function ackException(req: RedacticsRequest, res: Response) {
  try {
    // refactor
    // const company = await Company.findByPk(req.currentUser.companyId);

    // if (process.env.NODE_ENV !== 'test') {
    //   const db = firebaseAdmin.database();
    //   const ref = db.ref(`notifications/${company.dataValues.uuid}`).child(req.body.exceptionId);

    //   await ref.update({
    //     ack: true,
    //   });
    // }

    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

/* eslint-disable consistent-return */

export async function ackAll(req: RedacticsRequest, res: Response) {
  try {
    // refactor
    // // get companyId
    // const company = await Company.findByPk(req.currentUser.companyId);

    // if (process.env.NODE_ENV !== 'test') {
    //   const db = firebaseAdmin.database();
    //   const ref = db.ref(`notifications/${company.dataValues.uuid}`);

    //   ref.once('value', (snapshot:any) => {
    //     snapshot.forEach((child:any) => {
    //       if (!child.val().ack) {
    //         child.ref.update({
    //           ack: true,
    //         });
    //       }
    //     });

    //     return res.send({
    //       ack: true,
    //     });
    //   });
    // } else {
    //   // TODO: mock Firebase for tests
    //   return res.send({
    //     ack: true,
    //   });
    // }
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

function buildOutputSummary(job:any, workflow:any) {
  let summary:string = '';
  const dataFeeds = (
    workflow
    && workflow.dataValues.datafeeds
    && workflow.dataValues.datafeeds.length
  ) ? workflow.dataValues.datafeeds.filter((df:any) => (
      !(df.dataValues.disabled)
    )) : [];
  if (job.dataValues.workflowType === 'ERL') {
    if (job.dataValues.metrics) {
      let totalRows = 0;
      let totalRedactions = 0;
      let totalTables = 0;
      job.dataValues.metrics.forEach((m:any) => {
        switch (m.dataValues.metricName) {
          case 'tableRows':
            totalRows += m.dataValues.metricValue;
            break;

          case 'redactedFields':
            totalRedactions += m.dataValues.metricValue;
            break;

          case 'exportedTable':
            totalTables += m.dataValues.metricValue;
            break;

          default:
            break;
        }
      });

      summary += `${totalRows} total rows created or updated, ${totalRedactions} column(s) containing PII/confidential info, ${totalTables} table(s) exported.`;
    }
    if (dataFeeds.length) {
      summary += ' Your data was ';
      const dfSummary:string[] = [];
      dataFeeds.forEach((df:any) => {
        // exclude disabled datafeeds
        switch (df.dataValues.dataFeed) {
          case 'dataRepository':
            dfSummary.push('uploaded to your internal data repository');
            break;

          case 's3upload':
            dfSummary.push(`uploaded to ${df.dataValues.dataFeedConfig.S3UploadBucket}`);
            break;

          case 'digitalTwin':
            dfSummary.push('replicated to your digital twin database');
            break;

          case 'custom':
            dfSummary.push(`processed by ${df.dataValues.dataFeedConfig.image}`);
            break;

          default:
            break;
        }
      });
      if (dfSummary.length > 1) {
        dfSummary[(dfSummary.length - 1)] = `and ${dfSummary[(dfSummary.length - 1)]}`;
      }
      summary += `${dfSummary.join(', ')}.`;
    }
  } else if (job.dataValues.workflowType === 'multiTenantWebERL') {
    summary = 'Your test data was uploaded to a public Amazon S3 bucket.';
  } else if (job.dataValues.workflowType === 'mockDatabaseMigration') {
    summary = `Your database was cloned and given the name ${workflow.dataValues.migrationDatabaseClone} in preparation for a dry-run of your database migrations.`;
  }

  return summary;
}

function buildOutputMetadata(job:any) {
  const metadata:OutputMetadata = {
    initialCopies: [],
    deltaCopies: [],
    copySummary: [],
    schemaChangeDetected: [],
    initialCopyConfirm: [],
    missingDeltaUpdateField: false,
    agentInit: false,
  };
  if (job.dataValues.workflowType === 'ERL') {
    if (job.dataValues.metrics) {
      job.dataValues.metrics.filter((m:any) => (!!(m.dataValues.metricName.match(/(initialCopies|deltaCopies|tableRows)/)))).forEach((m:any) => {
        if (m.dataValues.metricName === 'initialCopies') {
          metadata.initialCopies = metadata.initialCopies.concat(m.dataValues.metricMetadata);
        } else if (m.dataValues.metricName === 'deltaCopies') {
          metadata.deltaCopies = metadata.deltaCopies.concat(m.dataValues.metricMetadata);
        } else if (m.dataValues.metricName === 'tableRows') {
          if (m.dataValues.metricMetadata.copy_status === 'init' && !metadata.agentInit) {
            metadata.copySummary.push('Your tables have been created for the first time on a brand new Redactics Agent installation');
            metadata.agentInit = true;
          } else if (m.dataValues.metricMetadata.copy_status === 'missing-delta-update-field' && !metadata.missingDeltaUpdateField) {
            metadata.copySummary.push('Your configuration is missing your "Updated Date Field Name" option which is preventing delta updates to your tables');
            metadata.missingDeltaUpdateField = true;
          } else if (m.dataValues.metricMetadata.copy_status === 'schema-change-detected') {
            metadata.schemaChangeDetected.push(m.dataValues.tableName);
          } else if (m.dataValues.metricMetadata.copy_status === 'initial-copy') {
            metadata.initialCopyConfirm.push(m.dataValues.tableName);
          }
        }
      });

      if (metadata.schemaChangeDetected.length) {
        metadata.copySummary.push(`A schema change to tables: ${metadata.schemaChangeDetected.join(', ')} resulted in these tables being recreated from their source`);
      }
      if (metadata.initialCopyConfirm.length) {
        metadata.copySummary.push(`${metadata.initialCopyConfirm.join(', ')} has been created/recreated`);
      }
    }
  }

  return metadata;
}

export async function postJobTaskEnd(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const taskstart:TaskStart = {
      lastTask: req.body.task,
      lastTaskEndDate: new Date(),
    };

    logger.info(`*** postTaskEnd ${JSON.stringify(taskstart)} ${req.params.uuid}`);

    const job = await WorkflowJob.findOne({
      where: {
        uuid: req.params.uuid,
      }
    });
    if (!job) {
      return res.status(404).json({ errors: 'this workflow job does not exist' });
    }

    job.currentTaskNum += 1;
    job.totalTaskNum = req.body.totalTaskNum;
    job.lastTask = req.body.task;
    job.lastTaskEnd = Date.now();
    if (job.totalTaskNum && job.currentTaskNum > job.totalTaskNum) {
      // this probably shouldn't happen
      job.currentTaskNum = job.totalTaskNum;
    }
    if (req.body.task === req.body.lastTask || job.status === 'completed') {
      job.status = 'completed';
      job.currentTaskNum = null;
      const workflow = (job.dataValues.workflowId)
        ? await Workflow.findByPk(job.dataValues.workflowId, {
          include: ['redactrules', 'inputs', 'datafeeds'],
        }) : null;
      job.outputSummary = buildOutputSummary(job, workflow);
      job.outputMetadata = buildOutputMetadata(job);
      if (job.workflowType === 'multiTenantWebERL') {
        // build output links
        const uploadFeed = await DataFeed.findOne({
          where: {
            dataFeed: 's3upload',
            workflowId: job.dataValues.workflowId,
          },
        });
        const uploadFiles = uploadFeed.dataValues.dataFeedConfig.uploadFileChecked;
        job.outputLinks = [];
        uploadFiles.forEach((f:string) => {
          job.outputLinks.push(`https://redactics-sample-exports.s3.amazonaws.com/${workflow.dataValues.uuid}/${f}`);
        });
      }
    } else if (job.status !== 'error') {
      job.status = 'inProgress';
    }
    await job.save();

    // TODO: refactor
    // if (job.status === 'completed' && process.env.NODE_ENV !== 'test') {
    //   // trigger refresh to show completion time
    //   removeProgressData(apiKeyOwner.dataValues.Company.dataValues.uuid, req.params.uuid);
    //   triggerWorkflowJobUIRefresh(apiKeyOwner.dataValues.Company.dataValues.uuid, true);
    // } else if (process.env.NODE_ENV !== 'test') {
    //   const db = firebaseAdmin.database();
    //   const ref = db.ref(`workflowJobProgress/${apiKeyOwner.dataValues.Company.dataValues.uuid}`).child(req.params.uuid);

    //   await ref.update({
    //     timestamp: Date.now(),
    //     uuid: job.dataValues.uuid,
    //     progress: Math.round((job.currentTaskNum / job.totalTaskNum) * 100),
    //   });
    // }

    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function markFullCopy(req: RedacticsRequest, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // check on input ownership
    const input = await Input.findOne({
      where: {
        uuid: req.body.inputId,
      },
    });
    if (!input) {
      return res.status(404).json({ errors: 'invalid input ID' });
    }
    const workflow = await Workflow.findByPk(input.dataValues.workflowId);
    if (!workflow) {
      // user doesn't own workflow input is associated with
      return res.status(403).json({ errors: 'invalid input ID' });
    }

    const tableFullCopyCheck = await TableFullCopy.findOne({
      where: {
        inputId: input.dataValues.id,
        tableName: req.body.tableName,
      },
    });
    const tableFullCopy = (!tableFullCopyCheck) ? await TableFullCopy.create({
      inputId: input.dataValues.id,
      tableName: req.body.tableName,
    }) : tableFullCopyCheck.dataValues;

    return res.send(tableFullCopy);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}
