import express from 'express';
import {
  testSend,
  testModelFailureNotification,
  testModelFailureAlert,
  testPromptOptimizationAndEmail,
} from '../controllers/emailController.js';

const router = express.Router();
router.post('/email', testSend);
router.post('/test-model-failure-notification', testModelFailureNotification);
router.post('/test-model-failure-alert', testModelFailureAlert);
router.post('/test-prompt-optimization-and-email', testPromptOptimizationAndEmail);

export default router;
