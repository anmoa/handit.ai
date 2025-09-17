import express from 'express';
import {
  testSend,
  testModelFailureNotification,
  testModelFailureAlert,
} from '../controllers/emailController.js';

const router = express.Router();
router.post('/email', testSend);
router.post('/test-model-failure-notification', testModelFailureNotification);
router.post('/test-model-failure-alert', testModelFailureAlert);

export default router;
