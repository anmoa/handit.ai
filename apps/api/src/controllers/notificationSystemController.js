/**
 * @fileoverview Notification System Controller
 * 
 * This controller provides endpoints for the notification system, including re-engagement campaigns
 * and other notification-related functionality.
 * 
 * Current endpoints:
 * - GET /api/notification-system/inactive-users/:nDays - Get users registered exactly N days ago who are inactive
 * - GET /api/notification-system/inactive-users?startDays=X&endDays=Y - Get users registered between X and Y days ago who are inactive
 * 
 * Inactive users are defined as users whose companies have no agents created.
 * 
 * Example usage:
 * - GET /api/notification-system/inactive-users/5 - Get users registered exactly 5 days ago with no agents
 * - GET /api/notification-system/inactive-users?startDays=3&endDays=7 - Get users registered between 3-7 days ago with no agents
 * 
 * Response format includes:
 * - List of inactive users with company information
 * - Metrics about total registered users vs inactive users
 * - Inactivity rate percentage
 * 
 * Future endpoints can be added here for:
 * - Email notifications
 * - Push notifications
 * - SMS notifications
 * - Webhook notifications
 * - etc.
 */

import db from '../../models/index.js';
import { Op } from 'sequelize';
import { sendBulkReEngagementEmails, sendBulkAgentsWithoutEvaluatorsEmails } from '../services/emailService.js';
import { sendPromptVersionCreatedEmail } from '../services/emailService.js';

const { User, Company, Agent, sequelize, Email, Model, ModelGroup, AgentNode, ModelEvaluationPrompt, EvaluationPrompt } = db;

/**
 * Get completely inactive users (users without any agents or logs) registered in the last N days
 * Uses GET with URL parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInactiveUsers = async (req, res) => {
  try {
    const { nDays } = req.params;
    
    // Validate nDays parameter
    const days = parseInt(nDays);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ 
        error: 'Invalid nDays parameter. Must be a positive number.' 
      });
    }

    // Calculate date range for users registered from N days ago until now
    const endDate = new Date(); // Now
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Start of day N days ago

    endDate.setDate(endDate.getDate() - days);
    endDate.setHours(23, 59, 59, 999);
    

    console.log('Finding inactive users for date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: days,
      description: `From ${days} days ago until now`
    });

    // Get all users registered from N days ago until now
    const usersRegisteredInRange = await User.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        deletedAt: null // Only active users
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null // Only active companies
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'createdAt', 
        'lastLoginAt',
        'companyId'
      ]
    });

    if (usersRegisteredInRange.length === 0) {
      return res.status(200).json({
        message: `No users found registered in the last ${days} days`,
        inactiveUsers: [],
        totalCount: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days: days
        }
      });
    }

    console.log(`Found ${usersRegisteredInRange.length} users registered in the last ${days} days`);

    // Extract company IDs from the users
    const companyIds = [...new Set(usersRegisteredInRange.map(user => user.companyId))];

    // 1. Find companies that have agents (any agents = activity)
    const companiesWithAgents = await Agent.findAll({
      where: {
        companyId: {
          [Op.in]: companyIds
        },
        deletedAt: null
      },
      attributes: ['companyId'],
      group: ['companyId'],
      raw: true
    });

    const companyIdsWithAgents = new Set(
      companiesWithAgents.map(agent => agent.companyId)
    );

    console.log(`Found ${companyIdsWithAgents.size} companies with agents`);

    // 2. Find companies that have agent logs (any agent activity = not inactive)
    const companiesWithAgentLogs = await sequelize.query(`
      SELECT DISTINCT a.company_id as companyId
      FROM "Agents" a
      INNER JOIN "AgentLogs" al ON a.id = al.agent_id
      WHERE a.company_id IN (:companyIds)
        AND a.deleted_at IS NULL
        AND al.deleted_at IS NULL
    `, {
      replacements: { companyIds: companyIds },
      type: sequelize.QueryTypes.SELECT
    });

    const companyIdsWithAgentLogs = new Set(
      companiesWithAgentLogs.map(item => item.companyid || item.companyId)
    );

    console.log(`Found ${companyIdsWithAgentLogs.size} companies with agent logs`);

    // 3. Find companies that have model logs (any model activity = not inactive)
    const companiesWithModelLogs = await sequelize.query(`
      SELECT DISTINCT mg.company_id as companyId
      FROM "ModelGroups" mg
      INNER JOIN "Models" m ON mg.id = m.model_group_id
      INNER JOIN "ModelLogs" ml ON m.id = ml.model_id
      WHERE mg.company_id IN (:companyIds)
        AND mg.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND ml.deleted_at IS NULL
    `, {
      replacements: { companyIds: companyIds },
      type: sequelize.QueryTypes.SELECT
    });

    const companyIdsWithModelLogs = new Set(
      companiesWithModelLogs.map(item => item.companyid || item.companyId)
    );

    console.log(`Found ${companyIdsWithModelLogs.size} companies with model logs`);

    // 4. Combine all active company IDs (companies with ANY activity)
    const allActiveCompanyIds = new Set([
      ...companyIdsWithAgents,
      ...companyIdsWithAgentLogs,
      ...companyIdsWithModelLogs
    ]);

    console.log(`Total companies with any activity: ${allActiveCompanyIds.size}`);

    // 5. Filter users whose companies have NO activity at all
    const completelyInactiveUsers = usersRegisteredInRange.filter(user => 
      !allActiveCompanyIds.has(user.companyId)
    );

    console.log(`Found ${completelyInactiveUsers.length} completely inactive users`);

    // Format the response
    const formattedInactiveUsers = completelyInactiveUsers.map(user => {
      const daysSinceRegistration = Math.floor(
        (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          testMode: user.Company.testMode
        },
        daysSinceRegistration: daysSinceRegistration,
        activityStatus: 'completely_inactive' // No agents, no logs, no activity at all
      };
    });

    // Send re-engagement emails to all inactive users
    let emailResults = {
      sent: 0,
      failed: 0,
      errors: []
    };

    if (completelyInactiveUsers.length > 0) {
      try {
        console.log(`📧 Sending re-engagement emails to ${completelyInactiveUsers.length} inactive users`);
        
        // Prepare user data for email sending
        const emailCandidates = formattedInactiveUsers.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          daysSinceRegistration: user.daysSinceRegistration
        }));

        // Send bulk re-engagement emails
        emailResults = await sendBulkReEngagementEmails({
          inactiveUsers: emailCandidates,
          quickstartUrl: 'https://docs.handit.ai/quickstart',
          Email,
          User,
          notificationSource: 'inactive_users_notification'
        });

        console.log(`✅ Email campaign completed: ${emailResults.sent} sent, ${emailResults.failed} failed`);
      } catch (emailError) {
        console.error('❌ Error sending re-engagement emails:', emailError);
        emailResults.failed = completelyInactiveUsers.length;
        emailResults.errors.push({
          message: 'Failed to send bulk emails',
          error: emailError.message
        });
      }
    }

    return res.status(200).json({
      message: `Found ${completelyInactiveUsers.length} completely inactive users registered in the last ${days} days`,
      description: 'These users have no agents, no agent logs, and no model logs - zero platform activity',
      inactiveUsers: formattedInactiveUsers,
      totalCount: completelyInactiveUsers.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: days,
        description: `From ${days} days ago until now`
      },
      totalUsersRegisteredInRange: usersRegisteredInRange.length,
      activityBreakdown: {
        companiesWithAgents: companyIdsWithAgents.size,
        companiesWithAgentLogs: companyIdsWithAgentLogs.size,
        companiesWithModelLogs: companyIdsWithModelLogs.size,
        totalActiveCompanies: allActiveCompanyIds.size,
        totalCompanies: companyIds.length
      },
      metrics: {
        totalRegistered: usersRegisteredInRange.length,
        completelyInactive: completelyInactiveUsers.length,
        hasAnyActivity: usersRegisteredInRange.length - completelyInactiveUsers.length,
        completeInactivityRate: ((completelyInactiveUsers.length / usersRegisteredInRange.length) * 100).toFixed(2) + '%'
      },
      emailCampaign: {
        sent: emailResults.sent,
        failed: emailResults.failed,
        errors: emailResults.errors,
        campaignExecuted: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getInactiveUsers:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Get inactive users within a date range for bulk re-engagement campaigns
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInactiveUsersRange = async (req, res) => {
  try {
    const { startDays, endDays } = req.query;
    
    // Validate parameters
    const start = parseInt(startDays) || 1;
    const end = parseInt(endDays) || 7;
    
    if (start < 0 || end < 0 || start > end) {
      return res.status(400).json({ 
        error: 'Invalid date range. startDays and endDays must be positive and startDays <= endDays.' 
      });
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - start);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - end);
    startDate.setHours(0, 0, 0, 0);

    // Get all users registered in the date range
    const usersInRange = await User.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'createdAt', 
        'lastLoginAt',
        'companyId'
      ],
      order: [['createdAt', 'DESC']]
    });

    if (usersInRange.length === 0) {
      return res.status(200).json({
        message: `No users found registered between ${start} and ${end} days ago`,
        inactiveUsers: [],
        totalCount: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    }

    // Extract company IDs
    const companyIds = [...new Set(usersInRange.map(user => user.companyId))];

    // Find companies with agents
    const companiesWithAgents = await Agent.findAll({
      where: {
        companyId: {
          [Op.in]: companyIds
        },
        deletedAt: null
      },
      attributes: ['companyId'],
      group: ['companyId'],
      raw: true
    });

    const companyIdsWithAgents = new Set(
      companiesWithAgents.map(agent => agent.companyId)
    );

    // Filter inactive users
    const inactiveUsers = usersInRange.filter(user => 
      !companyIdsWithAgents.has(user.companyId)
    );

    // Format response with additional metrics
    const formattedInactiveUsers = inactiveUsers.map(user => {
      const daysSinceRegistration = Math.floor(
        (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          testMode: user.Company.testMode
        },
        daysSinceRegistration
      };
    });

    return res.status(200).json({
      message: `Found ${inactiveUsers.length} inactive users registered between ${start} and ${end} days ago`,
      inactiveUsers: formattedInactiveUsers,
      totalCount: inactiveUsers.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        startDays: start,
        endDays: end
      },
      metrics: {
        totalRegistered: usersInRange.length,
        inactive: inactiveUsers.length,
        active: usersInRange.length - inactiveUsers.length,
        inactivityRate: ((inactiveUsers.length / usersInRange.length) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error in getInactiveUsersRange:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 

/**
 * Debug endpoint to check what users exist in the database
 * Uses GET with URL parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const debugUsers = async (req, res) => {
  try {
    const { nDays } = req.params;
    const days = parseInt(nDays) || 5;

    // Calculate date range for users registered exactly N days ago
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    
    // Start of the target day (00:00:00)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // End of the target day (23:59:59.999)
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Debug - Date Range:', {
      targetDate: targetDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      daysAgo: days
    });

    // Check total users in database
    const totalUsers = await User.count();
    
    // Check users created in the last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentUsers = await User.findAll({
      where: {
        createdAt: {
          [Op.gte]: last30Days
        },
        deletedAt: null
      },
      attributes: ['id', 'email', 'createdAt', 'companyId'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get users for specific date
    const usersOnTargetDate = await User.findAll({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: false, // Changed to left join to see users without companies
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'companyId']
    });

    return res.status(200).json({
      debug: true,
      dateRange: {
        targetDate: targetDate.toISOString().split('T')[0],
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        daysAgo: days
      },
      statistics: {
        totalUsersInDatabase: totalUsers,
        recentUsersCount: recentUsers.length,
        usersOnTargetDate: usersOnTargetDate.length
      },
      recentUsers: recentUsers.map(user => ({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        companyId: user.companyId,
        daysAgo: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
      })),
      usersOnTargetDate: usersOnTargetDate.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        companyId: user.companyId,
        company: user.Company
      }))
    });

  } catch (error) {
    console.error('Error in debugUsers:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
}; 

/**
 * Test endpoint - Get inactive users from the last N days (not exact day)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInactiveUsersTest = async (req, res) => {
  try {
    const { nDays } = req.params;
    
    // Validate nDays parameter
    const days = parseInt(nDays);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ 
        error: 'Invalid nDays parameter. Must be a positive number.' 
      });
    }

    // Calculate date range for users registered in the last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log('Test - Date Range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: days
    });

    // Get all users registered in the last N days
    const usersInRange = await User.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'createdAt', 
        'lastLoginAt',
        'companyId'
      ]
    });

    if (usersInRange.length === 0) {
      return res.status(200).json({
        message: `No users found registered in the last ${days} days`,
        inactiveUsers: [],
        totalCount: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    }

    // Extract company IDs from the users
    const companyIds = [...new Set(usersInRange.map(user => user.companyId))];

    // Find companies that have agents
    const companiesWithAgents = await Agent.findAll({
      where: {
        companyId: {
          [Op.in]: companyIds
        },
        deletedAt: null
      },
      attributes: ['companyId'],
      group: ['companyId'],
      raw: true
    });

    // Extract company IDs that have agents
    const companyIdsWithAgents = new Set(
      companiesWithAgents.map(agent => agent.companyId)
    );

    // Filter users whose companies don't have agents (inactive users)
    const inactiveUsers = usersInRange.filter(user => 
      !companyIdsWithAgents.has(user.companyId)
    );

    // Format the response
    const formattedInactiveUsers = inactiveUsers.map(user => {
      const daysSinceRegistration = Math.floor(
        (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          testMode: user.Company.testMode
        },
        daysSinceRegistration
      };
    });

    return res.status(200).json({
      message: `Found ${inactiveUsers.length} inactive users registered in the last ${days} days`,
      inactiveUsers: formattedInactiveUsers,
      totalCount: inactiveUsers.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        daysRange: days
      },
      totalUsersInRange: usersInRange.length,
      metrics: {
        totalRegistered: usersInRange.length,
        inactive: inactiveUsers.length,
        active: usersInRange.length - inactiveUsers.length,
        inactivityRate: ((inactiveUsers.length / usersInRange.length) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error in getInactiveUsersTest:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 

/**
 * Get users with agents that don't have evaluators connected, created exactly N days ago
 * Uses GET with URL parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAgentsWithoutEvaluators = async (req, res) => {
  try {
    const { nDays } = req.params;
    
    // Validate nDays parameter
    const days = parseInt(nDays);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ 
        error: 'Invalid nDays parameter. Must be a positive number.' 
      });
    }

    // Calculate date range for agents created exactly N days ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Start of day N days ago

    endDate.setDate(endDate.getDate() - days);
    endDate.setHours(23, 59, 59, 999);

    console.log('Finding agents without evaluators for date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: days,
      description: `Agents created exactly ${days} days ago`
    });

    // Get all agents created exactly N days ago
    const agentsCreatedInRange = await Agent.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        deletedAt: null // Only active agents
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null // Only active companies
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'name',
        'createdAt', 
        'companyId'
      ]
    });

    if (agentsCreatedInRange.length === 0) {
      return res.status(200).json({
        message: `No agents found created exactly ${days} days ago`,
        agentsWithoutEvaluators: [],
        totalCount: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days: days,
          description: `Agents created exactly ${days} days ago`
        }
      });
    }

    // Extract agent IDs
    const agentIds = agentsCreatedInRange.map(agent => agent.id);

    // Find models connected to these agents through AgentNode
    const modelsConnectedToAgents = await sequelize.models.Model.findAll({
      where: {
        deletedAt: null
      },
      include: [
        {
          model: AgentNode,
          required: true,
          as: 'AgentNodes',
          where: {
            agentId: {
              [Op.in]: agentIds
            },
            deletedAt: null
          },
          attributes: ['id', 'agentId', 'name', 'type']
        }
      ],
      attributes: ['id', 'name', 'modelGroupId']
    });

    const modelIds = modelsConnectedToAgents.map(model => model.id);

    // Find models that have evaluators (ModelEvaluationPrompt with isInformative = false)
    const modelsWithEvaluators = await sequelize.models.Model.findAll({
      where: {
        id: {
          [Op.in]: modelIds
        },
        deletedAt: null
      },
      include: [
        {
          model: ModelEvaluationPrompt,
          required: true,
          as: 'evaluationPrompts',
          include: [
            {
              model: EvaluationPrompt,
              required: true,
              as: 'evaluationPrompt',
              where: {
                isInformative: false
              },
              attributes: ['id', 'name', 'type', 'isInformative']
            }
          ]
        }
      ],
      attributes: ['id', 'name', 'modelGroupId']
    });

    const modelIdsWithEvaluators = new Set(
      modelsWithEvaluators.map(model => model.id)
    );

    // Filter models without evaluators
    const modelsWithoutEvaluators = modelsConnectedToAgents.filter(model => 
      !modelIdsWithEvaluators.has(model.id)
    );

    // Get unique agent IDs that have models without evaluators
    const agentIdsWithoutEvaluators = new Set();
    modelsWithoutEvaluators.forEach(model => {
      model.AgentNodes.forEach(node => {
        agentIdsWithoutEvaluators.add(node.agentId);
      });
    });

    // Filter agents that have models without evaluators
    const agentsWithoutEvaluators = agentsCreatedInRange.filter(agent => 
      agentIdsWithoutEvaluators.has(agent.id)
    );

    // Get users for these agents through the company relationship
    const companyIds = [...new Set(agentsWithoutEvaluators.map(agent => agent.companyId))];
    
    const usersWithAgentsWithoutEvaluators = await User.findAll({
      where: {
        companyId: {
          [Op.in]: companyIds
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'createdAt', 
        'lastLoginAt',
        'companyId'
      ]
    });

    // Format the response
    const formattedUsers = usersWithAgentsWithoutEvaluators.map(user => {
      const userAgents = agentsWithoutEvaluators.filter(agent => agent.companyId === user.companyId);
      const daysSinceAgentCreation = Math.floor(
        (new Date() - new Date(userAgents[0].createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          testMode: user.Company.testMode
        },
        daysSinceAgentCreation: daysSinceAgentCreation,
        agents: userAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          createdAt: agent.createdAt
        })),
        activityStatus: 'agents_without_evaluators'
      };
    });

    // Send re-engagement emails to all users with agents without evaluators
    let emailResults = {
      sent: 0,
      failed: 0,
      errors: []
    };

    if (formattedUsers.length > 0) {
      try {
        console.log(`📧 Sending agents without evaluators emails to ${formattedUsers.length} users`);
        
        // Prepare user data for email sending
        const emailCandidates = formattedUsers.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          daysSinceAgentCreation: user.daysSinceAgentCreation
        }));

        // Send bulk emails
        emailResults = await sendBulkAgentsWithoutEvaluatorsEmails({
          agentsWithoutEvaluators: emailCandidates,
          evaluationHubUrl: 'https://dashboard.handit.ai/evaluation-hub',
          Email,
          User,
          notificationSource: 'agents_without_evaluators_notification'
        });

        console.log(`✅ Email campaign completed: ${emailResults.sent} sent, ${emailResults.failed} failed`);
      } catch (emailError) {
        console.error('❌ Error sending agents without evaluators emails:', emailError);
        emailResults.failed = formattedUsers.length;
        emailResults.errors.push({
          message: 'Failed to send bulk emails',
          error: emailError.message
        });
      }
    }

    return res.status(200).json({
      message: `Found ${formattedUsers.length} users with agents created exactly ${days} days ago that don't have evaluators connected`,
      description: 'These users have agents with models but no evaluation prompts connected to them',
      usersWithAgentsWithoutEvaluators: formattedUsers,
      totalCount: formattedUsers.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: days,
        description: `Agents created exactly ${days} days ago`
      },
      totalAgentsCreatedInRange: agentsCreatedInRange.length,
      activityBreakdown: {
        agentsWithEvaluators: agentIds.length - agentIdsWithoutEvaluators.size,
        agentsWithoutEvaluators: agentIdsWithoutEvaluators.size,
        totalAgents: agentsCreatedInRange.length
      },
      metrics: {
        totalAgentsCreated: agentsCreatedInRange.length,
        agentsWithoutEvaluators: agentIdsWithoutEvaluators.size,
        agentsWithEvaluators: agentsCreatedInRange.length - agentIdsWithoutEvaluators.size,
        noEvaluatorsRate: ((agentIdsWithoutEvaluators.size / agentsCreatedInRange.length) * 100).toFixed(2) + '%'
      },
      emailCampaign: {
        sent: emailResults.sent,
        failed: emailResults.failed,
        errors: emailResults.errors,
        campaignExecuted: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getAgentsWithoutEvaluators:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 

/**
 * Test endpoint - Get agents without evaluators from the last N days (broader range)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAgentsWithoutEvaluatorsTest = async (req, res) => {
  try {
    const { nDays } = req.params;
    
    // Validate nDays parameter
    const days = parseInt(nDays);
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ 
        error: 'Invalid nDays parameter. Must be a positive number.' 
      });
    }

    // Calculate date range for agents created in the last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log('Test - Date Range for agents without evaluators:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysRange: days
    });

    // Get all agents created in the last N days
    const agentsInRange = await Agent.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'name',
        'createdAt', 
        'companyId'
      ]
    });

    if (agentsInRange.length === 0) {
      return res.status(200).json({
        message: `No agents found created in the last ${days} days`,
        agentsWithoutEvaluators: [],
        totalCount: 0,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      });
    }

    // Extract agent IDs
    const agentIds = agentsInRange.map(agent => agent.id);

    // Find models connected to these agents through AgentNode
    const modelsConnectedToAgents = await sequelize.models.Model.findAll({
      where: {
        deletedAt: null
      },
      include: [
        {
          model: AgentNode,
          required: true,
          as: 'AgentNodes',
          where: {
            agentId: {
              [Op.in]: agentIds
            },
            deletedAt: null
          },
          attributes: ['id', 'agentId', 'name', 'type']
        }
      ],
      attributes: ['id', 'name', 'modelGroupId']
    });

    const modelIds = modelsConnectedToAgents.map(model => model.id);

    // Find models that have evaluators (ModelEvaluationPrompt with isInformative = false)
    const modelsWithEvaluators = await sequelize.models.Model.findAll({
      where: {
        id: {
          [Op.in]: modelIds
        },
        deletedAt: null
      },
      include: [
        {
          model: ModelEvaluationPrompt,
          required: true,
          as: 'evaluationPrompts',
          include: [
            {
              model: EvaluationPrompt,
              required: true,
              as: 'evaluationPrompt',
              where: {
                isInformative: false
              },
              attributes: ['id', 'name', 'type', 'isInformative']
            }
          ]
        }
      ],
      attributes: ['id', 'name', 'modelGroupId']
    });

    const modelIdsWithEvaluators = new Set(
      modelsWithEvaluators.map(model => model.id)
    );

    // Filter models without evaluators
    const modelsWithoutEvaluators = modelsConnectedToAgents.filter(model => 
      !modelIdsWithEvaluators.has(model.id)
    );

    // Get unique agent IDs that have models without evaluators
    const agentIdsWithoutEvaluators = new Set();
    modelsWithoutEvaluators.forEach(model => {
      model.AgentNodes.forEach(node => {
        agentIdsWithoutEvaluators.add(node.agentId);
      });
    });

    // Filter agents that have models without evaluators
    const agentsWithoutEvaluators = agentsInRange.filter(agent => 
      agentIdsWithoutEvaluators.has(agent.id)
    );

    // Get users for these agents through the company relationship
    const companyIds = [...new Set(agentsWithoutEvaluators.map(agent => agent.companyId))];
    
    const usersWithAgentsWithoutEvaluators = await User.findAll({
      where: {
        companyId: {
          [Op.in]: companyIds
        },
        deletedAt: null
      },
      include: [
        {
          model: Company,
          required: true,
          where: {
            deletedAt: null
          },
          attributes: ['id', 'name', 'testMode']
        }
      ],
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'createdAt', 
        'lastLoginAt',
        'companyId'
      ]
    });

    // Format the response
    const formattedUsers = usersWithAgentsWithoutEvaluators.map(user => {
      const userAgents = agentsWithoutEvaluators.filter(agent => agent.companyId === user.companyId);
      const daysSinceAgentCreation = Math.floor(
        (new Date() - new Date(userAgents[0].createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        registeredAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          testMode: user.Company.testMode
        },
        daysSinceAgentCreation: daysSinceAgentCreation,
        agents: userAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          createdAt: agent.createdAt
        })),
        activityStatus: 'agents_without_evaluators'
      };
    });

    return res.status(200).json({
      message: `Found ${formattedUsers.length} users with agents created in the last ${days} days that don't have evaluators connected`,
      usersWithAgentsWithoutEvaluators: formattedUsers,
      totalCount: formattedUsers.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        daysRange: days
      },
      totalAgentsInRange: agentsInRange.length,
      metrics: {
        totalAgentsCreated: agentsInRange.length,
        agentsWithoutEvaluators: agentIdsWithoutEvaluators.size,
        agentsWithEvaluators: agentsInRange.length - agentIdsWithoutEvaluators.size,
        noEvaluatorsRate: ((agentIdsWithoutEvaluators.size / agentsInRange.length) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error in getAgentsWithoutEvaluatorsTest:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 

/**
 * Test endpoint to simulate sending prompt version created email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const testPromptVersionCreatedEmail = async (req, res) => {
  try {
    const { modelId, agentId, promptVersion, recipientEmail, firstName } = req.body;

    if (!modelId || !agentId || !promptVersion || !recipientEmail || !firstName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: modelId, agentId, promptVersion, recipientEmail, firstName'
      });
    }

    // Get model and agent information
    const model = await Model.findByPk(modelId);
    const agent = await Agent.findByPk(agentId);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Send the email
    await sendPromptVersionCreatedEmail({
      recipientEmail,
      firstName,
      agentName: agent.name,
      modelName: model.name,
      promptVersion,
      agentId,
      modelId,
      Email,
      User,
      notificationSource: 'test_prompt_version_created',
      sourceId: model.id
    });

    res.json({
      success: true,
      message: 'Prompt version created email sent successfully',
      data: {
        recipientEmail,
        agentName: agent.name,
        modelName: model.name,
        promptVersion,
        agentId,
        modelId
      }
    });

  } catch (error) {
    console.error('Error in testPromptVersionCreatedEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
}; 