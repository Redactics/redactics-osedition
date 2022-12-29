import { check } from 'express-validator';

import {
  getAgent, createAgent, updateAgent, deleteAgent,
  heartbeat, helmCmd, helmConfig,
} from '../controllers/agent';

const express = require('express');

const router = express.Router();

router.get('/', getAgent);

router.post('/', [
  check('name').not().isEmpty(),
  check('namespace').not().isEmpty(),
  check('configPath').not().isEmpty(),
], createAgent);

router.put('/:uuid', [
  check('name').not().isEmpty(),
  check('namespace').not().isEmpty(),
  check('configPath').not().isEmpty(),
], updateAgent);

router.delete('/:uuid', deleteAgent);

router.put('/:uuid/heartbeat', heartbeat);

router.get('/:uuid/helmCmd', helmCmd);
router.get('/:uuid/helmConfig', helmConfig);

export default router;
