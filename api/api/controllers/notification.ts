import { Request, Response } from 'express';
import logger from '../config/winston';
import {
  NotificationRecord,
} from '../types/redactics';

import Notification from '../models/notification';
import Agent from '../models/agent';
import Workflow from '../models/workflow';

const { Op } = require('sequelize');

export async function getNotifs(req: Request, res: Response) {
  try {
    let notifs = await Notification.findAll({
      order: [
        ['createdAt', 'DESC'],
      ],
      include: [Agent, Workflow]
    })

    const notifications:NotificationRecord = notifs.map((n:any) => {
      let notifRecord:any = n.dataValues;
      delete notifRecord.id;
      if (notifRecord.Agent) {
        notifRecord.agentId = notifRecord.Agent.dataValues.uuid;
        notifRecord.agentName = notifRecord.Agent.dataValues.name;
        delete notifRecord.Agent;
      }
      if (notifRecord.Workflow) {
        notifRecord.workflowId = notifRecord.Workflow.dataValues.uuid;
        notifRecord.workflowName = notifRecord.Workflow.dataValues.name;
        delete notifRecord.Workflow;
      }
      return notifRecord;
    })
  
    res.send({
      notifications,
    });
  } catch (e) {
    logger.error(e.stack);
    res.send(e);
  }
}

export async function ackException(req: Request, res: Response) {
  try {
    const exception = await Notification.findOne({
      where: {
        uuid: req.params.uuid
      }
    });
    exception.acked = true;
    await exception.save();

    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}

export async function ackAll(req: Request, res: Response) {
  try {
    // refactor
    await Notification.update({
      acked: true
    }, {where: {}})
    return res.send({
      ack: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.status(500).send(e);
  }
}