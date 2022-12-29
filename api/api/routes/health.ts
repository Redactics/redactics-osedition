import { Request, Response } from 'express';

const express = require('express');

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  res.sendStatus(200);
});
router.get('/health', async (req: Request, res: Response) => {
  res.sendStatus(200);
});

export default router;
