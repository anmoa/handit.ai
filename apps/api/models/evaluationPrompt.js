'use strict';

import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class EvaluationPrompt extends Model {
    static associate(models) {
      EvaluationPrompt.hasMany(models.ModelEvaluationPrompt, { foreignKey: 'evaluationPromptId', as: 'modelAssociations' });
      EvaluationPrompt.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
      EvaluationPrompt.belongsTo(models.EvaluatorMetric, { foreignKey: 'metricId', as: 'metric' });
      EvaluationPrompt.belongsTo(models.IntegrationToken, { foreignKey: 'defaultIntegrationTokenId', as: 'defaultIntegrationToken' });
    }

    // Validate that either prompt or function_body is provided based on type
    validatePromptOrFunction() {
      if (this.type === 'prompt' && !this.prompt) {
        throw new Error('Prompt is required when type is "prompt"');
      }
      if (this.type === 'function' && !this.functionBody) {
        throw new Error('Function body is required when type is "function"');
      }
    }
  }
  EvaluationPrompt.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('prompt', 'function'),
      allowNull: false,
      defaultValue: 'prompt',
    },
    isInformative: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_informative',
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: true, // Now nullable since function evaluators won't use it
    },
    functionBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'function_body',
    },
    metricId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'metric_id',
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_global',
      defaultValue: false,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'company_id',
    },
    defaultProviderModel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'default_provider_model',
    },
    defaultIntegrationTokenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'default_integration_token_id',
      references: {
        model: 'IntegrationTokens',
        key: 'id',
      },
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
    modelName: 'EvaluationPrompt',
    tableName: 'EvaluationPrompts',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: function(instance) {
        instance.validatePromptOrFunction();
      },
      beforeCreate: function(instance) {
        instance.validatePromptOrFunction();
      },
      beforeUpdate: function(instance) {
        instance.validatePromptOrFunction();
      },
    },
  });
  return EvaluationPrompt;
}; 