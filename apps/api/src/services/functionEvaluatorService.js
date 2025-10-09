'use strict';

/**
 * Function-based evaluator service
 * Provides helper functions and example evaluators for function-based evaluation
 */

/**
 * Helper function to create a function evaluator
 * @param {string} name - Name of the evaluator
 * @param {string} functionBody - JavaScript function body as string
 * @param {Object} options - Additional options
 * @returns {Object} - Function evaluator object
 */
export const createFunctionEvaluator = (name, functionBody, options = {}) => {
  return {
    name,
    type: 'function',
    functionBody,
    ...options
  };
};

/**
 * Example function evaluators
 */

// Simple exact match evaluator
export const exactMatchEvaluator = createFunctionEvaluator(
  'Exact Match',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  const expectedOutput = context?.expectedOutput || entry.input?.expectedOutput;
  
  if (!expectedOutput) {
    return {
      score: 0,
      analysis: "No expected output provided for comparison",
      errors: ["Missing expected output in context or input"]
    };
  }
  
  const isExactMatch = parsedOutput === expectedOutput;
  const score = isExactMatch ? 10 : 0;
  
  return {
    score,
    analysis: isExactMatch 
      ? "Output exactly matches expected result" 
      : "Output does not match expected result",
    errors: isExactMatch ? [] : [`Expected: "${expectedOutput}", Got: "${parsedOutput}"`]
  };
  `
);

// Contains text evaluator
export const containsTextEvaluator = createFunctionEvaluator(
  'Contains Text',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  const requiredText = context?.requiredText || entry.input?.requiredText;
  
  if (!requiredText) {
    return {
      score: 0,
      analysis: "No required text specified for evaluation",
      errors: ["Missing required text in context or input"]
    };
  }
  
  const containsText = parsedOutput.toLowerCase().includes(requiredText.toLowerCase());
  const score = containsText ? 10 : 0;
  
  return {
    score,
    analysis: containsText 
      ? "Output contains the required text" 
      : "Output does not contain the required text",
    errors: containsText ? [] : [`Required text "${requiredText}" not found in output`]
  };
  `
);

// JSON structure evaluator
export const jsonStructureEvaluator = createFunctionEvaluator(
  'JSON Structure',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  const requiredFields = context?.requiredFields || entry.input?.requiredFields || [];
  
  if (requiredFields.length === 0) {
    return {
      score: 0,
      analysis: "No required fields specified for JSON evaluation",
      errors: ["Missing required fields in context or input"]
    };
  }
  
  let parsedJson;
  try {
    parsedJson = JSON.parse(parsedOutput);
  } catch (error) {
    return {
      score: 0,
      analysis: "Output is not valid JSON",
      errors: ["Invalid JSON format", error.message]
    };
  }
  
  const missingFields = [];
  const presentFields = [];
  
  for (const field of requiredFields) {
    if (parsedJson.hasOwnProperty(field)) {
      presentFields.push(field);
    } else {
      missingFields.push(field);
    }
  }
  
  const score = missingFields.length === 0 ? 10 : Math.max(0, 10 - (missingFields.length * 2));
  
  return {
    score,
    analysis: missingFields.length === 0 
      ? "All required fields are present in JSON" 
      : "Some required fields are missing from JSON",
    errors: missingFields.length > 0 ? [`Missing fields: ${missingFields.join(', ')}`] : []
  };
  `
);

// Length evaluator
export const lengthEvaluator = createFunctionEvaluator(
  'Length Check',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  const minLength = context?.minLength || entry.input?.minLength || 0;
  const maxLength = context?.maxLength || entry.input?.maxLength || Infinity;
  
  const outputLength = parsedOutput.length;
  const isWithinRange = outputLength >= minLength && outputLength <= maxLength;
  
  let score = 10;
  if (!isWithinRange) {
    if (outputLength < minLength) {
      score = Math.max(0, 10 - ((minLength - outputLength) * 2));
    } else {
      score = Math.max(0, 10 - ((outputLength - maxLength) * 0.5));
    }
  }
  
  return {
    score,
    analysis: isWithinRange 
      ? "Output length is within acceptable range" 
      : "Output length is outside acceptable range",
    errors: isWithinRange ? [] : [`Length ${outputLength} is outside range [${minLength}, ${maxLength}]`]
  };
  `
);

// Regex pattern evaluator
export const regexPatternEvaluator = createFunctionEvaluator(
  'Regex Pattern',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  const pattern = context?.pattern || entry.input?.pattern;
  
  if (!pattern) {
    return {
      score: 0,
      analysis: "No regex pattern specified for evaluation",
      errors: ["Missing regex pattern in context or input"]
    };
  }
  
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch (error) {
    return {
      score: 0,
      analysis: "Invalid regex pattern provided",
      errors: ["Invalid regex pattern", error.message]
    };
  }
  
  const matches = regex.test(parsedOutput);
  const score = matches ? 10 : 0;
  
  return {
    score,
    analysis: matches 
      ? "Output matches the required pattern" 
      : "Output does not match the required pattern",
    errors: matches ? [] : [`Output does not match pattern: ${pattern}`]
  };
  `
);

// Custom evaluator template
export const customEvaluatorTemplate = `
// Function parameters: entry, parsedOutput, context, observation, userContent
// 
// entry: The complete entry object with input and output
// parsedOutput: The parsed output content
// context: The parsed context from the input
// observation: Previous steps observations (if any)
// userContent: The parsed user content
//
// Return an object with the following structure:
// {
//   score: number (0-10),
//   analysis: string,
//   errors: string[]
// }

// Your custom evaluation logic here
const score = 0; // Replace with your scoring logic
const analysis = "Your analysis here"; // Replace with your analysis
const errors = []; // Replace with any errors found

return {
  score,
  analysis,
  errors
};
`;

// Token calculation evaluator using parser functions
export const tokenCalculationEvaluator = createFunctionEvaluator(
  'Token Calculation',
  `
  // Function parameters: entry, parsedOutput, context, observation, userContent
  import { parseInputContent, parseOutputContent } from './parser.js';
  
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
  `
);

/**
 * Validate a function evaluator
 * @param {Object} evaluator - The evaluator object to validate
 * @returns {Object} - Validation result
 */
export const validateFunctionEvaluator = (evaluator) => {
  const errors = [];
  
  if (!evaluator.name) {
    errors.push('Evaluator name is required');
  }
  
  if (!evaluator.functionBody) {
    errors.push('Function body is required');
  }
  
  if (evaluator.type !== 'function') {
    errors.push('Type must be "function"');
  }
  
  // Try to create the function to check for syntax errors
  if (evaluator.functionBody) {
    try {
      new Function('entry', 'parsedOutput', 'context', 'observation', 'userContent', evaluator.functionBody);
    } catch (error) {
      errors.push(`Function syntax error: ${error.message}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Test a function evaluator with sample data
 * @param {Object} evaluator - The evaluator to test
 * @param {Object} sampleEntry - Sample entry data
 * @returns {Object} - Test result
 */
export const testFunctionEvaluator = async (evaluator, sampleEntry) => {
  try {
    const validation = validateFunctionEvaluator(evaluator);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    // Create test data
    const testEntry = {
      input: sampleEntry.input || { text: "Test input" },
      output: sampleEntry.output || "Test output"
    };
    
    const parsedOutput = testEntry.output;
    const context = {};
    const observation = "";
    const userContent = "Test content";
    
    // Execute the function
    const evaluatorFunction = new Function('entry', 'parsedOutput', 'context', 'observation', 'userContent', evaluator.functionBody);
    const result = await evaluatorFunction(testEntry, parsedOutput, context, observation, userContent);
    
    // Validate result structure
    if (!result || typeof result !== 'object') {
      return {
        success: false,
        error: 'Function must return an object'
      };
    }
    
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 10) {
      return {
        success: false,
        error: 'Function must return a score between 0 and 10'
      };
    }
    
    if (!result.analysis || typeof result.analysis !== 'string') {
      return {
        success: false,
        error: 'Function must return an analysis string'
      };
    }
    
    if (!Array.isArray(result.errors)) {
      return {
        success: false,
        error: 'Function must return an errors array'
      };
    }
    
    return {
      success: true,
      result
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Execution error: ${error.message}`
    };
  }
}; 