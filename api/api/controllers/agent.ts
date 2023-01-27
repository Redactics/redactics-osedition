import { Request, Response } from 'express';
import YAML from 'yaml';
import { formatDistance } from 'date-fns';
import logger from '../config/winston';
import {
  AgentRecord, HelmCmdRecord, HelmCmdHistory, AgentConnection,
  AgentInputRecord, NotificationRecord,
} from '../types/redactics';

import Agent from '../models/agent';
import Workflow from '../models/workflow';
import AgentInput from '../models/agentinput';
import Input from '../models/input';
import HelmCmd from '../models/helmcmd';
import Notification from '../models/notification';

const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const crypto = require('crypto');
const cryptoRandomString = require('crypto-random-string');

export async function getAgent(req: Request, res: Response) {
  try {
    let agents = await Agent.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
      },
      order: [
        ['createdAt', 'ASC'],
      ],
      include: ['inputs'],
    });

    const inputs = await Input.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
      },
    });

    const formattedInputs:string[] = [];
    agents = agents.map((c: any) => {
      const agent = c.dataValues;
      delete agent.id;
      if (agent.inputs) {
        agent.inputs.forEach((ci:any) => {
          const input = inputs.find((i:any) => (i.dataValues.id === ci.dataValues.inputId));
          formattedInputs.push(input.dataValues.uuid);
        });
        delete agent.inputs;
        agent.inputs = formattedInputs;
      }
      return agent;
    });
    // console.log(agents);
    res.send(agents);
  } catch (e) {
    logger.error(e.stack);
    res.send(e);
  }
}

export async function createAgent(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    // convert non-URL friendly characters, but leave padding character (=)
    const ENC: any = {
      '+': '-',
      '/': '_',
    };

    // generate fernet key (32 random bytes urlsafe base64 encoded)
    const fernetBytes = await crypto.randomBytes(32);
    const fernetKey = fernetBytes.toString('base64').replace(/[+/]/g, (m: string) => ENC[m]);
    const webserverKey = await crypto.randomBytes(16).toString('hex');

    const agent:AgentRecord = req.body;
    agent.fernetKey = fernetKey;
    agent.webserverKey = webserverKey;
    agent.generatedAirflowDBPassword = cryptoRandomString({ length: 24 });
    agent.generatedAirflowAPIPassword = cryptoRandomString({ length: 24 });

    const agentCreate = await Agent.create(agent);
    const response = agentCreate.dataValues;

    // create agentinput records
    if (req.body.inputs && req.body.inputs.length) {
      const inputs = await Input.findAll({
        where: {
          disabled: {
            [Op.not]: true,
          },
        },
      });
      const agentInputPromises:any[] = [];
      req.body.inputs.forEach((inputUuid:string) => {
        const input = inputs.find((i:any) => (i.dataValues.uuid === inputUuid));
        const agentInputRecord:AgentInputRecord = {
          inputId: input.dataValues.id,
          agentId: response.id,
        };
        agentInputPromises.push(AgentInput.create(agentInputRecord));
      });
      await Promise.all(agentInputPromises);
    }

    // strip primary key from response since we use UUIDs instead
    delete response.id;

    return res.send(response);
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function updateAgent(req: Request, res: Response) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const agent = await Agent.findOne({
      where: {
        uuid: req.params.uuid,
      },
    });

    // validate input ids
    const inputs = await Input.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
      },
    });
    const inputUuids:string[] = [];
    inputs.forEach((input:any) => {
      inputUuids.push(input.dataValues.uuid);
    });
    let invalidInput = false;
    req.body.inputs.forEach((inputUuid:string) => {
      if (!inputUuids.includes(inputUuid)) {
        invalidInput = true;
      }
    });
    if (invalidInput) {
      return res.status(403).json({ errors: 'invalid input' });
    }

    agent.name = req.body.name;
    agent.namespace = req.body.namespace;
    agent.nodeSelector = req.body.nodeSelector;
    agent.configPath = req.body.configPath;

    const agentUpdate = await agent.save();
    const response = agentUpdate.dataValues;

    // create/re-create agent input records
    const agentInputPromises:any[] = [];
    await AgentInput.destroy({
      where: {
        agentId: agent.dataValues.id,
      },
    });
    req.body.inputs.forEach((inputUuid:string) => {
      const findInput = inputs.find((input:any) => (input.dataValues.uuid === inputUuid));
      const agentInputRecord:AgentInputRecord = {
        agentId: agent.dataValues.id,
        inputId: findInput.dataValues.id,
      };
      agentInputPromises.push(AgentInput.create(agentInputRecord));
    });
    await Promise.all(agentInputPromises);

    // strip primary key from response since we use UUIDs instead
    delete response.id;

    return res.send(response);
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function deleteAgent(req: Request, res: Response) {
  try {
    // assure agent ownership
    const agent = await Agent.findOne({
      where: {
        uuid: req.params.uuid,
      },
    });

    // soft delete
    agent.disabled = true;
    await agent.save();

    return res.send({
      deleted: req.params.uuid,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function heartbeat(req: Request, res: Response) {
  try {
    // record agent installation date, if necessary
    let agent:AgentRecord;
    const agentCheck = await Agent.findOne({
      where: {
        uuid: req.params.uuid,
      },
    });

    if (!agentCheck) {
      return res.status(404).json({ errors: 'this agent does not exist, or you do not have access to it' });
    }
    if (!agentCheck.dataValues.agentInstallationDate) {
      agent = {
        name: agentCheck.dataValues.name,
        namespace: agentCheck.dataValues.namespace,
        agentInstallationDate: new Date(),
        lastAgentVersion: req.body.agentVersion,
        generatedAirflowDBPassword: agentCheck.dataValues.generatedAirflowDBPassword,
        generatedAirflowAPIPassword: agentCheck.dataValues.generatedAirflowAPIPassword,
      };
    } else {
      agent = {
        name: agentCheck.dataValues.name,
        namespace: agentCheck.dataValues.namespace,
        lastHeartBeatDate: new Date(),
        lastAgentVersion: req.body.agentVersion,
        generatedAirflowDBPassword: agentCheck.dataValues.generatedAirflowDBPassword,
        generatedAirflowAPIPassword: agentCheck.dataValues.generatedAirflowAPIPassword,
      };
    }

    const agentUpdate = await Agent.update(agent, {
      limit: 1,
      where: {
        uuid: req.params.uuid,
      },
      returning: true,
      plain: true,
    });

    // mark helmCmd as received (heartbeat)
    if (req.body.helmCmd) {
      await HelmCmd.update({
        heartbeat: true,
      }, {
        limit: 1,
        where: {
          uuid: req.body.helmCmd,
        },
      });
    }

    const response = agentUpdate[1].dataValues;
    // strip sensitive/irrelevant data
    delete response.id;
    delete response.fernetKey;

    if (!agentCheck.dataValues.agentInstallationDate) {
      const notificationRecord:NotificationRecord = {
        acked: false,
        firstHeartbeat: true,
        agentId: agentCheck.dataValues.id,
      };
      await Notification.create(notificationRecord);
    }

    return res.send(response);
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function helmCmd(req: Request, res: Response) {
  try {
    const agent = await Agent.findOne({
      where: {
        uuid: req.params.uuid,
        disabled: {
          [Op.not]: true,
        },
      },
    });
    if (!agent) {
      return res.status(404).json({ errors: 'this agent does not exist, or you do not have access to it' });
    }

    const agentInputs = await AgentInput.findAll({
      where: {
        agentId: agent.dataValues.id,
      },
    });
    const inputIds:number[] = [];
    agentInputs.forEach((input:any) => {
      inputIds.push(input.dataValues.inputId);
    });

    const allInputs = await Input.findAll({
      where: {
        id: {
          [Op.in]: inputIds,
        },
        disabled: {
          [Op.not]: true,
        },
      },
    });

    // enable PG for Airflow data and reserve 1GB
    const helmArgs:any = {
      agentId: agent.uuid,
      namespace: agent.namespace,
      nodeSelector: agent.nodeSelector,
      configPath: agent.configPath,
      lastAgentVersion: agent.lastAgentVersion,
      latestChartVersion: process.env.LATEST_CHART_VERSION,
      workflows: [],
      helmCmd: null,
      postgresql: {
        persistence: {
          size: 0,
        },
      },
    };

    let largestDisk = 0;
    let largestDiskPadded = 0;

    agentInputs.forEach((i:any) => {
      const findInput = allInputs.find((input:any) => (
        input.dataValues.id === i.dataValues.inputId
      ));
      if (findInput) {
        if (!helmArgs.postgresql.persistence.size
          || (findInput.dataValues.exportData && findInput.dataValues.diskSize > largestDisk)) {
          // add additional buffer for uncompressed, plain text files
          largestDisk = findInput.dataValues.diskSize;
          largestDiskPadded = Math.ceil(largestDisk * 3);
          helmArgs.postgresql.persistence.enabled = true;
        }
        if (findInput.dataValues.exportData) {
          helmArgs.postgresql.persistence.size += findInput.dataValues.diskSize;
        }
      }
    });

    if (helmArgs.postgresql.persistence.size === 0) {
      delete helmArgs.postgresql.persistence.size;
      helmArgs.postgresql.persistence.enabled = false;
    }

    // console.log(helmArgs.workflows[0].inputs);

    if (largestDiskPadded) {
      helmArgs.httpNas = {
        persistence: {
          enabled: true,
          size: largestDiskPadded,
        },
      };
    } else {
      helmArgs.httpNas = {
        persistence: {
          enabled: false,
        },
      };
    }

    const chartUrl = process.env.NODE_ENV === 'development' ? './helmcharts/agent-osedition' : 'redactics/agent-osedition';
    helmArgs.agentUpgradeAvailable = !!((agent.dataValues.lastAgentVersion
      && (String(process.env.LATEST_CHART_VERSION) || '') !== agent.dataValues.lastAgentVersion));
    let helmUpgrade = (agent.dataValues.agentInstallationDate) ? '' : 'helm repo add redactics https://chartmuseum.redactics.com && helm repo update && ';
    helmUpgrade += (helmArgs.agentUpgradeAvailable && process.env.NODE_ENV !== 'development') ? 'helm repo update && helm upgrade --install' : 'helm upgrade --install';

    const helmCmdArray = [
      `${helmUpgrade} --cleanup-on-fail --create-namespace -n ${agent.namespace} --version ${process.env.LATEST_CHART_VERSION} agent ${chartUrl}`,
      `-f ${agent.configPath}`,
    ];

    const helmCmdSet = [
      `--set "agentId=${agent.uuid}"`,
      `--set "redactics.namespace=${agent.namespace}"`,
    ];

    if (largestDiskPadded) {
      helmCmdSet.push(`--set "http-nas.persistence.size=${largestDiskPadded}Gi"`);
      helmCmdSet.push('--set "http-nas.persistence.enabled=true"');
    } else {
      helmCmdSet.push('--set "http-nas.persistence.enabled=false"');
    }

    if (agent.nodeSelector) {
      const nodeSelector = agent.nodeSelector.split('.');
      helmCmdSet.push(`--set "global.nodeSelector.${nodeSelector[0]}=${nodeSelector[1]}"`);
    }

    if (helmArgs.postgresql.persistence.size) {
      helmCmdSet.push(`--set "postgresql.primary.persistence.size=${helmArgs.postgresql.persistence.size}Gi"`);
      helmCmdSet.push('--set "postgresql.primary.persistence.enabled=true"');
    } else {
      helmCmdSet.push('--set "postgresql.primary.persistence.enabled=false"');
    }

    // convert to readable string
    let helmCmdString = helmCmdArray.concat(helmCmdSet).join(' \\\\n');

    // check to see if command has changed
    let newCmd = false;
    let helmCmdRecord = await HelmCmd.findOne({
      where: {
        agentId: agent.id,
      },
      order: [
        ['createdAt', 'DESC'],
      ],
    });
    if (!helmCmdRecord || helmCmdRecord.dataValues.cmd !== helmCmdString) {
      newCmd = true;
      const helmCmdCreate:HelmCmdRecord = {
        agentId: agent.id,
        cmd: helmCmdString,
        createdAt: new Date(),
      };
      helmCmdRecord = await HelmCmd.create(helmCmdCreate);
    }

    helmArgs.helmCmd = helmCmdRecord.dataValues.uuid;
    helmCmdSet.unshift(`--set "helmCmd=${helmArgs.helmCmd}"`);
    helmCmdString = helmCmdArray.concat(helmCmdSet).join(' \\\\n');

    if (newCmd) {
      // update recorded command to include helmCmd UUID
      await HelmCmd.update({
        completeCmd: helmCmdString,
      }, {
        where: {
          uuid: helmArgs.helmCmd,
        },
      });
    }

    // get helm command history
    const helmCmdList = await HelmCmd.findAll({
      where: {
        agentId: agent.id,
      },
      order: [
        ['createdAt', 'DESC'],
      ],
    });
    const helmCmdHistory:HelmCmdHistory[] = [];
    let latest = true;
    helmCmdList.forEach((c:any) => {
      if (latest || c.dataValues.heartbeat) {
        helmCmdHistory.push({
          uuid: c.dataValues.uuid,
          cmd: c.dataValues.completeCmd,
          title: latest ? `Latest (${formatDistance(c.dataValues.createdAt, new Date(), { addSuffix: true })}` : `${formatDistance(c.dataValues.createdAt, new Date(), { addSuffix: true })}`,
        });
      }
      latest = false;
    });

    return res.send({
      helmArgs,
      helmCmd: helmCmdString,
      helmCmdRecord: helmCmdRecord.uuid,
      helmCmdHistory,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function helmConfig(req: Request, res: Response) {
  try {
    const agent = await Agent.findOne({
      where: {
        uuid: req.params.uuid,
        disabled: {
          [Op.not]: true,
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ errors: 'this agent does not exist, or you do not have access to it' });
    }

    // ensure all passwords/keys have a set value
    if (!agent.dataValues.generatedAirflowDBPassword) {
      agent.generatedAirflowDBPassword = cryptoRandomString({ length: 24 });
      await agent.save();
    }
    if (!agent.dataValues.generatedAirflowAPIPassword) {
      agent.generatedAirflowAPIPassword = cryptoRandomString({ length: 24 });
      await agent.save();
    }

    const workflows = await Workflow.findAll({
      where: {
        agentId: agent.id,
        disabled: {
          [Op.not]: true,
        },
      },
      order: [
        ['createdAt', 'ASC'],
      ],
    });

    const workflowIds:number[] = [];
    let enableWebserver:boolean = (process.env.NODE_ENV === 'development');
    const migrationNamespaces:string[] = [];
    workflows.forEach((workflow:any) => {
      if (workflow.dataValues.workflowType === 'mockDatabaseMigration') {
        enableWebserver = true;
        migrationNamespaces.push(workflow.dataValues.migrationNamespace);
      }
      workflowIds.push(workflow.dataValues.id);
    });

    const inputIds:number[] = [];
    const agentInputs = await AgentInput.findAll({
      where: {
        agentId: agent.id,
      },
    });
    agentInputs.forEach((ai:any) => {
      inputIds.push(ai.dataValues.inputId);
    });

    const inputs = await Input.findAll({
      where: {
        id: {
          [Op.in]: inputIds,
        },
        disabled: {
          [Op.not]: true,
        },
      },
      order: [
        ['createdAt', 'ASC'],
      ],
    });

    const connections:AgentConnection[] = [];
    const connectionNames:any[] = [];
    const sslSecrets:any[] = [];
    inputs.forEach((input:any) => {
      // ensure unique connection UUIDs
      const searchConnections = connections.find(
        (connection:any) => (connection.id === input.dataValues.uuid),
      );
      if (!searchConnections) {
        connectionNames[input.dataValues.uuid] = input.dataValues.inputName;
        const connection:AgentConnection = {
          id: input.dataValues.uuid,
          inputName: input.dataValues.inputName,
          type: 'postgres',
          host: 'changeme',
          port: 5432,
          login: 'changeme',
          password: 'changeme',
          schema: 'changeme',
        };

        if (input.dataValues.enableSSL) {
          connection.enableSSL = true;
          connection.extra = `{"sslmode":"verify-ca", "sslrootcert":"/pgcerts/${input.dataValues.uuid}/sslrootcert", "sslcert": "/pgcerts/${input.dataValues.uuid}/sslcert", "sslkey": "/pgcerts/${input.dataValues.uuid}/sslkey"}`;
          sslSecrets.push({
            inputSource: input.dataValues.inputName,
            cmd: `kubectl create secret -n ${agent.dataValues.namespace} generic pgcert-${input.dataValues.uuid} --from-file=sslrootcert=/path/to/server-ca.pem --from-file=sslcert=/path/to/client-cert.pem  --from-file=sslkey=/path/to/client-key.pem`,
          });
        }
        connections.push(connection);
      }
    });

    // Add Airflow connection string for sample DB
    connections.push({
      id: 'redacticsDB',
      type: 'postgres',
      version: '12',
      host: 'agent-postgresql',
      port: 5432,
      login: 'postgres',
      password: agent.dataValues.generatedAirflowDBPassword,
      schema: 'redactics_tmp',
    });

    const helmArgs:any = {
      redactics: {},
      airflow: {
        fernetKey: agent.dataValues.fernetKey,
        webserverSecretKey: agent.dataValues.webserverKey,
        connections,
      },
    };

    helmArgs.postgresql = {
      connection: `postgresql://postgres:${agent.dataValues.generatedAirflowDBPassword}@agent-postgresql:5432/postgres`,
    };

    if (process.env.NODE_ENV === 'development') {
      helmArgs.redactics.env = 'development';
      helmArgs.redactics.apiURL = 'http://host.docker.internal:3000';

      // enable access to logs via web GUI
      helmArgs.workers = {
        persistence: {
          enabled: true,
          size: '1Gi',
        },
      };
    }
    if (enableWebserver) {
      helmArgs.webserver = {
        enabled: true,
        defaultUser: {
          enabled: true,
          role: (process.env.NODE_ENV === 'development') ? 'Admin' : 'User',
          username: 'redactics',
          email: 'redactics',
          firstName: 'redactics',
          lastName: 'redactics',
          password: agent.dataValues.generatedAirflowAPIPassword,
        },
      };
      helmArgs.redactics.basicAuth = Buffer.from(`redactics:${agent.dataValues.generatedAirflowAPIPassword}`).toString('base64');
      if (migrationNamespaces.length) {
        helmArgs.redactics.migrationNamespaces = migrationNamespaces;
      }
    }
    let setRedacticsObj = true;
    if (!helmArgs.redactics.env && !helmArgs.redactics.basicAuth) {
      // cleanup object
      delete helmArgs.redactics;
      setRedacticsObj = false;
    }

    // attach comments to YAML file
    const helmConfigYAML = YAML.stringify(helmArgs);
    const helmConfigObj:any = YAML.parseDocument(helmConfigYAML.replace(/httpNas/g, 'http-nas'));
    // console.log(helmConfigObj.contents.items)
    const airflowIdx = (setRedacticsObj) ? 1 : 0;
    helmConfigObj.contents.items[airflowIdx].value.items[0].value.comment = ' used for encrypting your input credentials (do not alter)';
    helmConfigObj.contents.items[airflowIdx].value.items[1].value.comment = ' for web and other security related functions (do not alter)';

    connections.forEach((connection, idx) => {
      if (connection.id === 'redacticsDB') {
        // Redactics Airflow DB
        helmConfigObj.contents.items[airflowIdx].value.items[2].value.items[idx].items[0].value.comment = ' ID for internal Redactics database';
        helmConfigObj.contents.items[airflowIdx].value.items[2].value.items[idx].items[3].value.comment = ' Internal Redactics DB hostname (do not alter)';
      } else {
        // customer database
        helmConfigObj.contents.items[airflowIdx].value.items[2].value.items[idx].items[0].value.comment = ` ${connectionNames[connection.id]}`;
        helmConfigObj.contents.items[airflowIdx].value.items[2].value.items[idx].items[2].value.comment = ' database hostname';
        helmConfigObj.contents.items[airflowIdx].value.items[2].value.items[idx].items[6].value.comment = ' database name';
      }
    });

    // console.log(helmConfig.toString())

    return res.send({
      helmArgs,
      sslSecrets,
      helmConfig: helmConfigObj.toString(),
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}
