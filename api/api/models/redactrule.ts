import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const RedactRuleModel = Sequelize.define('RedactRules', {
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
  workflowId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  databaseTable: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  table: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  column: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ruleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  presetId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'redactrules',
});

export default RedactRuleModel;
