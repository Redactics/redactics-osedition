import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const RedactRulesetModel = Sequelize.define('RedactRuleset', {
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
  redactKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  redactName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'redactrulesets',
});

export default RedactRulesetModel;
