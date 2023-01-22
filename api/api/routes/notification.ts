import {
  getNotifs, ackException, ackAll,
} from '../controllers/notification';

const express = require('express');

const router = express.Router();

router.get('/', getNotifs);

router.put('/:uuid/ackException', [

], ackException);

router.put('/ackAll', ackAll);

export default router;
