import { Request, Response } from 'express';
import Workflow from '../models/workflow';
import logger from '../config/winston';
import sequelize from '../db/sequelize';
import {
  WorkflowCreate, WorkflowUpdate, AirflowException, OutputMetadata, NotificationRecord,
  TaskStart, RedactRuleRecord, WorkflowInputRecord, WorkflowJobRecord, WorkflowJobListEntry,
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
import Notification from '../models/notification';

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

export async function getWorkflows(req: Request, res: Response) {
  try {
    let redactrulesets = await RedactRuleset.findAll({});
    // type indexedArray
    const redactrules: { [key: number]: string } = {};

    redactrulesets.forEach((c: any) => {
      redactrules[c.id] = c.redactKey;
    });

    let presets = await RedactRulePreset.findAll({});
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
      },
      order: [
        ['createdAt', 'ASC'],
      ],
      include: ['redactrules', 'inputs', 'datafeeds'],
    });

    let agents = await Agent.findAll({
      where: {
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

      return a.dataValues;
    });

    const allInputs = await Input.findAll({
      where: {
        redacticsGenerated: {
          [Op.not]: true,
        },
        disabled: {
          [Op.not]: true,
        },
      },
    });

    let agentInputs = await AgentInput.findAll({
      where: {
        agentId: {
          [Op.in]: agentIdKeys,
        },
      },
    });

    redactrulesets = redactrulesets.map((rs: any) => {
      const r = rs;
      delete r.dataValues.id;

      return r.dataValues;
    });

    presets = presets.map((ps: any) => {
      const p = ps;
      delete p.dataValues.id;
      p.dataValues.rule = redactrules[p.dataValues.ruleId];
      delete p.dataValues.ruleId;

      return p.dataValues;
    });

    const allDatabaseTables:string[] = [];
    workflows = workflows.map((db: any) => {
      const d = db;
      const { agentId } = d.dataValues;
      delete d.dataValues.id;
      // replace with UUID
      d.dataValues.agentId = agentIds[agentId];
      // attach agent name for display purposes
      d.dataValues.agentName = agentNames[agentId];
      d.dataValues.allOutputs = [];
      d.dataValues.redactrules.map((rr: any) => {
        const r = rr;
        delete r.dataValues.id;
        delete r.dataValues.workflowId;
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
      d.dataValues.inputs = d.dataValues.inputs.filter((input:any) => {
        const findInput = allInputs.find((ai:any) => (
          ai.dataValues.id === input.dataValues.inputId
        ));
        return (findInput && !findInput.dataValues.disabled && input.enabled);
      }).map((input: any) => {
        const wi = input;
        const inputData = allInputs.find((i: any) => (i.dataValues.id === wi.dataValues.inputId));
        if (inputData) {
          wi.dataValues.inputName = inputData.dataValues.inputName;
          wi.dataValues.uuid = inputData.dataValues.uuid;
          if (!allDatabaseTables.includes(inputData.dataValues.inputName)) {
            allDatabaseTables.push(inputData.dataValues.inputName);
          }
        }
        if (!wi.dataValues.tables || !wi.dataValues.tables.length) {
          wi.dataValues.tables = [];
        }
        delete wi.dataValues.id;
        delete wi.dataValues.inputId;
        delete wi.dataValues.workflowId;
        return wi.dataValues;
      });
      allInputs.forEach((input:any) => {
        // find data sources that are not being used as inputs in the current workflow
        if (!d.dataValues.inputs.find((wi:any) => (wi.uuid === input.dataValues.uuid))) {
          d.dataValues.allOutputs.push({
            uuid: input.dataValues.uuid,
            inputName: input.dataValues.inputName,
          });
        }
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

    agentInputs = agentInputs.filter((input:any) => {
      const findInput = allInputs.find((ai:any) => (
        ai.dataValues.id === input.dataValues.inputId
      ));
      return (findInput && !findInput.dataValues.disabled);
    }).map((ai:any) => {
      const i = ai;
      const inputData = allInputs.find(
        (alli: any) => (alli.dataValues.id === ai.dataValues.inputId),
      );
      if (inputData) {
        i.dataValues.inputName = inputData.dataValues.inputName;
        i.dataValues.uuid = inputData.dataValues.uuid;
        i.dataValues.redacticsGenerated = inputData.dataValues.redacticsGenerated;
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

export async function getWorkflow(req: Request, res: Response) {
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

    const agent = await Agent.findByPk(workflow.dataValues.agentId);

    const workflowInputs = await WorkflowInput.findAll({
      where: {
        workflowId: workflow.dataValues.id,
        enabled: true,
      },
      include: [Input],
    });

    const allRedactRuleSets = await RedactRuleset.findAll({});
    const allRedactRules = await RedactRule.findAll({
      where: {
        workflowId: workflow.dataValues.id,
      },
    });
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
        },
      },
    });

    workflowInputs.forEach((i:any) => {
      const fullCopies:string[] = [];
      allFullCopies.forEach((c:any) => {
        if (c.dataValues.inputId === i.dataValues.Input.id) {
          fullCopies.push(c.dataValues.tableName);
        }
      });

      if ((workflow.dataValues.workflowType === 'ERL' && i.dataValues.Input && !i.dataValues.Input.dataValues.disabled)
        || workflow.dataValues.workflowType !== 'ERL') {
        inputs.push({
          uuid: i.dataValues.Input.dataValues.uuid,
          tables: i.dataValues.tables,
          tableSelection: i.dataValues.tableSelection,
          fullcopies: fullCopies,
          extensionsSchema: i.dataValues.Input.dataValues.extensionsSchema || 'public',
          enabled: i.dataValues.enabled,
        });
      }
    });

    // rules indexed by table for DAG
    const indexedRedactRules:any = [];

    Object.values(allRedactRules).forEach((r:any) => {
      let preset;

      // see if there is already a rule for current table, append columns if there is
      const tableSearch = indexedRedactRules.find((rule:any) => Object.keys(rule)[0] === r.table);
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
          switch (ruleset.dataValues.redactKey) {
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
        indexedRedactRules.push(rule);
      }
    });

    // input formatted redact rules
    const redactRules:any = allRedactRules.map((r:any) => {
      const rule = r.dataValues;
      delete rule.id;
      delete rule.workflowId;
      const ruleset = allRedactRuleSets.find((p:any) => (p.dataValues.id === rule.ruleId));
      rule.rule = ruleset.dataValues.redactKey;
      delete rule.ruleId;
      const t = rule.table.split('.');
      [rule.schema, rule.table] = t;

      return rule;
    });

    // build dataFeeds
    const dataFeeds:any = [];
    workflow.dataValues.datafeeds.filter((i:any) => (!(i.disabled))).forEach((feed:any) => {
      const df:any = feed;
      // drop UI fields unused by the Agent
      if (df.dataValues.dataFeed === 's3upload') {
        delete df.dataValues.dataFeedConfig.addAllS3Uploads;
        delete df.dataValues.dataFeedConfig.uploadFileChecked;
        delete df.dataValues.dataFeedConfig.s3Bucket;
      } else if (df.dataValues.dataFeed === 'digitalTwin') {
        if (!df.dataValues.dataFeedConfig.enablePostUpdatePreparedStatements) {
          // make definition explicit
          df.dataValues.dataFeedConfig.enablePostUpdatePreparedStatements = false;
        }
      }

      dataFeeds.push({
        dataFeed: df.dataValues.dataFeed,
        uuid: df.dataValues.uuid,
        disabled: df.dataValues.disabled,
        dataFeedConfig: df.dataValues.dataFeedConfig,
        feedSecrets: df.dataValues.feedSecrets,
      });
    });

    const exportTableDataConfig:any = [];
    if (Object.keys(workflow.dataValues.exportTableDataConfig).length) {
      Object.keys(workflow.dataValues.exportTableDataConfig).forEach((idx:any) => {
        const table:string = Object.keys(workflow.dataValues.exportTableDataConfig[idx])[0];
        const config:any = workflow.dataValues.exportTableDataConfig[idx][table];
        const configObj:any = {};
        configObj[table] = {
          table,
          numDays: config.numDays,
          sampleFields: config.sampleFields,
          createdAtField: config.createdAtField,
          updatedAtField: config.updatedAtField,
          disableDeltaUpdates: config.disableDeltaUpdates,
        };
        exportTableDataConfig.push(configObj);
      });
    }

    const wkConfig:any = {
      id: workflow.dataValues.uuid,
      name: workflow.dataValues.name,
      agentId: agent.dataValues.uuid,
      workflowType: workflow.dataValues.workflowType,
      schedule: workflow.dataValues.schedule,
      // TODO: remove once users are using Agent 2.5.0+
      deltaUpdateField: workflow.dataValues.deltaUpdateField,
      redactRules,
      indexedRedactRules,
      userSearchEmailField: workflow.dataValues.userSearchEmailField,
      userSearchEmailRelations: workflow.dataValues.userSearchEmailRelations,
      export: exportTableDataConfig,
      dataFeeds,
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

export async function createWorkflow(req: Request, res: Response) {
  try {
    const workflowRecord:WorkflowCreate = {
      name: req.body.name,
      workflowType: req.body.workflowType,
      exportTableDataConfig: [],
    };

    if (req.body.workflowType.match(/^(ERL|mockDatabaseMigration)$/)) {
      // ensure user owns agentId
      const agent = await Agent.findOne({
        where: {
          uuid: req.body.agentId,
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

    if (!req.body.workflowType.match(/^(ERL|mockDatabaseMigration)$/)) {
      return res.status(422).json({
        errors: [{
          msg: 'Invalid workflow type',
        }],
      });
    }

    const wfCreate = await Workflow.create(workflowRecord);
    const response = wfCreate.dataValues;

    response.inputs = [];
    response.datafeeds = [];

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

async function saveRedactRules(workflow:any, req: Request) {
  let rule;
  let ruleId;
  let preset;
  let presetId;
  const redactrulePromises:any = [];
  const fullCopyResetPromises:any = [];

  const existingRedactRules = await RedactRule.findAll({
    where: {
      workflowId: workflow.dataValues.id,
    },
  });

  // recreate redact rules, delete current
  await RedactRule.destroy({
    where: {
      workflowId: workflow.dataValues.id,
    },
  });

  // record UUIDs for UI update
  const redactRuleUuids: string[] = [];

  // get all presets and rulesets
  const presets = await RedactRulePreset.findAll({});
  const redactRules = await RedactRuleset.findAll({});
  const workflowInputs = await WorkflowInput.findAll({
    where: {
      workflowId: workflow.id,
    },
    include: Input,
  });

  // skip saving blank rules (when GUI section is disabled)
  Object.values(req.body.redactRules.filter((r:any) => (
    !!((r.databaseTable && r.schema && r.table && r.column))))).forEach((r:any) => {
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

    const redactRule:RedactRuleRecord = {
      workflowId: workflow.dataValues.id,
      databaseTable: r.databaseTable,
      table: (`${r.schema}.${r.table}`),
      column: r.column,
      ruleId,
      presetId,
    };

    const findInputId = workflowInputs.find(
      (i:any) => (i.dataValues.Input.dataValues.inputName === r.databaseTable),
    );

    const searchExisting = existingRedactRules.find((e:any) => (e.dataValues.table === (`${r.schema}.${r.table}`)));
    if (findInputId && !searchExisting) {
      fullCopyResetPromises.push(TableFullCopy.destroy({
        where: {
          inputId: findInputId.dataValues.inputId,
          tableName: `${r.schema}.${r.table}`,
        },
      }));
    }

    redactrulePromises.push(RedactRule.create(redactRule));
  });

  const ruleCreate = await Promise.all(redactrulePromises);
  ruleCreate.forEach((r:any) => {
    redactRuleUuids.push(r.dataValues.uuid);
  });
  await Promise.all(fullCopyResetPromises);
  return redactRuleUuids;
}

async function saveInputs(workflow:any, req: Request) {
  try {
    const inputrulePromises:any = [];
    const inputs = await Input.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
      },
    });

    await WorkflowInput.destroy({
      where: {
        workflowId: workflow.id,
      },
    });
    let inputFound = false;
    inputs.forEach((input:any) => {
      const findInput = req.body.inputs.find((i:any) => (i.uuid === input.dataValues.uuid));
      if (findInput) {
        inputFound = true;
        // dedupe table listing
        const uniqueTables = findInput.tables.filter(
          (table:string, idx:number) => findInput.tables.indexOf(table) === idx,
        );
        const inputRecord:WorkflowInputRecord = {
          workflowId: workflow.dataValues.id,
          inputId: input.dataValues.id,
          tables: uniqueTables.sort(),
          tableSelection: findInput.tableSelection,
          enabled: findInput.enabled,
        };
        inputrulePromises.push(WorkflowInput.create(inputRecord));
      }
    });
    if (!inputFound) {
      return false;
    }
    await Promise.all(inputrulePromises);
    return true;
  } catch (err) {
    return false;
  }
}

async function saveERL(req: Request, res: Response) {
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
      },
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'workflow not found' });
    }

    if (req.body.dataFeeds && req.body.dataFeeds.length) {
      // verify valid delta update digital twin settings
      const digitalTwin = req.body.dataFeeds.find((df:any) => ((df.dataFeed === 'digitalTwin')));
      if (digitalTwin) {
        if (digitalTwin.dataFeedConfig.enableDeltaUpdates
          && !digitalTwin.dataFeedConfig.deltaUpdateField) {
          return res.status(400).json({ errors: 'You must provide your delta update field to enable delta updates' });
        }
        if (digitalTwin.dataFeedConfig.enablePostUpdatePreparedStatements
          && (!digitalTwin.dataFeedConfig.postUpdateKeyValues
            || !digitalTwin.dataFeedConfig.postUpdateKeyValues.length
          )) {
          return res.status(400).json({ errors: 'You must provide some key/value pairs for your prepared statements' });
        }
        if (digitalTwin.dataFeedConfig.inputSource && req.body.inputs && req.body.inputs.length) {
          let validTwinDestination:boolean = true;
          req.body.inputs.forEach((input:any) => {
            if (input.uuid === digitalTwin.dataFeedConfig.inputSource && input.enabled) {
              validTwinDestination = false;
            }
          });
          if (!validTwinDestination) {
            return res.status(400).json({ errors: 'Your digital twin output cannot be the same as your input' });
          }
        }
      }
    }

    // save react rules
    const redactRuleUuids = await saveRedactRules(workflow, req);
    // save inputs
    const validInputs = await saveInputs(workflow, req);
    if (!validInputs) {
      return res.status(400).json({ errors: 'invalid input source data' });
    }

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
        if (df.dataFeed === 's3upload') {
          if (!df.dataFeedConfig.S3UploadBucket.match(/^s3:\/\//)) {
            // ensure bucket URL is prefaced with s3 protocol
            df.dataFeedConfig.S3UploadBucket = `s3://${df.dataFeedConfig.S3UploadBucket}`;
          }
          df.dataFeedConfig.image = 'redactics/postexport-s3upload';
          df.dataFeedConfig.tag = '1.1.0';
          df.dataFeedConfig.shell = '/bin/bash';
          df.dataFeedConfig.command = `/bin/upload-to-s3 ${workflow.dataValues.uuid} ${df.dataFeedConfig.S3UploadBucket}`;
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
      },
      returning: true,
      plain: true,
    });

    response = wfUpdate[1].dataValues;
    // strip primary key from response since we display UUIDs instead
    delete response.id;
    response.agentId = agent.uuid;

    return res.send({
      workflow: response,
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

async function saveMockMigration(req: Request, res: Response) {
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
      },
    });
    if (!workflow) {
      return res.status(404).json({ errors: 'workflow not found' });
    }

    if (req.body.migrationDatabase === req.body.migrationDatabaseClone) {
      return res.status(400).json({ errors: 'Your input and target database cannot be identical' });
    }

    // show UI feedback about updating helm config file if namespace has changed
    const oldMigrationNamespace = workflow.dataValues.migrationNamespace;

    // save inputs
    const validInputs = await saveInputs(workflow, req);
    if (!validInputs) {
      return res.status(400).json({ errors: 'invalid input source data' });
    }

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

export async function updateWorkflow(req: Request, res: Response) {
  switch (req.body.workflowType) {
    case 'ERL':
      saveERL(req, res);
      break;

    case 'mockDatabaseMigration':
      saveMockMigration(req, res);
      break;

    default:
      res.status(422).json({ errors: 'invalid workflow type' });
      break;
  }
}

export async function deleteWorkflow(req: Request, res: Response) {
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

export async function getWorkflowJobs(req: Request, res: Response) {
  try {
    const wfJobs = await WorkflowJob.findAll({
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
      case 'sampletable-athletes':
      case 'sampletable-marketing_campaign':
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
      // verify workflow existence
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
      },
    });
    if (!job) {
      return res.status(404).json({ errors: 'this workflow job does not exist' });
    }

    job.exception = exception.exception;
    job.stackTrace = exception.stackTrace;
    job.status = 'error';
    job.currentTaskNum = null;
    await job.save();

    const notificationRecord:NotificationRecord = {
      acked: false,
      exception: exception.exception,
      stackTrace: exception.stackTrace,
      workflowId: job.dataValues.workflowId,
    };
    await Notification.create(notificationRecord);

    return res.send(job);
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

/* eslint-disable consistent-return */

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
    if (dataFeeds.length) {
      summary += 'Your data was ';
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

export async function postJobEnd(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const job = await WorkflowJob.findOne({
      where: {
        uuid: req.params.uuid,
      },
    });
    if (!job) {
      return res.status(404).json({ errors: 'this workflow job does not exist' });
    }

    job.status = 'completed';
    job.currentTaskNum = null;
    const workflow = (job.dataValues.workflowId)
      ? await Workflow.findByPk(job.dataValues.workflowId, {
        include: ['redactrules', 'inputs', 'datafeeds'],
      }) : null;
    job.outputSummary = buildOutputSummary(job, workflow);
    job.outputMetadata = buildOutputMetadata(job);
    await job.save();

    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
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
      },
    });
    if (!job) {
      return res.status(404).json({ errors: 'this workflow job does not exist' });
    }

    job.currentTaskNum += 1;
    job.totalTaskNum = req.body.totalTaskNum;
    job.lastTask = req.body.task;
    job.lastTaskEnd = Date.now();
    if (job.status !== 'error') {
      job.status = 'inProgress';
    }

    await job.save();

    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function markFullCopy(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // check on input existence
    const input = await Input.findOne({
      where: {
        uuid: req.body.inputId,
      },
    });
    if (!input) {
      return res.status(404).json({ errors: 'invalid input ID' });
    }

    const tableFullCopyCheck = await TableFullCopy.findOne({
      where: {
        inputId: input.dataValues.id,
        tableName: req.body.tableName,
      },
    });

    if (tableFullCopyCheck) {
      tableFullCopyCheck.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
      await tableFullCopyCheck.save();
    } else {
      await TableFullCopy.create({
        inputId: input.dataValues.id,
        tableName: req.body.tableName,
      });
    }

    return res.send({
      markFullCopy: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}
