'use strict';

import { Model } from 'sequelize';
import {
  singleEvaluate,
} from '../src/services/evaluationService.js';

export default (sequelize, DataTypes) => {
  class ModelEvaluationPrompt extends Model {
    static associate(models) {
      ModelEvaluationPrompt.belongsTo(models.Model, { foreignKey: 'modelId', as: 'model' });
      ModelEvaluationPrompt.belongsTo(models.EvaluationPrompt, { foreignKey: 'evaluationPromptId', as: 'evaluationPrompt' });
      ModelEvaluationPrompt.belongsTo(models.IntegrationToken, { foreignKey: 'integrationTokenId', as: 'integrationToken' });
    }
  }
  ModelEvaluationPrompt.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    modelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'model_id',
    },
    evaluationPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'evaluation_prompt_id',
    },
    integrationTokenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'integration_token_id',
    },
    providerModel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'provider_model',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  }, {
    sequelize,
    modelName: 'ModelEvaluationPrompt',
    tableName: 'ModelEvaluationPrompts',
    timestamps: true,
    underscored: true,
    hooks: {
      afterCreate: async (modelEvaluationPrompt) => {
        const promptId = modelEvaluationPrompt.evaluationPromptId;
        const prompt = await sequelize.models.EvaluationPrompt.findByPk(promptId);

        const modelMetric = await sequelize.models.ModelMetric.findOne({
          where: {
            modelId: modelEvaluationPrompt.modelId,
            name: prompt.name,
          },
        });

        if (!modelMetric) {
          // Determine metric type based on evaluator type
          const metricType = prompt.type === 'function' ? 'function' : 'oss';
          
          await sequelize.models.ModelMetric.create({
            modelId: modelEvaluationPrompt.modelId,
            name: prompt.name,
            type: metricType,
            label: prompt.name,
            description: prompt.name,
            threshold: 1,
          });
        }

        const abTests = await sequelize.models.ABTestModels.findAll({
          where: {
            modelId: modelEvaluationPrompt.modelId,
          },
        });
        
        for (let i = 0; i < abTests.length; i++) {
          const abTest = abTests[i];
          const modelMetric = await sequelize.models.ModelMetric.findOne({
            where: {
              modelId: abTest.optimizedModelId,
              name: prompt.name,
            },
          });

          if (!modelMetric) {
            // Determine metric type based on evaluator type
            const metricType = prompt.type === 'function' ? 'function' : 'oss';
            
            await sequelize.models.ModelMetric.create({
              modelId: abTest.optimizedModelId,
              name: prompt.name,
              type: metricType,
              label: prompt.name,
              description: prompt.name,
              threshold: 1,
            });
          }

          await setImmediate(async () => {
            // get last 5 model logs of the model
            const modelLogs = await sequelize.models.ModelLog.findAll({
              where: {
                modelId: modelEvaluationPrompt.modelId,
              },
              order: [['createdAt', 'DESC']],
              limit: 5,
            });

            const model = await sequelize.models.Model.findByPk(modelEvaluationPrompt.modelId);
            if (!model) {
              return;
            }

            const reviewers = await model.getReviewers();
              for (let i = 0; i < reviewers.length; i++) {
                const reviewer = reviewers[i];

                const reviewerInstance = await sequelize.models.Model.findOne({
                  where: {
                    id: reviewer.reviewerId,
                  },
                });

                for (let j = 0; j < modelLogs.length; j++) {
                  const modelLog = modelLogs[j];
                  const modelId = modelLog.modelId;
                  const model = await sequelize.models.Model.findByPk(modelId);
                  const prompts = await model.evaluationPrompts();
                  await singleEvaluate(
                    modelLog,
                    reviewerInstance,
                    prompts,
                    model.flags?.isN8N,
                    sequelize.models.EvaluationLog
                  );
                }   
              }
          });
        }
      }
    }
  });
  return ModelEvaluationPrompt;
}; 