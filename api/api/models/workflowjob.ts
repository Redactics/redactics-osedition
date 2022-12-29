import { DataTypes } from 'sequelize';
import WorkflowModel from './workflow';

import Sequelize from '../db/sequelize';

const WorkflowJobModel = Sequelize.define('WorkflowJob', {
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
  workflowType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currentTaskNum: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalTaskNum: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
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
  lastTask: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastTaskEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  outputSummary: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  outputLinks: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  outputMetadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'workflowjobs',
});

WorkflowJobModel.hasOne(WorkflowModel, {
  sourceKey: 'workflowId',
  foreignKey: 'id',
});

export default WorkflowJobModel;
