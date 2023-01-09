import { Request, Response } from 'express';
import logger from '../config/winston';
import {
  NotificationRecord,
} from '../types/redactics';

import Notification from '../models/notification';

const { Op } = require('sequelize');

export async function getNotifs(req: Request, res: Response) {
  try {
    let notifs = await Notification.findAll({
      order: [
        ['createdAt', 'DESC'],
      ],
    })

    notifs = notifs.map((n:any) => {
      let notifRecord:NotificationRecord = n.dataValues;
      delete notifRecord.id;
      return notifRecord;
    })
  
    res.send({
      notifications: notifs,
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