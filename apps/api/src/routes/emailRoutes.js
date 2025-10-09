import express from 'express';
import {
  testSend,
  testModelFailureNotification,
} from '../controllers/emailController.js';

const router = express.Router();
router.post('/email', testSend);
router.post('/test-model-failure-notification', testModelFailureNotification);

export default router;
