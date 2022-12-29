import { check } from 'express-validator';

import {
  getInputs, saveInputs, migrateData,
} from '../controllers/input';

const express = require('express');

const router = express.Router();

router.get('/', getInputs);

router.put('/', saveInputs);

//router.get('/migrateData', auth, attachCurrentUser, migrateData);

export default router;
