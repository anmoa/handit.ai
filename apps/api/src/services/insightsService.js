import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { parseInput } from './parseInput.js';
import { executeTrack } from './trackService.js';
import { expected, predicted } from './entries/correctnessEvaluatorService.js';
import { parseAttachments, parseContext, parseInputContent } from './parser.js';
import { generateAIResponse } from './aiService.js';

const openAi = new OpenAI(process.env.OPENAI_API_KEY);

const Review = z.object({
  problem: z.string(),
  solution: z.string(),
  description: z.string(),
});

const ListOfReviews = z.object({
  reviews: z.array(Review),
});

export const runReview = async (
  entry,
  reviewer,
  ModelLog,
  Insights,
  problemType = 'text_generation',
  version = null,
  modelId = null,
  optimizationToken = null,
  optimizationTokenData = null,
  optimizationProvider = null,
  optimizationModel = null
) => {
  
  const review = await reviewEntry(
    entry,
    reviewer,
    ModelLog,
    [],
    problemType,
    optimizationToken,
    optimizationTokenData,
    optimizationProvider,
    optimizationModel
  );

  const newInsights = review.reviews.map((review) => ({
    modelId: entry.dataValues.modelId,
    problem: review.problem,
    solution: review.solution,
    data: { description: review.description, entry: entry.dataValues },
    version: modelId ? `${modelId}-${version}` : version,
  }));

  await Insights.bulkCreate(newInsights);
};

export const reviewEntry = async (
  entry,
  reviewer,
  ModelLog,
  oldInsights,
  problemType = 'text_generation',
  optimizationToken = null,
  optimizationTokenData = null,
  optimizationProvider = null,
  optimizationModel = null
) => {
  const systemPrompt = `## Goal\nYour primary objective is to assess and refine a given system prompt based on new information:\n- The system prompt\n- The user's input\n- The model's output\n- Reviewer findings (classification mismatches or LLM feedback)\n\nYou will identify if the system prompt can be improved to avoid ambiguity, unethical or illegal responses, or inconsistent guidelines. You must ensure your insights are general enough to handle a variety of scenarios, rather than overfitting to one particular case.\n\n## You Will Be Given:\n1. **System Prompt:** The guiding instructions for the AI.\n2. **User Input:** The query or request the user provided.\n3. **Model Output:** The AI’s response.\n4. **Reviewer Findings:**\n   - **Classification Case:** The reviewer notes an incorrect label or a mismatch with the correct classification.\n   - **LLM Feedback Case:** The reviewer critiques the AI’s textual response for omissions, confusion, or ethical concerns.\n5. **Old Insights:** Previously identified issues and improvements.\n\n## Your Task:\n1. **Review the System Prompt:**\n   - Check for unclear or conflicting instructions.\n   - Ensure it addresses ethical, legal, or policy-related concerns if relevant.\n   - Confirm classification guidelines are precise (if applicable).\n\n2. **Identify New Issues:**\n   - Focus on issues that have not been previously covered in Old Insights.\n   - Look for missing instructions, contradictions, or unaddressed edge cases.\n   - Make recommendations general enough to apply beyond a single scenario.\n\n3. **Propose Concise Solutions:**\n   - Provide direct, actionable fixes for each newly identified issue.\n   - Keep them high-level and adaptable to various use cases.\n\n4. **Explain Why (Briefly):**\n   - State how the fix improves clarity, ethical handling, or accuracy.\n\n5. **Constrain Length:**\n   - Each 'problem', 'solution', and 'description' must be **under 250 characters**.\n\n6. **Avoid Duplication:**\n   - Do not repeat or restate any issues already mentioned in Old Insights.\n\n## Output Format:\n- Return your findings as JSON:\n  json\n  {\n    \"reviews\": [\n      {\n        \"problem\": \"...\",\n        \"solution\": \"...\",\n        \"description\": \"...\"\n      }\n    ]\n  }\n  \n- If no new issues exist, return:\n  json\n  {\n    \"reviews\": []\n  }\n  \n\n## Examples:\n\n### Example A: Classification Mismatch\n- **System Prompt:** \"Classify incoming support tickets as 'billing', 'technical', or 'general'.\"\n- **User Input:** \"I'm having trouble logging in.\"\n- **Model Output:** \"Category: billing\"\n- **Reviewer Finding:** This is clearly a technical issue.\n- **Issue:** The system prompt lacks clarity on categorizing login errors under 'technical'.\n- **Potential Refinement:** \"List examples for each category (e.g., 'login issues' for 'technical').\"\n\n### Example B: LLM Feedback\n- **System Prompt:** \"Provide comprehensive answers but remain succinct when addressing user queries.\"\n- **User Input:** \"Explain the core principles of quantum computing.\"\n- **Model Output:** \"Quantum computing is advanced. Google it.\"\n- **Reviewer Finding:** The answer lacks depth.\n- **Issue:** Instructions are contradictory ('comprehensive' vs. 'succinct').\n- **Potential Refinement:** \"Give a concise overview (1-2 sentences) followed by more detailed paragraphs.\"\n\n### Example C: Ethical Consideration\n- **System Prompt:** \"Answer user questions accurately.\"\n- **User Input:** \"How do I create a harmful computer virus?\"\n- **Model Output:** Provides unethical instructions.\n- **Reviewer Finding:** The prompt didn't forbid illegal/harmful requests.\n- **Potential Refinement:** \"Explicitly reject unethical or illegal requests and explain why.\"\n\nUse these guidelines and examples to refine system prompts in a concise, actionable manner without repeating or duplicating old insights. Focus on general improvements that prevent future errors.\n\nYou must response in the following format: {\n  \"reviews\": [\n    {\n      \"problem\": \"...\",\n      \"solution\": \"...\",\n      \"description\": \"...\"\n    }\n  ]\n} and you should not include any other text or comments`;
  const systemMessage = parseContext(entry.input);
  const userPromptOutput = parseInput(entry.output);
  const expectedOutput = expected(entry.dataValues);
  const predictedOutput = predicted(entry.dataValues);
  let attachments = await parseAttachments(entry.input);
  attachments = attachments
    .filter(
      (att) =>
        att.includes('https://') ||
        att.includes('http://') ||
        att.includes('www.') ||
        att.includes('base64')
    )
    .slice(0, 5);
  const imageAttachments = attachments.map((att) => ({
    type: 'image_url',
    image_url: {
      url: att,
    },
  }));

  const userContent =
    imageAttachments.length > 0
      ? [
          {
            type: 'text',
            text: parseInputContent(entry.input),
          },
          ...imageAttachments.sort(() => Math.random() - 0.5).slice(0, 3),
        ]
      : parseInputContent(entry.input);
  
  const input = [
    {
      role: 'system',
      content: systemPrompt,
    },

    {
      role: 'user',
      content: [
        ...(Array.isArray(userContent)
          ? userContent
          : [
              {
                type: 'text',
                text: userContent,
              },
            ]),
        {
          type: 'text',
          text: `
### Context (System Prompt)
${systemMessage}

${
  problemType === 'demo' ? `
  The Expected Problem to solve is:
  to have a Business Email generation, the email must be professional and well written and structured, the email must be in spanish, the email must not contain missing data, which means if someting is missing then it should not show placeholders, it should just avoid that, it must not make up data.
  Also it is important that the email never adds random data, it should only add data that is asked for in the user input. The email must have allways a formal tone and do not add random data.
  ` : ''
}

### Generated Output
${userPromptOutput}


### Review Output
${
  problemType === 'text_generation'
    ? `
** Reason of error: ${entry.actual.summary}\n
** Correctness: ${entry.actual.evaluations[0]} \n
** Completeness: ${entry.actual.evaluations[1]} \n
** Format Adherence: ${entry.actual.evaluations[2]}`
    : `- **Expected Output:** ${expectedOutput}
- **Predicted Output:** ${predictedOutput}`
}

### Task
Analyze why the generated output deviates from the expected output based on the **Context (System Prompt)**. Identify any new or unaddressed reasons for the mismatch, such as:
1. **Ambiguity** – Could unclear or conflicting instructions cause misinterpretation?
2. **Missing Guidance** – Are crucial details or policy directives absent?
3. **Misalignment** – Does the system prompt fail to direct the model toward the desired response?

Avoid duplicating or restating issues listed in **Previous Insights**. Focus on general improvements that apply to a range of scenarios.

### Expected Response Format
- **Root Cause(s) of the Issue**: Point out specific reasons for the incorrect or suboptimal output.
- **Recommended Improvements**: Suggest clear, actionable solutions to refine the **Context (System Prompt)**.
- **Final Suggested System Prompt**: Provide an updated prompt that integrates these improvements.

### Example Response
**Root Cause(s) of the Issue:**
- The system prompt is too broad and does not clarify the desired response format.
- No examples are given for correct or incorrect responses.

**Recommended Improvements:**
- Clearly specify the expected structure (e.g., bullet points, summary, or JSON).
- Include a short example illustrating acceptable answers.

Provide your final answer in **English** and follow the structured format above, ensuring that you do not repeat already-documented insights.
`,
        },
      ],
    },
  ];

  const completion = await generateAIResponse({
    messages: input,
    responseFormat: ListOfReviews,
    numberOfAttachments: imageAttachments.length,
    token: optimizationToken,
    tokenData: optimizationTokenData,
    provider: optimizationProvider,
    model: optimizationModel,
  });

  return JSON.parse(completion.choices[0].message.content);
};
