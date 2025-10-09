/**
 * Test script for the prompt version created email endpoint
 * 
 * Usage: node test_prompt_version_email.js
 */

const testPromptVersionEmail = async () => {
  const testData = {
    modelId: 1, // Replace with actual model ID
    agentId: 1, // Replace with actual agent ID
    promptVersion: "2", // The version that was created
    recipientEmail: "test@example.com", // Replace with actual email
    firstName: "Test User" // Replace with actual name
  };

  try {
    const response = await fetch('http://localhost:3001/api/notification-system/test-prompt-version-created-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Email details:', result.data);
    } else {
      console.error('❌ Failed to send email:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Run the test
testPromptVersionEmail(); 