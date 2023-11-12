import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const InputModel = Sequelize.define('Input', {
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
    allowNull: true,
  },
  inputName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  inputType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  inputFunction: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  diskSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  enableSSL: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  sslMode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  exportData: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  redacticsGenerated: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  extensionsSchema: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'inputs',
});

export default InputModel;
