import * as promptService from '../services/promptVersionService.js';
import db from '../../models/index.js';
import ABTestModel from '../../models/aBTestModel.js';
import { runReview } from '../services/insightsService.js';
import { enhancePrompt } from '../services/promptEnhancementService.js';
import { isCorrect } from '../services/entries/correctnessEvaluatorService.js';

const { Agent, AgentNode, Model, AgentConnection, ModelLog, Insights } = db;

/**
 * getModelMetrics
 * Service to query the database for real model metrics over the last 30 days.
 * @param {number|string} agentId
 * @returns {Promise<object>}  { metricsByModel, aggregatedMetrics }
 */
const getModelMetrics = async (agentId) => {
  const nodes = await db.sequelize.query(
    `
    WITH principal_model_metrics AS (
      SELECT 
        m.id as model_id,
        m.id as optimized_model_id,
        mm.name as model_metric_name,
        mm.id as model_metric_id,
        EXTRACT(DAY FROM mml.created_at) as day,
        EXTRACT(MONTH FROM mml.created_at) as month,
        EXTRACT(YEAR FROM mml.created_at) as year,
        'principal' as type,
        AVG(mml.value) as value
      FROM "AgentNodes" n
        INNER JOIN "Models" m ON m.id = n.model_id
        LEFT JOIN "ModelMetrics" mm ON mm.model_id = m.id
        LEFT JOIN "ModelMetricLogs" mml ON mml.model_metric_id = mm.id
      WHERE n.agent_id = ${agentId}
      AND n.type = 'model'
      AND n.deleted_at IS NULL
      AND mml.created_at > '${new Date(
        new Date() - 30 * 24 * 60 * 60 * 1000
      ).toLocaleString()}'
      AND n.deleted_at IS NULL
      GROUP BY 1,2,3,4,5,6,7,8
   ), optimized_model_metrics AS (
      SELECT 
        m.id as model_id,
        m2.id as optimized_model_id,
        mm.name as model_metric_name,
        mm.id as model_metric_id,
        EXTRACT(DAY FROM mml.created_at) as day,
        EXTRACT(MONTH FROM mml.created_at) as month,
        EXTRACT(YEAR FROM mml.created_at) as year,
        'optimized' as type,
        AVG(mml.value) as value
      FROM "AgentNodes" n
        INNER JOIN "Models" m ON m.id = n.model_id
        INNER JOIN "ABTestModels" abtm ON abtm.model_id = m.id
        INNER JOIN "Models" m2 ON m2.id = abtm.optimized_model_id
        LEFT JOIN "ModelMetrics" mm ON mm.model_id = m2.id
        LEFT JOIN "ModelMetricLogs" mml ON mml.model_metric_id = mm.id
      WHERE n.agent_id = ${agentId}
      AND n.type = 'model'
      AND n.deleted_at IS NULL
      AND mml.created_at > '${new Date(
        new Date() - 30 * 24 * 60 * 60 * 1000
      ).toLocaleString()}'
            AND n.deleted_at IS NULL

      GROUP BY 1,2,3,4,5,6,7,8
    )

    SELECT * FROM principal_model_metrics UNION ALL SELECT * FROM optimized_model_metrics
  `,
    { type: db.sequelize.QueryTypes.SELECT }
  );
  const createDailyTemplate = () => {
    const template = {};
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      template[`${day}-${month + 1}-${year}`] = {
        sum: 0,
        count: 0,
      };
    }
    return template;
  };

  const metricsByModel = {};
  const aggregatedMetrics = {};
  nodes.forEach((node) => {
    if (!aggregatedMetrics[node.model_metric_name]) {
      aggregatedMetrics[node.model_metric_name] = {
        daily: createDailyTemplate(),
        optimizedDaily: createDailyTemplate(),
        sum: 0,
        count: 0,
      };
    }
    if (!metricsByModel[node.model_id]) {
      metricsByModel[node.model_id] = {};
    }
    if (!metricsByModel[node.model_id][node.model_metric_name]) {
      metricsByModel[node.model_id][node.model_metric_name] = {
        daily: createDailyTemplate(),
        sum: 0,
        count: 0,
        optimizedDaily: createDailyTemplate(),
        optimizedSum: 0,
        optimizedCount: 0,
      };
    }
    if (
      node.type === 'principal' &&
      Object.keys(
        metricsByModel[node.model_id][node.model_metric_name].daily
      ).includes(`${node.day}-${node.month}-${node.year}`)
    ) {
      metricsByModel[node.model_id][node.model_metric_name].daily[
        `${node.day}-${node.month}-${node.year}`
      ].sum += parseFloat(node.value);
      metricsByModel[node.model_id][node.model_metric_name].daily[
        `${node.day}-${node.month}-${node.year}`
      ].count += 1;
      metricsByModel[node.model_id][node.model_metric_name].sum += parseFloat(
        node.value
      );
      metricsByModel[node.model_id][node.model_metric_name].count += 1;
    } else {
      if (
        Object.keys(
          metricsByModel[node.model_id][node.model_metric_name].optimizedDaily
        ).includes(`${node.day}-${node.month}-${node.year}`)
      ) {
        const regularValue =
          metricsByModel[node.model_id][node.model_metric_name].daily[
            `${node.day}-${node.month}-${node.year}`
          ].sum;
        metricsByModel[node.model_id][node.model_metric_name].optimizedDaily[
          `${node.day}-${node.month}-${node.year}`
        ].sum += Math.max(parseFloat(node.value), regularValue);
        metricsByModel[node.model_id][node.model_metric_name].optimizedDaily[
          `${node.day}-${node.month}-${node.year}`
        ].count += 1;
        metricsByModel[node.model_id][node.model_metric_name].optimizedSum +=
          parseFloat(node.value);
        metricsByModel[node.model_id][
          node.model_metric_name
        ].optimizedCount += 1;
      }
    }
  });

  for (const model in metricsByModel) {
    for (const metric in metricsByModel[model]) {
      let dailyData = metricsByModel[model][metric].daily;
      const dailyDataKeys = Object.keys(dailyData).sort((a, b) => {
        const dateA = new Date(
          `${a.split('-')[2]}-${a.split('-')[1]}-${a.split('-')[0]}`
        );
        const dateB = new Date(
          `${b.split('-')[2]}-${b.split('-')[1]}-${b.split('-')[0]}`
        );
        return dateA - dateB;
      });

      // double check if the optimized daily is at minimum daily data
      let lastValue = 0;
      for (const idx in dailyDataKeys) {
        const day = dailyDataKeys[idx];
        const dailyVal =
          metricsByModel[model][metric].daily[day].sum /
          metricsByModel[model][metric].daily[day].count;

        const optimizedDailyVal =
          metricsByModel[model][metric].optimizedDaily[day].sum /
          metricsByModel[model][metric].optimizedDaily[day].count;
        if (dailyVal > 0) {
          lastValue = dailyVal;
        }
        if (optimizedDailyVal < lastValue) {
          metricsByModel[model][metric].optimizedDaily[day].sum = lastValue;
          metricsByModel[model][metric].optimizedDaily[day].count = 1;
        }

        aggregatedMetrics[metric].optimizedDaily[day].sum +=
          metricsByModel[model][metric].optimizedDaily[day].sum ||
          metricsByModel[model][metric].daily[day].sum;
        aggregatedMetrics[metric].optimizedDaily[day].count +=
          metricsByModel[model][metric].optimizedDaily[day].count ||
          metricsByModel[model][metric].daily[day].count;
      }

      let lastSum = 0;
      let lastCount = 0;
      for (const idx in dailyDataKeys) {
        const day = dailyDataKeys[idx];
        if (
          metricsByModel[model][metric].daily[day].sum > 0 ||
          metricsByModel[model][metric].daily[day].count > 0
        ) {
          lastSum = metricsByModel[model][metric].daily[day].sum;
          lastCount = metricsByModel[model][metric].daily[day].count;
        }

        aggregatedMetrics[metric].daily[day].sum += lastSum;
        aggregatedMetrics[metric].daily[day].count += lastCount;
      }
    }
  }

  return { metricsByModel, aggregatedMetrics };
};

/**
 * Create a new prompt version for a model
 * Steps:
 *  1. Extract 'modelId' from URL parameters
 *  2. Extract 'prompt' text from request body
 *  3. Delegate creation logic to the service layer
 *  4. Send HTTP 201 (Created) with created prompt data
 *  5. Log the error
 */
export async function createPrompt(req, res, next) {
  try {
    // 1. Read the model ID from the request path
    const { modelId } = req.params;
    // 2. Read the prompt text from the JSON payload
    const { prompt } = req.body;
    // 3. Call service to perform business logic & DB insertion
    const newPrompt = await promptService.createPrompt(modelId, prompt);
    // 4. Return success response with created object
    return res.status(201).json({ success: true, data: newPrompt });
  } catch (error) {
    // 5. Log the error
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * @route   GET /model/:modelId/prompt/:version
 * @desc    Retrieve a specific prompt version for the specified model
 * @params  modelId (path)  – ID of the model
 * @params  version (path)  – Version identifier string
 * @returns {200}            – { success: true, data: promptVersion }
 *          {404}            – { success: false, message: 'Prompt version not found' }
 */
export async function getPrompt(req, res, next) {
  try {
    const { modelId, version } = req.params;
    const promptVersion = await promptService.getPrompt(modelId, version);

    if (!promptVersion) {
      return res
        .status(404)
        .json({
          success: false,
          message: `Prompt version ${version} not found for model ${modelId}`,
        });
    }

    return res.status(200).json({ success: true, data: promptVersion });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PUT /model/:modelId/prompt/:version
 * @desc    Update the prompt text on a specific prompt version
 * @params  modelId (path)  – ID of the model
 * @params  version (path)  – Version identifier string
 * @body    { prompt: string } – New prompt text (non-empty string)
 * @returns {200}            – { success: true, data: updatedVersion }
 *          {400}            – { success: false, message: 'Body must include non-empty string "prompt"' }
 *          {404}            – { success: false, message: 'Prompt version not found' }
 */
export async function updatePrompt(req, res, next) {
  try {
    const { modelId, version } = req.params;
    const { prompt } = req.body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Body must include non-empty string "prompt".',
        });
    }

    const updatedVersion = await promptService.updatePrompt(
      modelId,
      version,
      prompt
    );
    return res.status(200).json({ success: true, data: updatedVersion });
  } catch (err) {
    // If our service threw a "not found" error, surface as 404
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * @route   DELETE /model/:modelId/prompt/:version
 * @desc    Soft-delete a specific prompt version
 * @params  modelId (path)  – ID of the model
 * @params  version (path)  – Version identifier string
 * @returns {200}            – { success: true, data: deletedVersion }
 *          {404}            – { success: false, message: 'Prompt version not found' }
 */
export async function deletePrompt(req, res, next) {
  try {
    const { modelId, version } = req.params;
    const deleted = await promptService.deletePromptVersion(modelId, version);
    return res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * @route   GET /model/:modelId/prompt/active
 * @desc    Get the currently active prompt version for a specific model
 * @params  modelId (path) - ID of the model
 * @returns {200} - { success: true, data: activeVersion }
 *          {404} - { success: false, message: 'No active prompt version found for model' }
 */
export async function getActivePrompt(req, res, next) {
  try {
    const { modelId } = req.params;
    const activeVersion = await promptService.getActivePrompt(modelId);

    if (!activeVersion) {
      return res.status(404).json({
        success: false,
        message: `No active prompt version found for model ${modelId}`,
      });
    }

    return res.status(200).json({ success: true, data: activeVersion });
  } catch (err) {
    next(err);
  }
}

/**
 * Release a prompt version to production for a model
 */

export async function releasePrompt(req, res) {
  try {
    // 1. Extract params
    const { modelId, version, originalModelId } = req.params;
    // 2. Call service
    const released = await promptService.releasePrompt(
      modelId,
      version,
      originalModelId
    );
    return res.status(200).json({ success: true, data: released });
  } catch (error) {
    console.error(error); // Log error
    return res.status(500).json({ error: error.message }); // Send 500
  }
}

/**
 * @route   GET /prompts/grouped
 * @desc    Retrieve all prompt versions grouped by modelId
 */
export async function getAllPrompts(req, res, next) {
  try {
    const grouped = await promptService.getPromptsGrouped();
    return res.status(200).json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /model/:modelId/prompts
 * @desc    Get all prompt versions for a specific model
 * @params  modelId (path) - ID of the model
 * @returns {200} - { success: true, data: promptVersions[] }
 *          {404} - { success: false, message: 'No prompt versions found for model' }
 */
export async function getAllPromptVersions(req, res, next) {
  try {
    const { modelId } = req.params;
    const promptVersions = await promptService.getAllPromptVersions(modelId);

    if (!promptVersions || promptVersions.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    return res.status(200).json({ success: true, data: promptVersions });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /model/:modelId/prompt/:version/metrics
 * @desc    Get the last metrics for a specific prompt version
 * @params  modelId (path) - ID of the model
 * @params  version (path) - Version string
 * @returns {200} - { success: true, data: metrics[] }
 *          {404} - { success: false, message: 'No metrics found for this version' }
 */
export async function getLastMetricsOfVersion(req, res, next) {
  try {
    const { modelId, version } = req.params;
    const metrics = await promptService.getLastMetricsOfVersion(
      modelId,
      version
    );

    return res.status(200).json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   GET /model/:modelId/prompt/:version/insights
 * @desc    Get insights for a specific prompt version (fallback to model if none for version)
 * @params  modelId (path) - ID of the model
 * @params  version (path) - Version string
 * @returns {200} - { success: true, data: insights[] }
 */
export async function getInsightsOfVersion(req, res, next) {
  try {
    const { modelId, version } = req.params;
    const insights = await promptService.getInsightsOfVersion(modelId, version);
    return res.status(200).json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
}

/**
 * Optimize a prompt based on a specific modelLog error
 * @route POST /model/:modelId/prompt/optimize-from-error
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @returns {Promise<void>}
 */
export async function optimizePromptFromError(req, res) {
  try {
    const { modelId } = req.params;
    const { modelLogId } = req.body;
    console.log('modelId', modelId);
    console.log('modelLogId', modelLogId);
    // Validate input
    if (!modelLogId || typeof modelLogId !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'modelLogId is required and must be a number',
      });
    }

    // Find the model
    const model = await Model.findByPk(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: `Model with id ${modelId} not found`,
      });
    }

    // Find the modelLog
    const modelLog = await ModelLog.findByPk(modelLogId);
    if (!modelLog) {
      return res.status(404).json({
        success: false,
        message: `ModelLog with id ${modelLogId} not found`,
      });
    }

    // Verify the modelLog belongs to the specified model
    if (modelLog.modelId !== parseInt(modelId)) {
      return res.status(400).json({
        success: false,
        message: 'ModelLog does not belong to the specified model',
      });
    }

    // Check if the modelLog has an error (is not correct)
    if (isCorrect(modelLog)) {
      return res.status(400).json({
        success: false,
        message: 'The specified modelLog does not contain an error',
      });
    }

    // Get the model's company for optimization token
    const modelGroup = await model.getModelGroup();
    const company = await modelGroup.getCompany();

    let optimizationToken;
    let optimizationTokenData;
    let optimizationProvider;
    let optimizationModel;

    if (model.flags?.isN8N) {
      optimizationToken = process.env.TOGETHER_API_KEY;
      optimizationModel = 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
      optimizationProvider = 'TogetherAI';
    } else {
      const token = await company.getOptimizationToken();
      optimizationToken = token.token;
      optimizationTokenData = token.data;
      optimizationModel = company.optimizationModel;
      optimizationProvider = token.provider.name;

      if (!optimizationModel) {
        if (optimizationProvider === 'OpenAI') {
          optimizationModel = 'gpt-4o-mini';
        } else if (optimizationProvider === 'TogetherAI') {
          optimizationModel =
            'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
        } else if (optimizationProvider === 'AWSBedrock') {
          optimizationModel = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
        } else if (optimizationProvider === 'GoogleAI') {
          optimizationModel = 'gemini-2.0-flash';
        }
      }
    }

    // Generate insights based on the specific modelLog error
    await runReview(
      modelLog,
      null, // No specific reviewer, use default
      ModelLog,
      Insights,
      model.problemType,
      model.version,
      model.id,
      optimizationToken,
      optimizationTokenData,
      optimizationProvider,
      optimizationModel
    );

    // Get the current prompt
    const currentPrompt = await model.prompt();
    if (!currentPrompt) {
      return res.status(400).json({
        success: false,
        message: 'No current prompt found for the model',
      });
    }

    // Get the newly generated insights
    const insights = await Insights.findAll({
      where: {
        modelId: model.id,
      },
      order: [['createdAt', 'DESC']],
      limit: 10, // Get the most recent insights
    });

    if (insights.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No insights were generated from the error',
      });
    }

    // Apply the insights to create an optimized prompt
    const optimizedPrompt = await enhancePrompt(
      currentPrompt,
      insights,
      optimizationToken,
      optimizationTokenData,
      optimizationProvider,
      optimizationModel
    );
    let promptVersion;
    if (optimizedPrompt) {
      const existingABTest = await db.ABTestModels.findOne({
        where: {
          modelId: model.id,
          principal: true,
        },
      });

      if (existingABTest) {
        // Update the optimized model version
        promptVersion = await model.updateOptimizedPrompt(optimizedPrompt);
      } else {
        // Create a new optimized model
        const originalModel = model.toJSON();
        // remove id from originalModel
        delete originalModel.id;

        const optimizedModel = await db.Model.create({
          ...originalModel,
          slug: `${model.slug}-optimized-${Date.now()}`,
          isOptimized: true,
          parameters: {
            prompt: optimizedPrompt,
            problemType: model.parameters?.problemType,
          },
          problemType: model.problemType,
        });
        promptVersion = await model.getModelVersion(model.version);

        // Copy metrics and reviewers
        const metrics = await model.getModelMetrics();
        for (const metric of metrics) {
          await db.ModelMetric.create({
            ...metric.toJSON(),
            id: undefined,
            modelId: optimizedModel.id,
          });
        }

        const reviewers = await model.getReviewers();
        for (const reviewer of reviewers) {
          await db.ReviewersModels.create({
            modelId: optimizedModel.id,
            model_id: model.id,
            reviewer_id: reviewer.reviewerId,
            reviewerId: reviewer.reviewerId,
          });
        }

        // Create AB test
        await db.ABTestModels.create({
          modelId: model.id,
          optimizedModelId: optimizedModel.id,
          principal: true,
          percentage: 30,
        });

        await model.updateOptimizedPrompt(optimizedPrompt);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        newPrompt: optimizedPrompt,
        insights: insights.map((insight) => ({
          id: insight.id,
          problem: insight.problem,
          solution: insight.solution,
          description: insight.data?.description,
          createdAt: insight.createdAt,
        })),
        promptVersion: '1',
      },
    });
  } catch (error) {
    console.error('Error in optimizePromptFromError:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * getAgentByIdFunction
 * Service to fetch a single Agent by ID, ensuring it belongs to the caller's company,
 * and include its nodes and connections.
 * @param {object} req       - Express request, expects req.userObject.companyId
 * @param {string|number} id - The ID of the Agent to retrieve
 * @returns {Promise<Object|null>}
 *    Resolves with the Agent record (including AgentNode→Model and AgentConnection),
 *    or null if not found.
 *
 * Note: Sequelize parameterizes queries under the hood, providing SQL sanitization.
 */
export const getAgentByIdFunction = async (req, res) => {
  try {
    const { userObject } = req;
    const { companyId } = userObject;
    // Find the agent by its ID and company, include related nodes & connections
    const agent = await Agent.findOne({
      where: {
        id: req.params.agentId,
      },
      include: [
        {
          model: AgentNode,
          include: [
            {
              model: Model,
              as: 'Model',
            },
          ],
        },
        {
          model: AgentConnection,
        },
      ],
    });

    if (!agent.tourAgent && agent.companyId !== companyId) {
      console.log('agent not found');
      return null;
    }

    if (!agent) {
      throw new Error('Agent not found');
    }

    // get prompt of each model
    const models = agent.AgentNodes.map((node) => node.Model);
    const prompts = await Promise.all(
      models.map(async (model) => {
        if (model) {
          const prompt = await model.prompt();
          return {
            modelId: model.id,
            prompt,
          };
        }
      })
    );

    const allVersionsPerModel = await Promise.all(
      models.map(async (model) => {
        if (model) {
          const versions = await promptService.getAllPromptVersions(model.id);
          return {
            modelId: model.id,
            versions,
          };
        }
      })
    );

    const extraData = {};

    // Add ModelLog count and last ModelDeployHistory to each AgentNode's Model
    await Promise.all(
      agent.AgentNodes.map(async (node) => {
        if (node.dataValues.modelId) {
          // Count ModelLogs for this model
          const logCount = await db.ModelLog.count({
            where: {
              modelId: node.dataValues.modelId,
              environment: 'production',
            },
          });
          node.Model.modelLogCount = logCount;
          // Get last ModelDeployHistory for this model
          const lastDeploy = await db.ModelDeployHistory.findOne({
            where: { modelId: node.modelId },
            order: [['createdAt', 'DESC']],
          });
          extraData[node.dataValues.modelId] = {
            modelLogCount: logCount,
            lastDeployAt: lastDeploy ? lastDeploy.createdAt : null,
          };
        }
      })
    );

    const modelMetrics = await getModelMetrics(agent.id);

    agent.modelMetrics = modelMetrics;
    return res
      .status(200)
      .json({
        data: {
          ...agent.dataValues,
          modelMetrics,
          prompts,
          allVersionsPerModel,
          extraData,
        },
      });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**
 * Get model optimization status counts for an agent
 * @route GET /agent/:agentId/model-optimization-status
 * @returns { notOptimized, optimizedGood, optimizedBad }
 */
export async function getModelOptimizationStatus(req, res) {
  try {
    const { agentId } = req.params;
    // Get all AgentNodes of type 'model' for this agent
    const agentNodes = await db.AgentNode.findAll({
      where: { agentId, type: 'model', deletedAt: null },
      include: [{ model: db.Model, as: 'Model' }],
    });
    let notOptimized = 0;
    let optimizedGood = 0;
    let optimizedBad = 0;
    for (const node of agentNodes) {
      const model = node.Model;
      if (!model) continue;
      const abTest = await db.ABTestModels.findOne({
        where: { modelId: model.id, deletedAt: null },
      });
      let targetModel = model;
      if (abTest && abTest.optimizedModelId) {
        const optModel = await db.Model.findOne({
          where: { id: abTest.optimizedModelId },
        });
        if (optModel) targetModel = optModel;
      }
      // Get last accuracy metric
      const metric = await db.ModelMetric.findOne({
        where: { modelId: targetModel.id, name: 'accuracy' },
      });
      let lastAccuracy = null;
      if (metric) {
        const lastLog = await db.ModelMetricLog.findOne({
          where: { modelMetricId: metric.id },
          order: [['createdAt', 'DESC']],
        });
        if (lastLog) lastAccuracy = lastLog.value;
      }
      // Fallback to static field if no metric
      if (lastAccuracy === null) lastAccuracy = targetModel.accuracy;
      if (!abTest || !targetModel.isOptimized) {
        notOptimized++;
      } else if (lastAccuracy >= 0.8) {
        optimizedGood++;
      } else {
        optimizedBad++;
      }
    }
    return res.json({ notOptimized, optimizedGood, optimizedBad });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
