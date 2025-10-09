class DocsService {
  constructor() {
    this.storageKey = 'handit-docs-content';
    this.timestampKey = 'handit-docs-timestamp';
  }

  // Get default documentation content
  getDefaultDocs() {
    return {
      python: `# Python Integration Guide

## Getting Started with Handit.ai

### 1. **Install the Handit SDK**

Install the Handit SDK using pip:

\`\`\`bash
pip install handit-ai
\`\`\`

### 2. **Initialize the SDK**

Import and initialize the Handit SDK in your application:

\`\`\`python
from handit_ai import HanditAI

# Initialize with your API token
handit = HanditAI(api_token="your-api-token-here")
\`\`\`

### 3. **Track Function Calls**

Use the \`@handit.track\` decorator to monitor your functions:

\`\`\`python
@handit.track
def process_data(data):
    # Your function logic here
    result = data.upper()
    return result

# Call your function normally
result = process_data("hello world")
\`\`\`

### 4. **Track Specific Nodes**

For more granular tracking, use the \`track_node\` method:

\`\`\`python
def my_function():
    # Track specific operations
    handit.track_node(
        node_id="data_processing",
        input_data={"text": "sample input"},
        output_data={"result": "processed output"}
    )
\`\`\`

### 5. **Environment Configuration**

Set up environment variables for better configuration:

\`\`\`bash
export HANDIT_API_TOKEN="your-api-token-here"
export HANDIT_ENVIRONMENT="production"  # or "staging"
\`\`\`

### 6. **Error Handling**

The SDK includes built-in error handling:

\`\`\`python
try:
    result = handit.track_node(
        node_id="risky_operation",
        input_data=data
    )
except Exception as e:
    # Handit automatically tracks errors
    print(f"Operation failed: {e}")
\`\`\`

### Next Steps

- Visit the [Handit Dashboard](/) to monitor your agents
- Check the [Evaluation Hub](/evaluation-hub) for performance metrics
- Explore [Agent Monitoring](/ag-monitoring) for real-time insights`,

      javascript: `# JavaScript Integration Guide

## Getting Started with Handit.ai

### 1. **Install the Handit SDK**

Install the Handit SDK using npm or yarn:

\`\`\`bash
npm install handit-ai
# or
yarn add handit-ai
\`\`\`

### 2. **Initialize the SDK**

Import and initialize the Handit SDK in your application:

\`\`\`javascript
import { HanditAI } from 'handit-ai';

// Initialize with your API token
const handit = new HanditAI({
  apiToken: 'your-api-token-here',
  environment: 'production' // or 'staging'
});
\`\`\`

### 3. **Track Function Calls**

Use the \`trackNode\` method to monitor your functions:

\`\`\`javascript
async function processData(data) {
  return await handit.trackNode({
    nodeId: 'data_processing',
    inputData: { text: data },
    fn: async () => {
      // Your function logic here
      const result = data.toUpperCase();
      return result;
    }
  });
}

// Call your function normally
const result = await processData("hello world");
\`\`\`

### 4. **Track Specific Operations**

For more granular tracking:

\`\`\`javascript
async function myFunction() {
  // Track specific operations
  const result = await handit.trackNode({
    nodeId: 'data_processing',
    inputData: { text: 'sample input' },
    outputData: { result: 'processed output' }
  });
  
  return result;
}
\`\`\`

### 5. **Environment Configuration**

Set up environment variables:

\`\`\`bash
export HANDIT_API_TOKEN="your-api-token-here"
export HANDIT_ENVIRONMENT="production"
\`\`\`

Or use a \`.env\` file:

\`\`\`
HANDIT_API_TOKEN=your-api-token-here
HANDIT_ENVIRONMENT=production
\`\`\`

### 6. **Error Handling**

The SDK includes built-in error handling:

\`\`\`javascript
try {
  const result = await handit.trackNode({
    nodeId: 'risky_operation',
    inputData: data,
    fn: async () => {
      // Your risky operation
      return await someRiskyOperation();
    }
  });
} catch (error) {
  // Handit automatically tracks errors
  console.error('Operation failed:', error);
}
\`\`\`

### 7. **Express.js Integration**

For Express.js applications:

\`\`\`javascript
const express = require('express');
const { HanditAI } = require('handit-ai');

const app = express();
const handit = new HanditAI({ apiToken: 'your-api-token-here' });

app.get('/api/data', async (req, res) => {
  const result = await handit.trackNode({
    nodeId: 'api_data_fetch',
    inputData: { query: req.query },
    fn: async () => {
      // Your API logic here
      return { data: 'example' };
    }
  });
  
  res.json(result);
});
\`\`\`

### Next Steps

- Visit the [Handit Dashboard](/) to monitor your agents
- Check the [Evaluation Hub](/evaluation-hub) for performance metrics
- Explore [Agent Monitoring](/ag-monitoring) for real-time insights`
    };
  }

  // Save documentation content to localStorage
  saveDocs(content) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(content));
      localStorage.setItem(this.timestampKey, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Error saving docs:', error);
      return false;
    }
  }

  // Retrieve documentation content from localStorage
  getDocs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving docs:', error);
      return null;
    }
  }

  // Get documentation content (stored or default)
  getDocsContent() {
    const storedDocs = this.getDocs();
    if (storedDocs) {
      return storedDocs;
    }
    return this.getDefaultDocs();
  }

  // Check if there are custom docs (generated via chat)
  hasCustomDocs() {
    return this.getDocs() !== null;
  }

  // Get the timestamp when docs were last updated
  getDocsTimestamp() {
    try {
      const timestamp = localStorage.getItem(this.timestampKey);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error retrieving docs timestamp:', error);
      return null;
    }
  }

  // Clear stored docs (revert to default)
  clearDocs() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.timestampKey);
      return true;
    } catch (error) {
      console.error('Error clearing docs:', error);
      return false;
    }
  }

  // Save docs generated from chat
  saveGeneratedDocs(content) {
    const docsData = {
      content: content,
      type: 'generated',
      generatedAt: new Date().toISOString()
    };
    
    return this.saveDocs(docsData);
  }

  // Get the content from generated docs
  getGeneratedContent() {
    const docs = this.getDocs();
    if (docs && docs.type === 'generated') {
      return docs.content;
    }
    return null;
  }
}

// Export a singleton instance
export default new DocsService(); 