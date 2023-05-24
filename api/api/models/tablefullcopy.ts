import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const TableFullCopyModel = Sequelize.define('TableFullCopy', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  inputId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: false,
  tableName: 'tablefullcopies',
});

export default TableFullCopyModel;
