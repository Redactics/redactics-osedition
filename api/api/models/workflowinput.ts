import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';
import InputModel from './input';

const WorkflowInputModel = Sequelize.define('WorkflowInput', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  workflowId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  inputId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tables: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'workflowinputs',
});

WorkflowInputModel.belongsTo(InputModel, {
  foreignKey: 'inputId',
});

export default WorkflowInputModel;
