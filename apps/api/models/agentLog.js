'use strict';
import { Model } from 'sequelize';
import { redisService } from '../src/services/redisService.js';

export default (sequelize, DataTypes) => {
  class AgentLog extends Model {
    static associate(models) {
      AgentLog.belongsTo(models.Agent, { foreignKey: 'agent_id' });
      AgentLog.hasMany(models.ModelLog, { foreignKey: 'agent_log_id' });
      AgentLog.hasMany(models.ToolLog, { foreignKey: 'agent_log_id' });
    }

    static async clearAgentCache(agentId) {
      try {
        // Clear metadata cache
        console.log('Clearing metadata cache for agent:', agentId);
        await redisService.delete(`agent-entries-metadata:${agentId}`);
        
        // Get all keys that start with agent-entries:${agentId}
        const pattern = `agent-entries:${agentId}:*`;
        await redisService.deletePattern(pattern);
      } catch (error) {
        console.error('Error clearing agent cache:', error);
      }
    }
  }

  AgentLog.init({
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'agent_id'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'A brief summary of the agent execution'
    },
    input: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Initial input to the agent'
    },
    output: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Final output from the agent'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'error', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the agent execution'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total duration of agent execution in milliseconds'
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'external_id',
      comment: 'External ID of the agent execution'
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'session_id',
      comment: 'Session ID of the agent execution'
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'error_details',
      comment: 'Error information if status is error'
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
    environment: {
      type: DataTypes.ENUM('production', 'staging'),
      allowNull: false,
      defaultValue: 'production'
    }
  }, {
    sequelize,
    modelName: 'AgentLog',
    tableName: 'AgentLogs',
    timestamps: true,
    paranoid: true,
    hooks: {
      afterCreate: async (agentLog) => {
        setImmediate(async () => {
          try {
            await AgentLog.clearAgentCache(agentLog.agentId);

            const { generateSummary } = await import('../src/services/summaryService.js');

            // Generate summary if input exists and summary is not set
            if (agentLog.output && !agentLog.summary) {
              const summary = await generateSummary(agentLog.output, agentLog.Agent.name, agentLog.Agent.description);
              if (summary) {
                await agentLog.update({ summary }, { hooks: false });
              }
            }

            // Clear cache instead of updating it
          } catch (error) {
            console.error('Error in AgentLog afterCreate hook:', error);
          }
        });
      },
      afterUpdate: async (agentLog) => {
        setImmediate(async () => {
          try {
            await AgentLog.clearAgentCache(agentLog.agentId);

            const { generateSummary } = await import('../src/services/summaryService.js');
            const agent = await sequelize.models.Agent.findByPk(agentLog.agentId);
            // Generate summary if input was updated and summary is not set
            if (agentLog.output && !agentLog.summary) {
              const summary = await generateSummary(agentLog.output, agent.name, agent.description, agent?.firstNode?.name || '');
              if (summary) {
                await agentLog.update({ summary: (summary || '').replaceAll('"', '') }, { hooks: false });
              }
            }

            // Clear cache instead of updating it
          } catch (error) {
            console.error('Error in AgentLog afterUpdate hook:', error);
          }
        });
      }
    }
  });

  return AgentLog;
}; 