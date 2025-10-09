'use strict';

import { Sequelize } from 'sequelize';

export const up = async (queryInterface, SequelizeLib) => {
  // Get all companies
  const companies = await queryInterface.sequelize.query(
    'SELECT id FROM "Companies"',
    { type: SequelizeLib.QueryTypes.SELECT }
  );

  // Define the improved function evaluator with parser functions
  const functionBody = `
    // Function parameters: entry, parsedOutput, context, observation, userContent
    
    // Calculate tokens based on word count (1 token ≈ 0.75 words)
    const calculateTokens = (text) => {
      if (!text || typeof text !== 'string') return 0;
      const words = text.trim().split(/\\s+/).filter(word => word.length > 0);
      return Math.ceil(words.length / 0.75);
    };
    
    // Parse input and output content using parser functions
    const inputContent = parseInputContent(entry.input);
    const outputContent = parseOutputContent(entry.output);
    let attachments = await parseAttachments(entry.input);
    attachments = attachments.join(',');
    
    // Calculate tokens for input and output
    const inputTokens = calculateTokens((inputContent || '') + (attachments || ''));
    const outputTokens = calculateTokens(outputContent || '');
    const totalTokens = inputTokens + outputTokens;
    
    // Model cost calculation (customize as needed)
    const model = entry.input?.model || 'gpt-4o';
    const modelCosts = {
      'gpt-4o': 0.005, // $0.005 per 1K tokens
      'gpt-3.5-turbo': 0.0015,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'claude-3-haiku': 0.00025,
    };
    const costPer1K = modelCosts[model] || 0.002;
    const avgPrice = (totalTokens / 1000) * costPer1K;
    
    // Context usage calculation
    const contextLength = entry.input?.contextLength || inputTokens;
    const maxContextLength = entry.input?.maxContextLength || 8192; // Default max context
    const contextUsagePercent = maxContextLength > 0 ? Math.round((contextLength / maxContextLength) * 100) : 0;
    
    return {
      tokenCount: totalTokens,
      inputTokens,
      outputTokens,
      avgPrice,
      contextUsagePercent,
      score: 10, // Always 10 for informative evaluators
      analysis: \`Input: \${inputTokens} tokens, Output: \${outputTokens} tokens, Total: \${totalTokens} tokens, Price: $\${avgPrice.toFixed(4)}, Context Used: \${contextUsagePercent}%\`,
      errors: []
    };
  `;

  for (const company of companies) {
    // Create or find the metric
    let [metric] = await queryInterface.sequelize.query(
      `SELECT id FROM "EvaluatorMetrics" WHERE name = 'token_price_context' AND "company_id" = :companyId`,
      { replacements: { companyId: company.id }, type: SequelizeLib.QueryTypes.SELECT }
    );
    if (!metric) {
      const [result] = await queryInterface.bulkInsert('EvaluatorMetrics', [{
        name: 'token_price_context',
        description: 'Token, Price, and Context Usage',
        is_global: false,
        company_id: company.id,
        created_at: new Date(),
        updated_at: new Date(),
      }], { returning: true });
      metric = { id: result.id };
    }
    // Create the evaluation prompt if not exists
    const [existingPrompt] = await queryInterface.sequelize.query(
      `SELECT id FROM "EvaluationPrompts" WHERE name = 'Token, Price, and Context Usage' AND "company_id" = :companyId`,
      { replacements: { companyId: company.id }, type: SequelizeLib.QueryTypes.SELECT }
    );
    if (!existingPrompt) {
      await queryInterface.bulkInsert('EvaluationPrompts', [{
        name: 'Token, Price, and Context Usage',
        type: 'function',
        is_informative: true,
        function_body: functionBody,
        prompt: null,
        metric_id: metric.id,
        company_id: company.id,
        is_global: false,
        default_integration_token_id: null,
        default_provider_model: null,
        created_at: new Date(),
        updated_at: new Date(),
      }]);
    }
  }
};

export const down = async (queryInterface) => {
  // Remove all function-based Token, Price, and Context Usage evaluators
  await queryInterface.bulkDelete('EvaluationPrompts', { name: 'Token, Price, and Context Usage', type: 'function' });
  await queryInterface.bulkDelete('EvaluatorMetrics', { name: 'token_price_context' });
}; 