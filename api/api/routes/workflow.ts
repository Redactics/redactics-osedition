import { check } from 'express-validator';

import {
  getWorkflows, getWorkflow, createWorkflow, postJobException, ackException,
  ackAll, postJobTaskEnd, postJobEnd, updateWorkflow, deleteWorkflow,
  getWorkflowJobs, createWorkflowJob, markFullCopy,
} from '../controllers/workflow';

const express = require('express');

const router = express.Router();

router.get('/', getWorkflows);

router.post('/', createWorkflow);

router.put('/ackAll', ackAll);

router.put('/markFullCopy', [
  check('inputId').not().isEmpty(),
  check('tableName').not().isEmpty(),
], markFullCopy);

router.put('/:uuid', [
  check('name').not().isEmpty(),
  check('workflowType').not().isEmpty(),
], updateWorkflow);

router.get('/jobs', getWorkflowJobs);

router.get('/:uuid', getWorkflow);

router.post('/jobs', [
  check('workflowType').not().isEmpty(),
], createWorkflowJob);

router.delete('/:uuid', deleteWorkflow);

router.put('/job/:uuid/postException', [
  check('exception').not().isEmpty(),
], postJobException);

router.put('/:uuid/ackException', [
  check('exceptionId').not().isEmpty(),
], ackException);

router.put('/job/:uuid/postTaskEnd', [
  check('task').not().isEmpty(),
  check('totalTaskNum').isNumeric(),
], postJobTaskEnd);

router.put('/job/:uuid/postJobEnd', [], postJobEnd);

export default router;
