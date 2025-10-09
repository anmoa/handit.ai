import express from 'express';

const router = express.Router();
import {
  createPrompt,
  getPrompt,
  updatePrompt,
  deletePrompt,
  getActivePrompt,
  releasePrompt,
  getAllPrompts,
  getAllPromptVersions,
  getLastMetricsOfVersion,
  getInsightsOfVersion,
  getAgentByIdFunction,
  getModelOptimizationStatus,
  optimizePromptFromError,
} from '../controllers/promptVersionController.js';

/**
 * @route   GET /model/:modelId/prompt/:version/metrics
 * @desc    Get the last metrics for a specific prompt version
 */
router.get('/model/:modelId/prompt/:version/metrics', getLastMetricsOfVersion);

/**
 * @route   POST /model/:modelId/prompt
 * @desc    Create a new prompt version for the specified model 
 * @params  modelId (path) - ID of the model
 * @body    { prompt: string } - Prompt text to create
 * @returns Created prompt version details
 */
router.post('/model/:modelId/prompt', createPrompt);

/**
 * @route   GET /model/:modelId/prompt/:version
 * @desc    Retrieve a specific prompt version for the specified model
 * @params  modelId (path)  – ID of the model
 * @params  version (path)  – Version identifier string
 * @returns Prompt version details
 */
router.get('/model/:modelId/prompt/:version', getPrompt);

/**
 * @route   PUT /model/:modelId/prompt/:version
 * @desc    Update the prompt text on a specific prompt version
 * @params  modelId (path)  – ID of the model
 * @params  version (path)  – Version identifier string
 * @body    { prompt: string } – New prompt text
 * @returns Updated prompt version details
 */
router.put('/model/:modelId/prompt/:version', updatePrompt);

/**
 * @route   DELETE /model/:modelId/prompt/:version
 * @desc    Soft-delete a specific prompt version
 * @params  modelId (path)    – ID of the model
 * @params  version (path)    – Version identifier string
 * @returns Deleted prompt version details
 */
router.delete('/model/:modelId/prompt/:version', deletePrompt);

/**
 * @route   GET /model/:modelId/prompt/active
 * @desc    Get the currently active prompt version for a specific model
 * @params  modelId (path) - ID of the model
 * @returns Active prompt version details for the specified model
 */
router.get('/model/:modelId/prompt/active', getActivePrompt);

/**
 * @route   POST /model/:modelId/prompt/:version/release
 * @desc    Release to production the prompt version for the specified model
 * @params  modelId (path) - ID of the model
 * @params  version (path) - Version identifier string
 * @returns Released prompt version details
 */
router.post('/model/:modelId/prompt/:version/release/:originalModelId', releasePrompt);

/**
 * @route   GET /prompts
 * @desc    Retrieve all prompt versions grouping them by modelID
 * @returns List of all prompt versions grouped by modelID
 */
router.get('/prompts', getAllPrompts);

/**
 * @route   GET /model/:modelId/prompts
 * @desc    Get all prompt versions for a specific model
 * @params  modelId (path) - ID of the model
 * @returns {200} - { success: true, data: promptVersions[] }
 *          {404} - { success: false, message: 'No prompt versions found for model' }
 */
router.get('/model/:modelId/prompts', getAllPromptVersions);

/**
 * @route   GET /model/:modelId/prompt/:version/insights
 * @desc    Get insights for a specific prompt version (fallback to model if none for version)
 */
router.get('/model/:modelId/prompt/:version/insights', getInsightsOfVersion);

/**
 * @route   POST /model/:modelId/prompt/optimize-from-error
 * @desc    Optimize a prompt based on a specific modelLog error
 * @params  modelId (path) - ID of the model
 * @body    { modelLogId: number } - ID of the modelLog that contains the error
 * @returns {200} - { success: true, data: { newPrompt, insights } }
 *          {400} - { success: false, message: 'Invalid modelLogId or no error found' }
 *          {404} - { success: false, message: 'Model or modelLog not found' }
 */
router.post('/model/:modelId/prompt/optimize-from-error', optimizePromptFromError);

export default router; 

/**
 * @route   GET /agents/:agentId
 * @desc    Get agent by ID
 * @params  agentId (path) - ID of the agent
 * @returns Agent details
 */
router.get('/agents/:agentId', getAgentByIdFunction);

/**
 * @route   GET /agents/:agentId/model-optimization-status
 * @desc    Get model optimization status counts for an agent
 */
router.get('/agents/:agentId/model-optimization-status', getModelOptimizationStatus);