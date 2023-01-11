import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const NotificationModel = Sequelize.define('Notification', {
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
  acked: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  exception: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stackTrace: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  workflowId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  firstHeartbeat: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
}, {
  tableName: 'notifications',
});

export default NotificationModel;
