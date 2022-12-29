import {
  getSettings, saveRuleDefaults, savePresets,
} from '../controllers/settings';

const express = require('express');

const router = express.Router();

router.get('/', getSettings);

router.put('/saveRuleDefaults', saveRuleDefaults);
router.post('/presets', savePresets);

export default router;
