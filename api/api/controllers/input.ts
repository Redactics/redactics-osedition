import { Request, Response } from 'express';
import logger from '../config/winston';
import {
  InputRecord,
} from '../types/redactics';

import Input from '../models/input';

const { Op } = require('sequelize');

export async function getInputs(req: Request, res: Response) {
  try {
    let inputs = await Input.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
        redacticsGenerated: {
          [Op.not]: true,
        },
      },
      order: [
        ['updatedAt', 'ASC'],
      ],
    });
    inputs = inputs.map((i:any) => {
      const inputRecord:InputRecord = i.dataValues;
      delete inputRecord.id;
      // set default if no value is provided
      if (!inputRecord.extensionsSchema) { inputRecord.extensionsSchema = 'public'; }
      return inputRecord;
    });

    res.send({
      inputs,
    });
  } catch (e) {
    logger.error(e.stack);
    res.send(e);
  }
}

export async function saveInputs(req: Request, res: Response) {
  try {
    const inputrulePromises:any = [];
    // save (upsert) inputs
    const inputUuids:string[] = [];
    const inputs = await Input.findAll({
      where: {
        disabled: {
          [Op.not]: true,
        },
      },
    });
    inputs.forEach((input:any) => {
      inputUuids.push(input.dataValues.uuid);
    });

    // validate inputs
    let validInputs = true;
    Object.values(req.body.inputs).forEach((i:any) => {
      if (i.inputType !== 'postgresql'
        || !i.sslMode.match(/(allow|prefer|require|verify-ca|verify-full)/)
        || i.diskSize < 0) {
        validInputs = false;
      }
    });
    if (!validInputs) {
      return res.status(400).json({ errors: 'invalid input value' });
    }

    const savedInputs:string[] = [];
    Object.values(req.body.inputs).forEach((i:any) => {
      const inputRecord:InputRecord = {
        inputName: i.inputName,
        inputType: i.inputType,
        exportData: i.exportData,
        diskSize: i.diskSize,
        enableSSL: i.enableSSL,
        sslMode: i.sslMode,
        extensionsSchema: i.extensionsSchema,
      };
      if (inputUuids.includes(i.uuid)) {
        // update input
        inputrulePromises.push(Input.update(inputRecord, {
          where: {
            uuid: i.uuid,
          },
          returning: true,
          plain: true,
        }));
        savedInputs.push(i.uuid);
      } else {
        // create new input
        inputrulePromises.push(Input.create(inputRecord));
      }
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

    return res.send({
      updated: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}
