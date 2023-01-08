import { Request, Response } from 'express';
import logger from '../config/winston';

import RedactRuleset from '../models/redactruleset';
import RedactRulePreset from '../models/redactrulepreset';

const { Op } = require('sequelize');

export async function getSettings(req: Request, res: Response) {
  try {
    // exclude rulesets with no settings
    let redactrulesets = await RedactRuleset.findAll({
      where: {
        redactKey: {
          [Op.notIn]: ['destruction'],
        },
      },
    });

    const redactrules: { [key: number]: string } = {};
    redactrulesets.forEach((c: any) => {
      redactrules[c.id] = c.redactKey;
    });

    let defaults = await RedactRulePreset.findAll({
      where: {
        isDefault: true,
      },
    });

    let presets = await RedactRulePreset.findAll({
      where: {
        isDefault: false,
      },
    });

    redactrulesets = redactrulesets.map((rr: any) => {
      const r = rr;
      delete r.dataValues.id;

      return r.dataValues;
    });

    defaults = defaults.map((df: any) => {
      const d = df;
      delete d.dataValues.id;
      delete d.dataValues.companyId;
      d.dataValues.rule = redactrules[d.dataValues.ruleId];
      delete d.dataValues.ruleId;

      return d.dataValues;
    });

    presets = presets.map((preset: any) => {
      const p = preset;
      delete p.dataValues.id;
      delete p.dataValues.companyId;
      p.dataValues.rule = redactrules[p.dataValues.ruleId];
      delete p.dataValues.ruleId;

      return p.dataValues;
    });

    return res.send({
      defaults,
      rulesets: redactrulesets,
      presets,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function saveRuleDefaults(req: Request, res: Response) {
  try {
    const promises: any = [];
    req.body.forEach((d: any) => {
      promises.push(RedactRulePreset.update({
        redactData: d.redactData,
      }, {
        where: {
          uuid: d.uuid,
        },
      }));
    });

    await Promise.all(promises);
    return res.send({
      saved: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}

export async function savePresets(req: Request, res: Response) {
  try {
    const redactrulesets = await RedactRuleset.findAll({
      where: {
        redactKey: {
          [Op.notIn]: ['destruction'],
        },
      },
    });

    const redactrules: { [key: number]: string } = {};
    redactrulesets.forEach((c: any) => {
      redactrules[c.redactKey] = c.id;
    });

    const promises:any[] = [];
    if (req.body.length) {
      Object.keys(req.body).forEach((idx) => {
        const p = req.body[idx];

        if (p.uuid && p.key.match(/^delete/)) {
          // delete
          promises.push(RedactRulePreset.destroy({
            where: {
              uuid: p.uuid,
            },
          }));
        } else if (p.uuid) {
          // update
          promises.push(RedactRulePreset.update({
            ruleId: redactrules[p.rule],
            isDefault: false,
            presetName: p.presetName,
            redactData: p.redactData,
          }, {
            where: {
              uuid: p.uuid,
            },
          }));
        } else if (!p.key.match(/^delete/)) {
          // create, but only if GUI hasn't marked for deletion
          promises.push(RedactRulePreset.create({
            ruleId: redactrules[p.rule],
            isDefault: false,
            presetName: p.presetName,
            redactData: p.redactData,
          }));
        }
      });

      await Promise.all(promises);
    }

    return res.send({
      saved: true,
    });
  } catch (e) {
    logger.error(e.stack);
    return res.send(e);
  }
}
