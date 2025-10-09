import { Op } from 'sequelize';
import { getModelMetricsFullDate } from './modelMetricsCalculationService.js';
import db from '../../models/index.js';
import { redisService } from './redisService.js';

const { AgentNodeLog, AgentNode, Model, ModelMetric } = db;

export const getAgentMetricsById = async (agent) => {
  // Get all model nodes with their models and metrics
  const modelNodes = await AgentNode.findAll({
    where: {
      agentId: agent.id,
      type: 'model',
    },
    include: [
      {
        model: Model,
        as: 'Model',
        include: [
          {
            model: ModelMetric,
            where: {
              name: {
                [Op.ne]: 'Healtcheck',
              },
            },
          },
        ],
      },
    ],
  });

  // Get individual model metrics and calculate averages
  const { modelMetrics, aggregatedModelMetrics } = await processModelMetrics(
    modelNodes
  );

  // Get tool metrics and their aggregates
  const { toolMetrics, aggregatedToolMetrics } = await processToolMetrics(
    agent.id
  );

  // After calculating new metrics, invalidate cache
  await invalidateAgentMetricsCache(agent.id);

  return {
    agentId: agent.id,
    agentName: agent.name,
    metrics: {
      models: aggregatedModelMetrics,
      tools: aggregatedToolMetrics,
    },
    details: {
      modelMetrics,
      toolMetrics,
    },
  };
};

async function processModelMetrics(modelNodes) {
  // Get detailed metrics for each model
  const modelMetricsPromises = modelNodes.map(async (node) => {
    const model = await Model.findByPk(node.modelId);
    if (!model) return null;

    const metrics = await model.saveMetricsFullDateInCache();
    return {
      nodeId: node.id,
      nodeName: node.name,
      modelId: model.id,
      modelName: model.name,
      metrics,
    };
  });

  const modelMetrics = (await Promise.all(modelMetricsPromises)).filter(
    (m) => m !== null
  );

  // Define priority metrics and initialize only existing ones
  const priorityMetrics = ['accuracy', 'precision', 'recall', 'f1'];
  const existingMetrics = new Set();

  // Check which metrics exist in the data
  modelMetrics.forEach((modelData) => {
    if (!modelData.metrics?.baseModelMetric) return;
    modelData.metrics.baseModelMetric.modelMetrics.forEach((metric) => {
      if (priorityMetrics.includes(metric.name)) {
        existingMetrics.add(metric.name);
      }
    });
  });

  // If we don't have all 4 priority metrics, check for additional ones
  const additionalMetrics = ['averageRelevance', 'averageCoherence'];
  if (existingMetrics.size < 4) {
    modelMetrics.forEach((modelData) => {
      if (!modelData.metrics?.baseModelMetric) return;
      modelData.metrics.baseModelMetric.modelMetrics.forEach((metric) => {
        if (
          existingMetrics.size < 4 &&
          additionalMetrics.includes(metric.name)
        ) {
          existingMetrics.add(metric.name);
        }
      });
    });
  }

  // Initialize aggregated metrics structure only for existing metrics
  const aggregatedModelMetrics = {};
  existingMetrics.forEach((metricName) => {
    aggregatedModelMetrics[metricName] = {
      daily: {},
      average: 0,
      count: 0,
    };
  });

  // Initialize daily data for last 30 days
  const days = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(new Date() - i * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    const dayKey = date.toISOString();
    days[dayKey] = true;

    Object.keys(aggregatedModelMetrics).forEach((metric) => {
      aggregatedModelMetrics[metric].daily[dayKey] = {
        sum: 0,
        count: 0,
      };
    });
  }

  // Process each model's metrics
  modelMetrics.forEach((modelData) => {
    if (!modelData.metrics?.baseModelMetric?.modelMetrics) return;

    // Process base metrics
    modelData.metrics.baseModelMetric.modelMetrics.forEach((metric) => {
      const metricName = metric.dataValues.name;
      if (!aggregatedModelMetrics[metricName]) return;

      // Process daily base metrics
      Object.entries(
        modelData.metrics?.baseModelMetric?.lastMetricLogs || {}
      ).forEach(([day, logs]) => {
        const formattedDay = new Date(day).toISOString();
        if (!days[formattedDay]) return;
        const value = logs[metric.dataValues.id];
          if (value && typeof value === 'number') {
            aggregatedModelMetrics[metricName].daily[formattedDay].sum += value;
            aggregatedModelMetrics[metricName].daily[formattedDay].count++;
          }
      });
    });
  });

  // Calculate final averages
  Object.keys(aggregatedModelMetrics).forEach((metricName) => {
    let totalSum = 0;
    let totalCount = 0;

    // Calculate daily averages and overall totals for base metrics
    Object.keys(aggregatedModelMetrics[metricName].daily).forEach((day) => {
      const dayData = aggregatedModelMetrics[metricName].daily[day];
      if (dayData.count > 0) {
        dayData.average = dayData.sum / dayData.count;
        totalSum += dayData.sum;
        totalCount += dayData.count;
      }
      // Replace sum/count with just the average
      aggregatedModelMetrics[metricName].daily[day] = dayData.average || 0;
    });

    // Calculate overall averages
    aggregatedModelMetrics[metricName].average =
      totalCount > 0 ? totalSum / totalCount : 0;
    aggregatedModelMetrics[metricName].count = totalCount;
  });

  return { modelMetrics, aggregatedModelMetrics };
}

async function processToolMetrics(agentId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all tool nodes
  const toolNodes = await AgentNode.findAll({
    where: {
      agentId,
      type: 'tool',
    },
    include: [
      {
        model: db.Agent, // Include Agent first
        include: [
          {
            model: db.Company, // Then include Company through Agent
          },
        ],
      },
    ],
  });

  // Check if company is in test mode
  const isTestMode = toolNodes[0]?.Agent?.Company?.testMode || toolNodes[0]?.Agent?.tourAgent;

  if (isTestMode) {
    return generateMockToolMetrics(toolNodes);
  }

  // Get all tool nodes and their logs
  const toolNodesLogs = await AgentNode.findAll({
    where: {
      agentId,
      type: 'tool',
    },
  });

  // Process individual tool metrics
  const toolMetricsPromises = toolNodesLogs.map(async (node) => {
    const logs = await AgentNodeLog.findAll({
      where: {
        agentNodeId: node.id,
        createdAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
    });

    return processToolNodeMetrics(node, logs);
  });

  const toolMetrics = await Promise.all(toolMetricsPromises);

  // Calculate aggregated tool metrics
  const aggregatedToolMetrics = {
    overall: {
      totalCalls: 0,
      successRate: 0,
      errorRate: 0,
      avgDuration: 0,
    },
    daily: {},
  };

  // Initialize daily data
  for (let i = 0; i < 30; i++) {
    const date = new Date(new Date() - i * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    const dayKey = date.toISOString();
    aggregatedToolMetrics.daily[dayKey] = {
      calls: 0,
      successCount: 0,
      errorCount: 0,
      avgDuration: 0,
    };
  }

  // Aggregate metrics from all tools
  toolMetrics.forEach((tool) => {
    aggregatedToolMetrics.overall.totalCalls += tool.totalCalls;

    Object.entries(tool.byDay).forEach(([day, metrics]) => {
      if (aggregatedToolMetrics.daily[day]) {
        aggregatedToolMetrics.daily[day].calls += metrics.calls;
        aggregatedToolMetrics.daily[day].successCount += metrics.successCount;
        aggregatedToolMetrics.daily[day].errorCount +=
          metrics.calls - metrics.successCount;
        aggregatedToolMetrics.daily[day].avgDuration +=
          metrics.avgDuration * metrics.calls;
      }
    });
  });

  // Calculate final averages for daily metrics
  Object.keys(aggregatedToolMetrics.daily).forEach((day) => {
    const dayMetrics = aggregatedToolMetrics.daily[day];
    if (dayMetrics.calls > 0) {
      dayMetrics.avgDuration = dayMetrics.avgDuration / dayMetrics.calls;
      dayMetrics.successRate =
        (dayMetrics.successCount / dayMetrics.calls) * 100;
      dayMetrics.errorRate = (dayMetrics.errorCount / dayMetrics.calls) * 100;
    }
  });

  // Calculate overall metrics
  aggregatedToolMetrics.overall = {
    totalCalls: aggregatedToolMetrics.overall.totalCalls,
    successRate: aggregatedToolMetrics.overall.successRate,
    errorRate: aggregatedToolMetrics.overall.errorRate,
    avgDuration: aggregatedToolMetrics.overall.avgDuration,
  };

  return { toolMetrics, aggregatedToolMetrics };
}

function processToolNodeMetrics(node, logs) {
  const metrics = {
    nodeId: node.id,
    nodeName: node.name,
    operationType: node.config?.operationType,
    totalCalls: logs.length,
    successRate: 0,
    avgDuration: 0,
    byDay: {},
  };

  // Initialize days
  for (let i = 0; i < 30; i++) {
    const date = new Date(new Date() - i * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    metrics.byDay[date.toISOString()] = {
      calls: 0,
      successCount: 0,
      avgDuration: 0,
    };
  }

  // Process logs
  logs.forEach((log) => {
    const day = new Date(log.createdAt);
    day.setHours(0, 0, 0, 0);
    const dayKey = day.toISOString();

    if (metrics.byDay[dayKey]) {
      metrics.byDay[dayKey].calls++;
      if (log.status === 'success') {
        metrics.byDay[dayKey].successCount++;
      }
      metrics.byDay[dayKey].avgDuration += log.duration || 0;
    }
  });

  // Calculate averages
  Object.values(metrics.byDay).forEach((dayMetrics) => {
    if (dayMetrics.calls > 0) {
      dayMetrics.avgDuration = dayMetrics.avgDuration / dayMetrics.calls;
      dayMetrics.successRate =
        (dayMetrics.successCount / dayMetrics.calls) * 100;
    }
  });

  const successCount = logs.filter((log) => log.status === 'success').length;
  metrics.successRate = (successCount / logs.length) * 100 || 0;
  metrics.avgDuration =
    logs.reduce((acc, log) => acc + (log.duration || 0), 0) / logs.length || 0;

  return metrics;
}

function generateMockToolMetrics(toolNodes) {
  const toolMetrics = toolNodes.map((node) => {
    // Start with slightly lower base metrics to show improvement
    const baseSuccessRate = 75 + Math.random() * 5; // Start with 75-80% success rate
    const baseAvgDuration = 250 + Math.random() * 50; // Start with higher duration 250-300ms
    const baseCallsStart = 50 + Math.random() * 20; // Start with fewer calls 50-70
    const baseCallsEnd = 120 + Math.random() * 30; // End with more calls 120-150

    const metrics = {
      nodeId: node.id,
      nodeName: node.name,
      operationType: node.config?.operationType || 'http_call',
      totalCalls: 0,
      successRate: 0,
      avgDuration: 0,
      byDay: {},
    };

    let totalCalls = 0;
    let totalSuccessful = 0;
    let totalDuration = 0;

    // Generate daily data for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayKey = date.toISOString();

      // Stronger improvement trend (more recent days are better)
      const dayProgress = (30 - i) / 30; // 0 to 1 scale, higher for recent days
      const improvementFactor = 1 + dayProgress * 0.3; // Up to 30% improvement

      // Calculate daily calls with growth trend
      const dailyCallsBase =
        baseCallsStart + (baseCallsEnd - baseCallsStart) * dayProgress;

      // Add weekly patterns
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const weekendFactor = isWeekend ? 0.7 : 1;

      // Smaller daily variations for more stable trend
      const dailyVariation = 0.95 + Math.random() * 0.1; // ±5% variation

      // Calculate metrics with all factors
      const successRate = Math.min(
        99.9,
        baseSuccessRate * improvementFactor * dailyVariation
      );
      // Duration decreases over time (improvement)
      const avgDuration =
        baseAvgDuration * (1 / improvementFactor) * dailyVariation;
      const calls = Math.round(dailyCallsBase * weekendFactor * dailyVariation);

      // Reduced chance of incidents in recent days
      const incidentChance = 0.05 * (1 - dayProgress); // Less likely in recent days
      const hasIncident = Math.random() < incidentChance;

      if (hasIncident) {
        // Less severe incidents in recent days
        const severityFactor = 0.7 + dayProgress * 0.2; // Incidents are less severe in recent days
        metrics.byDay[dayKey] = {
          calls: Math.round(calls * severityFactor),
          successCount: Math.round(calls * severityFactor * 0.7),
          avgDuration: avgDuration * (1.5 - dayProgress * 0.3), // Less duration impact in recent days
          successRate: 70 + dayProgress * 20 + Math.random() * 5, // Better success rate in recent incidents
        };
      } else {
        metrics.byDay[dayKey] = {
          calls,
          successCount: Math.round(calls * (successRate / 100)),
          avgDuration,
          successRate,
        };
      }

      totalCalls += metrics.byDay[dayKey].calls;
      totalSuccessful += metrics.byDay[dayKey].successCount;
      totalDuration +=
        metrics.byDay[dayKey].avgDuration * metrics.byDay[dayKey].calls;
    }

    // Calculate overall metrics
    metrics.totalCalls = totalCalls;
    metrics.successRate = (totalSuccessful / totalCalls) * 100;
    metrics.avgDuration = totalDuration / totalCalls;

    return metrics;
  });

  // Calculate aggregated metrics
  const aggregatedToolMetrics = {
    overall: {
      totalCalls: 0,
      successRate: 0,
      errorRate: 0,
      avgDuration: 0,
    },
    daily: {},
  };

  // Initialize daily data
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dayKey = date.toISOString();
    aggregatedToolMetrics.daily[dayKey] = {
      calls: 0,
      successCount: 0,
      errorCount: 0,
      avgDuration: 0,
      successRate: 0,
      errorRate: 0,
    };
  }

  // Aggregate metrics from all tools
  let totalCalls = 0;
  let totalSuccessful = 0;
  let totalDuration = 0;

  toolMetrics.forEach((tool) => {
    Object.entries(tool.byDay).forEach(([day, metrics]) => {
      if (aggregatedToolMetrics.daily[day]) {
        aggregatedToolMetrics.daily[day].calls += metrics.calls;
        aggregatedToolMetrics.daily[day].successCount += metrics.successCount;
        aggregatedToolMetrics.daily[day].errorCount +=
          metrics.calls - metrics.successCount;
        aggregatedToolMetrics.daily[day].avgDuration +=
          metrics.avgDuration * metrics.calls;

        totalCalls += metrics.calls;
        totalSuccessful += metrics.successCount;
        totalDuration += metrics.avgDuration * metrics.calls;
      }
    });
  });

  // Calculate final averages for daily metrics
  Object.keys(aggregatedToolMetrics.daily).forEach((day) => {
    const dayMetrics = aggregatedToolMetrics.daily[day];
    if (dayMetrics.calls > 0) {
      dayMetrics.avgDuration = dayMetrics.avgDuration / dayMetrics.calls;
      dayMetrics.successRate =
        (dayMetrics.successCount / dayMetrics.calls) * 100;
      dayMetrics.errorRate = (dayMetrics.errorCount / dayMetrics.calls) * 100;
    }
  });

  // Calculate overall metrics
  aggregatedToolMetrics.overall = {
    totalCalls,
    successRate: (totalSuccessful / totalCalls) * 100,
    errorRate: ((totalCalls - totalSuccessful) / totalCalls) * 100,
    avgDuration: totalDuration / totalCalls,
  };

  return { toolMetrics, aggregatedToolMetrics };
}

export const getAgentComparisonMetricsLastMonth = async (agent) => {
  // First check if company is in test mode
  const isTestMode = agent.Company?.testMode;

  if (isTestMode) {
    return generateMockComparisonMetrics();
  }

  // Rest of the original code for real data...
  const modelNodes = agent.AgentNodes;

  // Get comparison metrics for each model
  const modelMetricsPromises = modelNodes.map(async (node) => {
    const model = node.Model;
    if (!model) return null;

    return await model.getComparisonMetricsLastMonth();
  });

  const modelMetrics = (await Promise.all(modelMetricsPromises)).filter(
    Boolean
  );

  if (modelMetrics.length === 0) {
    return {
      lastModelMetrics: {},
      avgModelMetricsLastMonth: {},
      avgModelMetricsCurrentMonth: {},
    };
  }

  // Initialize aggregated metrics
  const aggregatedMetrics = {
    lastModelMetrics: {},
    avgModelMetricsLastMonth: {},
    avgModelMetricsCurrentMonth: {},
  };

  // Helper function to calculate average metrics
  const calculateAverageMetrics = (metricsArray) => {
    const sums = {};
    const counts = {};

    metricsArray.forEach((metrics) => {
      Object.entries(metrics).forEach(([metricId, value]) => {
        if (typeof value === 'number') {
          sums[metricId] = (sums[metricId] || 0) + value;
          counts[metricId] = (counts[metricId] || 0) + 1;
        }
      });
    });

    const averages = {};
    Object.entries(sums).forEach(([metricId, sum]) => {
      averages[metricId] = sum / counts[metricId];
    });

    return averages;
  };

  const transformedModelMetrics = [];
  for (const modelMetric of modelMetrics) {
    const avgModelTransformed = {};
    for (const [metricId, value] of Object.entries(
      modelMetric.avgModelMetricsLastMonth
    )) {
      avgModelTransformed[
        modelMetric.lastModelMetrics[metricId].dataValues.label
      ] = value;
    }
    const avgModelCurrentMonthTransformed = {};
    for (const [metricId, value] of Object.entries(
      modelMetric.avgModelMetricsCurrentMonth
    )) {
      if (modelMetric.lastModelMetrics[metricId]?.dataValues?.label) {
        avgModelCurrentMonthTransformed[
          modelMetric.lastModelMetrics[metricId]?.dataValues?.label
        ] = value;
      }
    }
    transformedModelMetrics.push({
      lastModelMetrics: modelMetric.lastModelMetrics,
      avgModelMetricsLastMonth: avgModelTransformed,
      avgModelMetricsCurrentMonth: avgModelCurrentMonthTransformed,
    });
  }

  // Process last model metrics
  const lastModelMetricsArray = transformedModelMetrics.map(
    (m) => m.lastModelMetrics
  );
  aggregatedMetrics.lastModelMetrics = calculateAverageMetrics(
    lastModelMetricsArray
  );

  // Process last month averages
  const lastMonthMetricsArray = transformedModelMetrics.map(
    (m) => m.avgModelMetricsLastMonth
  );
  aggregatedMetrics.avgModelMetricsLastMonth = calculateAverageMetrics(
    lastMonthMetricsArray
  );

  // Process current month averages
  const currentMonthMetricsArray = transformedModelMetrics.map(
    (m) => m.avgModelMetricsCurrentMonth
  );
  aggregatedMetrics.avgModelMetricsCurrentMonth = calculateAverageMetrics(
    currentMonthMetricsArray
  );

  // After calculating new metrics, invalidate cache
  await invalidateAgentMetricsCache(agent.id);

    return aggregatedMetrics;

};

export function generateMockComparisonMetrics() {
  try {
    // Base metrics for last month (slightly lower)
    const baseMetrics = {
      accuracy: 82 + Math.random() * 3, // 82-85%
      precision: 80 + Math.random() * 3, // 80-83%
      recall: 78 + Math.random() * 3, // 78-81%
      f1: 79 + Math.random() * 3, // 79-82%
    };

    // Improvement factors for current month (5-15% better)
    const improvementFactor = 1.05 + Math.random() * 0.1;

    // Most recent metrics (even better, 2-5% improvement over current month)
    const recentImprovementFactor =
      improvementFactor + (0.02 + Math.random() * 0.03);

    // Generate the metrics with improvements
    const lastModelMetrics = {};
    const avgModelMetricsLastMonth = {};
    const avgModelMetricsCurrentMonth = {};

    Object.entries(baseMetrics).forEach(([metric, baseValue]) => {
      // Last month metrics (base values)
      avgModelMetricsLastMonth[metric] = Math.min(99.9, baseValue);

      // Current month metrics (improved)
      avgModelMetricsCurrentMonth[metric] = Math.min(
        99.9,
        baseValue * improvementFactor
      );

      // Most recent metrics (even better)
      lastModelMetrics[metric] = Math.min(
        99.9,
        baseValue * recentImprovementFactor
      );
    });

    // Add some natural variations
    const addVariation = (metrics) => {
      Object.keys(metrics).forEach((key) => {
        // Add small random variation (±1%)
        metrics[key] += Math.random() * 2 - 1;
        // Ensure we don't exceed 100%
        metrics[key] = Math.min(99.9, Math.max(0, metrics[key]));
        // Round to 2 decimal places
        metrics[key] = Math.round(metrics[key] * 100) / 100;
      });
    };

    addVariation(avgModelMetricsLastMonth);
    addVariation(avgModelMetricsCurrentMonth);
    addVariation(lastModelMetrics);

    // Format the metrics to match the expected structure
    const transformMetrics = (metrics) => {
      const transformed = {};
      Object.entries(metrics).forEach(([key, value], index) => {
        transformed[index + 1] = {
          dataValues: {
            label: key,
            value: value,
          },
        };
      });
      return transformed;
    };

    return {
      lastModelMetrics: transformMetrics(lastModelMetrics),
      avgModelMetricsLastMonth: avgModelMetricsLastMonth,
      avgModelMetricsCurrentMonth: avgModelMetricsCurrentMonth,
    };
  } catch (error) {
    console.log(error);
  }
}

export const getAgentToolComparisonMetricsLastMonth = async (node) => {
  // First check if company is in test mode by getting the agent and company
  const agent = await node.getAgent({
    include: [
      {
        model: db.Company,
      },
    ],
  });

  if (agent?.Company?.testMode) {
    return generateMockToolComparisonMetrics();
  }

  // Original implementation for non-test mode...
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Get logs for each tool node
  const toolMetricsPromises = [node].map(async (node) => {
    // Get logs for last month
    const lastMonthLogs = await AgentNodeLog.findAll({
      where: {
        agentNodeId: node.id,
        createdAt: {
          [Op.gt]: thirtyDaysAgo,
        },
      },
    });

    // Get logs for previous month
    const previousMonthLogs = await AgentNodeLog.findAll({
      where: {
        agentNodeId: node.id,
        createdAt: {
          [Op.gt]: sixtyDaysAgo,
          [Op.lte]: thirtyDaysAgo,
        },
      },
    });

    // Get most recent logs
    const recentLogs = await AgentNodeLog.findAll({
      where: {
        agentNodeId: node.id,
      },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });

    return {
      nodeId: node.id,
      lastMonthLogs,
      previousMonthLogs,
      recentLogs,
    };
  });

  const toolMetrics = await Promise.all(toolMetricsPromises);

  // Calculate metrics for each period
  const calculateMetrics = (logs) => {
    if (!logs || logs.length === 0) {
      return {
        successRate: 0,
        avgDuration: 0,
        calls: 0,
      };
    }

    const successCount = logs.filter((log) => log.status === 'success').length;
    const totalDuration = logs.reduce(
      (acc, log) => acc + (log.duration || 0),
      0
    );

    return {
      successRate: (successCount / logs.length) * 100,
      avgDuration: totalDuration / logs.length,
      calls: logs.length,
    };
  };

  // Aggregate metrics across all tools
  const aggregateMetrics = (toolsData, logType) => {
    const metrics = toolsData.map((tool) => calculateMetrics(tool[logType]));

    if (metrics.length === 0) {
      return {
        successRate: 0,
        avgDuration: 0,
        calls: 0,
      };
    }

    return {
      successRate:
        metrics.reduce((acc, m) => acc + m.successRate, 0) / metrics.length,
      avgDuration:
        metrics.reduce((acc, m) => acc + m.avgDuration, 0) / metrics.length,
      calls: metrics.reduce((acc, m) => acc + m.calls, 0),
    };
  };

  // Calculate aggregated metrics for each period
  const lastModelMetrics = aggregateMetrics(toolMetrics, 'recentLogs');
  const avgModelMetricsCurrentMonth = aggregateMetrics(
    toolMetrics,
    'lastMonthLogs'
  );
  const avgModelMetricsLastMonth = aggregateMetrics(
    toolMetrics,
    'previousMonthLogs'
  );

  // Transform metrics to match the model metrics format
  const transformMetrics = (metrics) => {
    return {
      'Success Rate': metrics.successRate,
      'Average Duration': metrics.avgDuration,
      'Total Calls': metrics.calls,
    };
  };

  // After calculating new metrics, invalidate cache
  await invalidateAgentNodeMetricsCache(node.id);

  return {
    lastModelMetrics: transformMetrics(lastModelMetrics),
    avgModelMetricsLastMonth: transformMetrics(avgModelMetricsLastMonth),
    avgModelMetricsCurrentMonth: transformMetrics(avgModelMetricsCurrentMonth),
  };
};

export function generateMockToolComparisonMetrics() {
  // Generate base success rate for current month (between 80% and 95%)
  const currentMonthSuccessRate = 0.80 + (Math.random() * 0.15);
  
  // Previous month success rate slightly lower (or 0 if no data should be shown)
  const previousMonthSuccessRate = Math.random() < 0.8 ? 
    (currentMonthSuccessRate - (Math.random() * 0.1)) : 0;

    return {
    success_rate: {
      currentMonth: currentMonthSuccessRate,
      previousMonth: previousMonthSuccessRate
    },
    error_rate: {
      currentMonth: 1.0 - currentMonthSuccessRate,
      previousMonth: previousMonthSuccessRate ? (1.0 - previousMonthSuccessRate) : 0
    }
  };
}

export const invalidateAgentMetricsCache = async (agentId) => {
  await Promise.all([
    redisService.delete(`agent-metrics:${agentId}`),
    redisService.delete(`agent-comparison-metrics:${agentId}`),
  ]);
};

export const invalidateAgentNodeMetricsCache = async (nodeId) => {
  await redisService.delete(`agent-tool-comparison-metrics:${nodeId}`);
};

export async function generateMockDetailedMetrics(agentId) {
  const { Agent, Model, AgentNode } = db;

  // Fetch agent data with its models and nodes
  let agent = await Agent.findOne({
    where: { id: agentId },
    include: [
      {
        model: AgentNode,
        as: 'AgentNodes',
        include: [
          {
            model: Model,
            as: 'Model'
          }
        ]
      }
    ]
  });
  agent = agent.dataValues;

  if (!agent) {
    throw new Error(`Agent with id ${agentId} not found`);
  }

  // Phase configuration (showing improvement over time)
  const phaseValues = {
    base: 0.10,
    initial: 0.25,
    improved: 0.40,
    optimized: 0.70
  };

  const improvements = {
    base: 0.02,
    initial: 0.03,
    improved: 0.035,
    optimized: 0.04
  };

  function createMetricsWithTrend(metricName) {
    const daily = {};
    const optimizedDaily = {};
    let sum = 0;
    let count = 0;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

      const phase = i >= 20 ? 'initial' : 
                   i >= 10 ? 'improved' : 
                   'optimized';

      const phaseProgress = phase === 'initial' ? (29 - i) / 10 :
                           phase === 'improved' ? (19 - i) / 10 :
                           (9 - i) / 10;

      let value = phaseValues[phase] + (improvements[phase] * phaseProgress);
      const variation = (Math.random() * 0.15) - 0.02;
      value = Math.min(Math.max(value + variation, 0), 1);

      daily[dateKey] = {
        sum: value,
        count: 1
      };

      optimizedDaily[dateKey] = {
        sum: Math.min(value * 1.3, 0.98),
        count: 1
      };

      if (i < 7) {
        sum += value;
        count++;
      }
    }

    return {
      daily,
      optimizedDaily,
      sum: 0.3,
      count: 1,
      optimizedSum: 0.8,
      optimizedCount: 1
    };
  }

  function createToolMetricsWithTrend(toolId) {
    const daily = {};
    let totalSuccess = 0;
    let totalError = 0;

    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

      const baseSuccess = i >= 20 ? 30 : i >= 10 ? 50 : 80;
      const baseError = i >= 20 ? 8 : i >= 10 ? 4 : 1;

      const success = Math.floor(baseSuccess + (Math.random() * 20));
      const error = Math.floor(baseError + (Math.random() * 3));

      daily[dateKey] = {
        success_count: success,
        error_count: error
      };

      totalSuccess += success;
      totalError += error;
    }

    return {
      daily,
      success_count: totalSuccess,
      error_count: totalError
    };
  }
  try {
  // Generate metrics using actual model IDs
  const metricsByModel = {};
  const models = agent.AgentNodes.map((node) => node.Model).filter((model) => model);
  for (const modelIt of models) {
    const model = modelIt.dataValues;
    metricsByModel[model.id] = {
      recall: createMetricsWithTrend("recall"),
      precision: createMetricsWithTrend("precision"),
      f1: createMetricsWithTrend("f1"),
      accuracy: createMetricsWithTrend("accuracy"),
      Healtcheck: createMetricsWithTrend("Healtcheck")
    };
  }

  // Generate metrics using actual node IDs
  const metricsByTool = {};
  let totalSuccess = 0;
  let totalError = 0;
  
  for (const node of agent.AgentNodes) {
    const nodeMetrics = createToolMetricsWithTrend(node.id);
    metricsByTool[node.id] = nodeMetrics;
    totalSuccess += nodeMetrics.success_count;
    totalError += nodeMetrics.error_count;
  }

  // Calculate aggregated metrics
  const aggregatedDaily = {};
  const dates = Object.keys(Object.values(metricsByTool)[0]?.daily || {});
  
  for (const date of dates) {
    aggregatedDaily[date] = {
      success_count: 0,
      error_count: 0
    };
    
    for (const toolMetrics of Object.values(metricsByTool)) {
      aggregatedDaily[date].success_count += toolMetrics.daily[date].success_count;
      aggregatedDaily[date].error_count += toolMetrics.daily[date].error_count;
    }
  }
  
  // Add aggregated metrics for models with optimized totals
  const aggregatedModelMetrics = {
    accuracy: {
      daily: {},
      optimizedDaily: {},
      sum: 0,
      count: 0,
      optimizedSum: 0,
      optimizedCount: 0
    },
    precision: {
      daily: {},
      optimizedDaily: {},
      sum: 0,
      count: 0,
      optimizedSum: 0,
      optimizedCount: 0
    },
    recall: {
      daily: {},
      optimizedDaily: {},
      sum: 0,
      count: 0,
      optimizedSum: 0,
      optimizedCount: 0
    },
    f1: {
      daily: {},
      optimizedDaily: {},
      sum: 0,
      count: 0,
      optimizedSum: 0,
      optimizedCount: 0
    },
    healthcheck: {
      daily: {},
      optimizedDaily: {},
      sum: 0,
      count: 0,
      optimizedSum: 0,
      optimizedCount: 0
    }
  };

  // Initialize daily structure for each metric
  dates.forEach(date => {
    Object.keys(aggregatedModelMetrics).forEach(metric => {
      aggregatedModelMetrics[metric].daily[date] = {
        sum: 0,
        count: 0
      };

      aggregatedModelMetrics[metric].optimizedDaily[date] = {
        sum: 0,
        count: 0
      };
    });
  });

  // Aggregate model metrics
  Object.values(metricsByModel).forEach(modelMetrics => {
    Object.entries(modelMetrics).forEach(([metric, data]) => {
      const metricKey = metric.toLowerCase();
      if (aggregatedModelMetrics[metricKey]) {
        // Add to total sums
        if (data.sum !== undefined && data.count !== undefined) {
          aggregatedModelMetrics[metricKey].sum += 0.3;
          aggregatedModelMetrics[metricKey].count += 1;
        }

        // Add to daily sums
        if (data.daily) {
          Object.entries(data.daily).forEach(([date, dailyData]) => {
            if (aggregatedModelMetrics[metricKey].daily[date]) {
              aggregatedModelMetrics[metricKey].daily[date].sum += dailyData.sum;
              aggregatedModelMetrics[metricKey].optimizedDaily[date].sum += Math.min(dailyData.sum * 1.3, 0.98);
              aggregatedModelMetrics[metricKey].daily[date].count += dailyData.count;
              aggregatedModelMetrics[metricKey].optimizedDaily[date].count += dailyData.count;
            }
          });
        }
      }
    });
  });

  // Calculate optimized values (approximately 80% better)
  Object.values(aggregatedModelMetrics).forEach(metric => {
    if (metric.sum > 0 && metric.count > 0) {
      const currentAvg = metric.sum / metric.count;
      const improvedAvg = Math.min(currentAvg * 1.8, 1); // Cap at 1 (100%)
      metric.optimizedSum = 0.8;
      metric.optimizedCount = 1;
    }
  });

  return {
    modelMetrics: {
      metricsByModel,
      aggregatedMetrics: aggregatedModelMetrics
    },
    toolMetrics: {
      metricsByTool,
      aggregatedMetrics: {
        daily: aggregatedDaily,
        success_count: totalSuccess,
        error_count: totalError
      }
    }
  };
  } catch (error) {
    console.error('Error generating mock detailed metrics:', error);
    throw error;
  }
}

