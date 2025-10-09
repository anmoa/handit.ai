# Prompt Optimization from Error

This document describes the prompt optimization feature that allows users to optimize prompts based on specific modelLog errors through email notifications.

## Flow Overview

1. **Error Detection**: When a modelLog error is detected, an email is sent
2. **Email Action**: User clicks "Optimize Prompt" button in email
3. **Dashboard Redirect**: User is redirected to dashboard with query parameters
4. **Chat Integration**: OnboardingChat opens with pre-filled optimization message
5. **AI Processing**: Chat handles the optimization request through AI agent
6. **Result**: User sees optimization results in the chat interface

## Email Integration

### Email Template
The email template (`modelReviewFailureTemplate.hbs`) includes:
- "Review in Dashboard" button - links to tracing view
- "Optimize Prompt" button - triggers optimization flow

### Email Service Updates
The `sendModelReviewFailureEmail` function now:
- Detects modelId and modelLogId from the error
- Creates optimization URL with query parameters
- Passes agent information to template

## Dashboard Integration

### URL Structure
```
https://dashboard.handit.ai/prompt-versions?agentId={agentId}&autoOptimize=true&modelLogId={modelLogId}
```

### Query Parameters
- `agentId`: ID of the agent associated with the error
- `autoOptimize`: Flag to trigger optimization flow
- `modelLogId`: ID of the modelLog that contains the error

### Page Handler
The `prompt-versions` page:
- Detects `autoOptimize=true` parameter
- Constructs pre-filled message for optimization
- Opens OnboardingChat with the message
- Handles chat visibility and interaction

## Chat Integration

### Pre-filled Message
The chat opens with a message like:
```
"I want to optimize the prompt of agent with id {agentId}, based on the result of the entry with id {modelLogId}"
```

### AI Agent Processing
The OnboardingChat:
- Sends the message to the AI agent
- Processes the response through existing AI infrastructure
- Displays optimization results and insights
- Allows user to continue the conversation

## Backend API

### Endpoint
```
POST /api/prompt-versions/model/:modelId/prompt/optimize-from-error
```

### Request Body
```json
{
  "modelLogId": 123
}
```

### Response
```json
{
  "success": true,
  "data": {
    "newPrompt": "Optimized prompt text...",
    "insights": [...],
    "promptVersion": {...}
  }
}
```

## Security Considerations

- Email validates that modelLog belongs to the specified model
- Only modelLogs with actual errors can be optimized
- Proper authentication and authorization required
- All operations are logged for audit purposes

## Dependencies

This feature relies on:
- `runReview` from `insightsService.js`
- `enhancePrompt` from `promptEnhancementService.js`
- `isCorrect` from `correctnessEvaluatorService.js`
- `createPrompt` from `promptVersionService.js`
- `OnboardingChat` component for user interaction
- Email service for notifications 