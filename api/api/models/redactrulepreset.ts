import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const RedactRulePresetModel = Sequelize.define('RedactRulePresets', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  presetName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ruleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  redactData: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'redactrulepresets',
});

export default RedactRulePresetModel;
