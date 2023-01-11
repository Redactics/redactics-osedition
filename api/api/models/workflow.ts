import { DataTypes } from 'sequelize';
import RedactRuleModel from './redactrule';
import WorkflowInputModel from './workflowinput';
import DatafeedModel from './datafeed';
import NotificationModel from './notification';

import Sequelize from '../db/sequelize';

const WorkflowModel = Sequelize.define('Workflow', {
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
  workflowType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  schedule: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastException: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastStackTrace: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastReportedDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastTask: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastTaskEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  exportTableDataConfig: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  deltaUpdateField: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  migrationNamespace: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  migrationDatabase: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  migrationDatabaseClone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  migrationConfiguration: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  migrationHelmHookWeight: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'workflows',
});

WorkflowModel.hasMany(RedactRuleModel, {
  foreignKey: 'workflowId',
  as: 'redactrules',
});
RedactRuleModel.belongsTo(WorkflowModel, {
  foreignKey: 'workflowId',
});
WorkflowModel.hasMany(WorkflowInputModel, {
  foreignKey: 'workflowId',
  as: 'inputs',
});
WorkflowModel.hasMany(DatafeedModel, {
  foreignKey: 'workflowId',
  as: 'datafeeds',
});
NotificationModel.belongsTo(WorkflowModel, {
  foreignKey: 'workflowId',
});

export default WorkflowModel;
