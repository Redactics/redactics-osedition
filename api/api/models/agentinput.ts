import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const AgentInputModel = Sequelize.define('AgentInput', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  inputId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'agentinputs',
});

export default AgentInputModel;
