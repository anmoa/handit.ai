// Simple test script for the prompt optimization endpoint
// This is for manual testing purposes

const testPromptOptimization = async () => {
  const modelId = 1; // Replace with actual model ID
  const modelLogId = 123; // Replace with actual modelLog ID that has an error

  try {
    const response = await fetch(`http://localhost:3000/api/prompt-versions/model/${modelId}/prompt/optimize-from-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelLogId }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Optimization successful!');
      console.log('New prompt:', data.data.newPrompt);
      console.log('Insights generated:', data.data.insights.length);
      console.log('Prompt version created:', data.data.promptVersion);
    } else {
      console.log('❌ Optimization failed:', data.message);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Uncomment to run the test
// testPromptOptimization();

console.log('Test script loaded. Uncomment the last line to run the test.'); 