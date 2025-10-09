import { generateAIResponse } from './aiService.js';
import { executeTrack } from './trackService.js';
import { parseAttachments, parseInputContent } from './parser.js';

export const evaluateAB = async (entry, modelObj, ModelLog, originalLogId, db, company = null) => {
  const { Model } = db;
  const model = await Model.findByPk(modelObj.id);

  const slug = modelObj.slug;
  const systemPrompt = modelObj.prompt;
  const textContent = parseInputContent(entry.input);
  const attachments = await parseAttachments(entry.input);

  // Prepare the messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  const optimizationToken = await company.getOptimizationToken();
  const defaultModel = company.optimizationModel;

  // If there are images, add them to the content
  if (attachments.length > 0) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: textContent },
        ...attachments.map(url => ({
          type: 'image_url',
          image_url: { url }
        }))
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: textContent
    });
  }


  // Generate response using DeepInfra
  const completion = await generateAIResponse({
    messages,
    numberOfAttachments: attachments.length,
    token: optimizationToken.token,
    tokenData: optimizationToken.data,
    provider: optimizationToken.provider.name,
    model: defaultModel,
  });

  // Track the result
  await executeTrack(
    model,
    {
      originalLogId,
      modelId: slug,
      input: messages,
      output: {
        choices: [{
          message: {
            content: completion.text,
            tool_calls: completion.toolCalls
          }
        }],
        usage: completion.usage
      }
    },
    ModelLog
  );

  return completion.text;
};
