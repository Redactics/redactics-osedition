import { check } from 'express-validator';

import {
  getNotifs, ackException,
} from '../controllers/notification';

const express = require('express');

const router = express.Router();

router.get('/', getNotifs);

router.put('/:uuid/ackException', [
  
], ackException);

export default router;
