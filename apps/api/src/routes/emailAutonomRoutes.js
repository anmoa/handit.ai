import express from 'express';
import {
  sendAutonomEmail,
  sendHanditWelcomeEmail,
} from '../controllers/emailAutonomController.js';

const router = express.Router();
router.post('/email', sendAutonomEmail);
router.post('/welcome', sendHanditWelcomeEmail);

export default router;
