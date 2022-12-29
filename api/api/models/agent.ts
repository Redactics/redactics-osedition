import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

import AgentInputModel from './agentinput';

const AgentModel = Sequelize.define('Agent', {
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
  fernetKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  namespace: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nodeSelector: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  configPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  agentInstallationDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastHeartBeatDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  lastAgentVersion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  generatedAirflowDBPassword: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  generatedAirflowAPIPassword: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  webserverKey: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'agents',
});

AgentModel.hasMany(AgentInputModel, {
  foreignKey: 'agentId',
  as: 'inputs',
});

export default AgentModel;
