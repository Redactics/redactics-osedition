// load routes
import express from 'express';
import inputRouter from './routes/input';
import workflowRouter from './routes/workflow';
import agentRouter from './routes/agent';
import healthRouter from './routes/health';
import settingsRouter from './routes/settings';

const cors = require('cors');
// const bodyParser = require('body-parser');
const morgan = require('morgan');

// Create a new express application instance
const app: express.Application = express();
// app.use(bodyParser.json());
app.use(express.json({ limit: 300000 }));

const whitelist = ['http://localhost:8000', process.env.WEB_URL];
const corsOptions = {
  origin: whitelist,
  credentials: true,
};
app.use(cors(corsOptions));

app.use(morgan('combined'));

// init routes
app.use('/', healthRouter);
app.use('/input', inputRouter);
app.use('/workflow', workflowRouter);
app.use('/agent', agentRouter);
app.use('/settings', settingsRouter);

export default app;
