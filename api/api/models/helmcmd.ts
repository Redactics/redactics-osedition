import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const HelmCmdModel = Sequelize.define('HelmCmd', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  cmd: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  completeCmd: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  heartbeat: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  }
}, {
  tableName: 'helmcmds',
});

export default HelmCmdModel;
