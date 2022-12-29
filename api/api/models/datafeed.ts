import { DataTypes } from 'sequelize';

import Sequelize from '../db/sequelize';

const DatafeedModel = Sequelize.define('Datafeed', {
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
    allowNull: false,
  },
  dataFeed: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dataFeedConfig: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  feedSecrets: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
}, {
  tableName: 'datafeeds',
});

export default DatafeedModel;
