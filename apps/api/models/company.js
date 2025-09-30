'use strict';
import { Model, Op } from 'sequelize';
import crypto from 'crypto';

export default (sequelize, DataTypes) => {
  class Company extends Model {
    static associate(models) {
      Company.belongsTo(models.IntegrationToken, { foreignKey: 'optimizationTokenId', as: 'optimizationToken' });
    }

    static generateApiToken() {
      return crypto.randomBytes(32).toString('hex'); // Generates a secure token
    }

    static async validateApiToken(token) {
      const company = await this.findOne({
        where: {
          [Op.or]: [
            { apiToken: token },
            { stagingApiToken: token }
          ]
        }
      });

      if (!company) return null;

      return {
        company,
        environment: company.apiToken === token ? 'production' : 'staging'
      };
    }

    async getModels(environment = 'production') {
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });

      return models;
    }

    async getReviewedEntriesMonth(environment = 'production') {
      const date = new Date();

      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });


      const entries = await sequelize.models.ModelLog.findAll({
        where: {
          modelId: models.map(m => m.id),
          processed: true,
          environment,
          updatedAt: {
            [Op.gt]: new Date(date.getFullYear(), date.getMonth(), 1),
          },
        },
      });

      return entries;
    }

    async getDatasets() {
      const datasetGroups = await sequelize.models.DatasetGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const datasets = await sequelize.models.Dataset.findAll({
        where: {
          datasetGroupId: datasetGroups.map(dg => dg.id),
        },
      });

      return datasets;
    }

    async getUsers() {
      const users = await sequelize.models.User.findAll({
        where: {
          companyId: this.id,
        },
      });
      return users;
    }

    async getOptimizationToken() {
      const optimizationTokenId = this.optimizationTokenId;
      if (!optimizationTokenId) {
        return null;
      }
      const optimizationToken = await sequelize.models.IntegrationToken.findOne({
        where: {
          id: optimizationTokenId,
        },
        include: [
          {
            model: sequelize.models.Provider,
            as: 'provider',
            attributes: ['id', 'name'],
          },
        ],
      });
      return optimizationToken;
    }

    async moveModelMetricsToLast30Days() {
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });

      const modelMetrics = await sequelize.models.ModelMetric.findAll({
        where: {
          modelId: models.map(m => m.id),
        },
      });

      for (let i = 0; i < modelMetrics.length; i++) {
        const modelMetric = modelMetrics[i];
        await sequelize.models.ModelMetric.update({
          createdAt: new Date(new Date() - i * 24 * 60 * 60 * 1000),
        }, {
          where: {
            id: modelMetric.id,
          },
        });
      }
    }

    async moveAlertsToLast30Days() {
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });

      const alerts = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          createdAt: {
            [Op.lt]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
      for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];
        await sequelize.models.Alert.update({
          createdAt: new Date(new Date() - Math.floor(Math.random() * 48) * 60 * 60 * 1000),
        }, {
          where: {
            id: alert.id,
          },
        });
      }
    }

    async errorAlertsLast30Days(date = new Date(), environment = 'production') {
      if (this.testMode) {
        this.moveAlertsToLast30Days();
      }
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });
      const alerts = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          type: 'error',
          environment,
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
            [Op.lte]: date,
          },
        },
      });
      return alerts;
    }

    async criticalAlertsLast30Days(date = new Date()) {
      if (this.testMode) {
        this.moveAlertsToLast30Days();
      }
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });
      const alerts = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          severity: 'critical',
          type: 'metric',
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
            [Op.lte]: date,
          },
        },
      });
      return alerts;
    }

    async alertsGroupedByDayLast30Days(date = new Date()) {
      if (this.testMode) {
        this.moveAlertsToLast30Days();
      }
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });
      const alertsInfo = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          severity: 'info',
          type: 'metric',
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const alertsCritical = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          severity: 'critical',
          type: 'metric',
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const errorsCritical = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          type: 'error',
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const groupedAlertsInfo = {}
      const groupedAlertsCritical = {}
      const groupedAlertsError = {}
      // make default last 30 days
      for (let i = 0; i < 30; i++) {
        const date2 = new Date(date - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        groupedAlertsInfo[date2] = [];
      }

      for (let i = 0; i < 30; i++) {
        const date2 = new Date(date - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        groupedAlertsCritical[date2] = [];
      }

      for (let i = 0; i < 30; i++) {
        const date2 = new Date(date - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        groupedAlertsError[date2] = [];
      }

      alertsInfo.forEach((alert) => {
        const date = alert.createdAt.toISOString().split('T')[0];
        if (!groupedAlertsInfo[date]) {
          groupedAlertsInfo[date] = [];
        }
        groupedAlertsInfo[date].push(alert);
      });

      alertsCritical.forEach((alert) => {
        const date = alert.createdAt.toISOString().split('T')[0];
        if (!groupedAlertsCritical[date]) {
          groupedAlertsCritical[date] = [];
        }
        groupedAlertsCritical[date].push(alert);
      });

      errorsCritical.forEach((alert) => {
        const date = alert.createdAt.toISOString().split('T')[0];
        if (!groupedAlertsError[date]) {
          groupedAlertsError[date] = [];
        }
        groupedAlertsError[date].push(alert);
      });
      

      return {
        info: groupedAlertsInfo,
        critical: groupedAlertsCritical,
        error: groupedAlertsError,
      };
    }

    async modelLogsLast30Days(date = new Date()) {
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });
      const modelLogs = await sequelize.models.ModelLog.count({
        where: {
          modelId: models.map(m => m.id),
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
            [Op.lte]: date,
          },
        },
      });
      return modelLogs;
    }

    async infoAlertsLast30Days(date = new Date()) {
      if (this.testMode) {
        this.moveAlertsToLast30Days();
      }
      const modelGroups = await sequelize.models.ModelGroup.findAll({
        where: {
          companyId: this.id,
        },
      });

      const models = await sequelize.models.Model.findAll({
        where: {
          modelGroupId: modelGroups.map(mg => mg.id),
        },
      });
      const alerts = await sequelize.models.Alert.findAll({
        where: {
          modelId: models.map(m => m.id),
          severity: 'info',
          type: 'metric',
          createdAt: {
            [Op.gt]: new Date(date - 30 * 24 * 60 * 60 * 1000),
            [Op.lte]: date,
          },
        },
      });
      return alerts;
    }
  }
  Company.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nationalId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'national_id'
    },
    testMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'test_mode'
    },
    apiToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      defaultValue: () => Company.generateApiToken(),
      field: 'api_token'
    },
    stagingApiToken: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: () => Company.generateApiToken(),
      field: 'staging_api_token'
    },
    activeMessages: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'active_messages'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    },
    optimizationTokenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'optimization_token_id',
    },
    optimizationModel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'optimization_model',
    },
    showTrackedNodesOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'show_tracked_nodes_only',
      comment: 'Flag to indicate if company should show only tracked nodes in tracing instead of full structure'
    },
  }, {
    sequelize,
    modelName: 'Company',
    timestamps: true,
    paranoid: true,
  });
  return Company;
};
