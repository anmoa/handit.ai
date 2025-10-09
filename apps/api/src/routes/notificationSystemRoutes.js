import express from 'express';
import {
  getInactiveUsers,
  getInactiveUsersRange,
  debugUsers,
  getInactiveUsersTest,
  getAgentsWithoutEvaluators,
  getAgentsWithoutEvaluatorsTest,
  testPromptVersionCreatedEmail
} from '../controllers/notificationSystemController.js';

const router = express.Router();

// Debug endpoint to troubleshoot user queries
router.get('/debug-users/:nDays', debugUsers);

// Test endpoint - Get inactive users from the last N days (broader range)
router.get('/test-inactive-users/:nDays', getInactiveUsersTest);

// Get completely inactive users registered exactly N days ago
router.get('/inactive-users/:nDays', getInactiveUsers);

// Get inactive users registered within a date range
router.get('/inactive-users', getInactiveUsersRange);

// Get users with agents that don't have evaluators connected, created exactly N days ago
router.get('/agents-without-evaluators/:nDays', getAgentsWithoutEvaluators);

// Test endpoint - Get agents without evaluators from the last N days (broader range)
router.get('/test-agents-without-evaluators/:nDays', getAgentsWithoutEvaluatorsTest);

// Test endpoint - Send prompt version created email
router.post('/test-prompt-version-created-email', testPromptVersionCreatedEmail);

export default router; 