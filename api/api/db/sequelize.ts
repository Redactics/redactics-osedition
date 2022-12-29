import logger from '../config/winston';

const Sequelize = require('sequelize');

export default new Sequelize(`postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`, {
  logging: (process.env.NODE_ENV === 'development') ? (msg:string) => logger.info(msg) : false,
});
