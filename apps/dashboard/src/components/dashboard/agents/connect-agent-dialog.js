/**
 * Connect Agent Dialog Component
 * 
 * A dialog component that provides a personalized setup experience
 * by gathering information about the user's use case, tools, and agent description.
 */

import * as React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { XCircle } from '@phosphor-icons/react';

/**
 * ConnectAgentDialog Component
 * 
 * A personalized agent connection dialog that gathers information about:
 * 1. Use case they are working on
 * 2. Language or tool they are using
 * 3. Description of their agent and main components
 * 
 * @param {Object} props - Component props
 * @param {string} props.agentId - The ID of the agent to connect
 * @param {Object} props.currentAgent - The current agent object
 * @param {string} props.apiToken - The API token for authentication
 * @param {Function} props.onClose - Callback function when dialog is closed
 * @param {boolean} props.open - Whether the dialog is open
 * @returns {JSX.Element} The connect agent dialog component
 */
export function ConnectAgentDialog({ agentId, currentAgent, apiToken, onClose, open }) {
  // State management for form data
  const [useCase, setUseCase] = React.useState('');
  const [language, setLanguage] = React.useState('');
  const [agentDescription, setAgentDescription] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedSetup, setGeneratedSetup] = React.useState(null);
  const [currentTab, setCurrentTab] = React.useState(0);
  
  // Add state for connection test
  const [connectionStatus, setConnectionStatus] = React.useState(null); // null, 'testing', 'success', 'error'
  const [connectionMessage, setConnectionMessage] = React.useState('');
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);

  // Handle dialog close from onboarding
  React.useEffect(() => {
    const handleCloseDialog = () => {
      onClose();
    };
    
    window.addEventListener('onboarding:close-connect-dialog', handleCloseDialog);
    return () => {
      window.removeEventListener('onboarding:close-connect-dialog', handleCloseDialog);
    };
  }, [onClose]);

  // Use case options
  const useCaseOptions = [
    { value: 'document-processing', label: 'Document Processing & Analysis' },
    { value: 'customer-support', label: 'Customer Support & Chat' },
    { value: 'content-generation', label: 'Content Generation & Writing' },
    { value: 'data-extraction', label: 'Data Extraction & Mining' },
    { value: 'code-analysis', label: 'Code Analysis & Review' },
    { value: 'research-assistant', label: 'Research & Knowledge Assistant' },
    { value: 'sales-automation', label: 'Sales & Lead Automation' },
    { value: 'workflow-automation', label: 'Workflow & Process Automation' },
    { value: 'other', label: 'Other' }
  ];

  // Language/tool options
  const languageOptions = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript/Node.js' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'langchain', label: 'LangChain' },
    { value: 'llamaindex', label: 'LlamaIndex' },
    { value: 'openai-api', label: 'OpenAI API' },
    { value: 'anthropic-api', label: 'Anthropic API' },
    { value: 'huggingface', label: 'HuggingFace' },
    { value: 'fastapi', label: 'FastAPI' },
    { value: 'flask', label: 'Flask' },
    { value: 'express', label: 'Express.js' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async () => {
    setIsGenerating(true);
    try {
      // Send the form data to generate personalized setup
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setup/generate-personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useCase,
          language,
          agentDescription,
          apiToken: apiToken // Include the user's API token
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate personalized setup');
      }

      const result = await response.json();
      
      // Store the generated guide
      setGeneratedSetup(result);
      
      // Log the generated guide for debugging
      console.log('Generated personalized setup:', result);
      
    } catch (error) {
      console.error('Error generating setup:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          maxHeight: '85%',
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Connect {currentAgent?.name || 'Your Agent'}
          </Typography>
          <IconButton onClick={onClose}>
            <XCircle />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '80vh', position: 'relative' }}>
        {/* Tabs */}
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1, flexShrink: 0 }}
        >
          <Tab label="Setup Questions" />
          <Tab label="Your Guide" disabled={!generatedSetup} />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ 
          p: 3, 
          flex: 1, 
          overflow: 'auto',
          // Hide scrollbar but keep scrolling functionality
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': { 
            display: 'none' // WebKit browsers
          },
          // Add padding bottom for the sticky footer when on guide tab
          pb: currentTab === 1 && generatedSetup ? 10 : 3
        }}>
          {currentTab === 0 && (
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Help us personalize your experience by telling us about your agent and how you're planning to use it.
              </Typography>

              <Stack spacing={4}>
                {/* Question 1: Use Case */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    1. What use case are you working on?
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select your primary use case</InputLabel>
                    <Select
                      value={useCase}
                      label="Select your primary use case"
                      onChange={(e) => setUseCase(e.target.value)}
                      data-testid="use-case-select"
                    >
                      {useCaseOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Question 2: Language/Tool */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    2. Which language or tool are you using?
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select your primary language/tool</InputLabel>
                    <Select
                      value={language}
                      label="Select your primary language/tool"
                      onChange={(e) => setLanguage(e.target.value)}
                      data-testid="language-select"
                    >
                      {languageOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Question 3: Agent Description */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    3. Describe your agent and its main components
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Tell us about your agent: What does it do? What are its main components or functions? What kind of inputs and outputs does it handle?"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    data-testid="agent-description-input"
                    helperText="This helps us provide better insights and recommendations for your specific agent."
                  />
                </Box>

                {/* Submit Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  {!generatedSetup && (
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={!useCase || !language || !agentDescription.trim() || isGenerating}
                      size="large"
                      data-testid="generate-setup-button"
                      startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                      {isGenerating ? 'Generating Setup...' : 'Generate Setup'}
                    </Button>
                  )}
                  
                  {generatedSetup && (
                    <Button
                      variant="outlined"
                      onClick={() => setCurrentTab(1)}
                      size="large"
                      data-testid="view-instructions-button"
                      sx={{ mr: 1 }}
                    >
                      View Instructions
                    </Button>
                  )}
                </Box>
              </Stack>
            </Box>
          )}

          {currentTab === 1 && generatedSetup && generatedSetup.guide && (
            <Box>
              <Typography variant="h5" sx={{ mb: 1, color: 'primary.main' }}>
                🎉 {generatedSetup.guide.title}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {generatedSetup.guide.description}
              </Typography>

              
              {generatedSetup.guide.steps.map((step, index) => (
                <Box key={index} sx={{ mb: 4, pb: 3, borderBottom: index < generatedSetup.guide.steps.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    {index + 1}. {step.title}
                  </Typography>
                  
                  <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {step.description}
                  </Typography>
                  
                  {step.code && (
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{ 
                        bgcolor: 'grey.900', 
                        color: 'white',
                        p: 2, 
                        borderRadius: 1, 
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        overflowX: 'auto',
                        // Hide scrollbar but keep scrolling functionality
                        scrollbarWidth: 'none', // Firefox
                        '&::-webkit-scrollbar': { 
                          display: 'none' // WebKit browsers
                        }
                      }}>
                        {step.code}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          navigator.clipboard.writeText(step.code);
                        }}
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 20, 
                          minWidth: 'auto',
                          py: 0.5,
                          px: 2,
                          fontSize: '0.75rem',
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: 'white',
                          borderColor: 'rgba(255,255,255,0.3)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderColor: 'rgba(255,255,255,0.5)',
                          }
                        }}
                        data-testid={`copy-step-${index + 1}-button`}
                      >
                        Copy
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
              
              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // Create a complete setup guide text for copying
                    const fullGuide = `${generatedSetup.guide.title}\n\n${generatedSetup.guide.description}\n\n` +
                      generatedSetup.guide.steps.map((step, index) => 
                        `${index + 1}. ${step.title}\n${step.description}\n\n${step.code || ''}`
                      ).join('\n\n');
                    
                    navigator.clipboard.writeText(fullGuide);
                  }}
                  size="medium"
                  data-testid="copy-full-guide-button"
                >
                  📋 Copy Full Guide
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Sticky Footer - Only shown on guide tab */}
        {currentTab === 1 && generatedSetup && (
          <Box sx={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}>
            
            {/* Connection Status Display */}
            {connectionStatus && (
              <Box sx={{ mb: 2 }}>
                {connectionStatus === 'testing' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="info.dark">
                      Testing connection...
                    </Typography>
                  </Box>
                )}
                
                {connectionStatus === 'success' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'success.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.dark" sx={{ fontWeight: 600 }}>
                      ✅ {connectionMessage}
                    </Typography>
                  </Box>
                )}
                
                {connectionStatus === 'error' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'error.lighter', borderRadius: 1 }}>
                    <Typography variant="body2" color="error.dark" sx={{ fontWeight: 600 }}>
                      ❌ {connectionMessage}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setCurrentTab(0)}
                size="medium"
              >
                ← Back to Questions
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="medium"
                onClick={async () => {
                  setIsTestingConnection(true);
                  setConnectionStatus('testing');
                  setConnectionMessage('');
                  
                  try {
                    const token = localStorage.getItem('custom-auth-token');
                    const headers = {
                      'Content-Type': 'application/json',
                    };
                    
                    if (token) {
                      headers['Authorization'] = `Bearer ${token}`;
                    }

                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setup-assistant/test-connection`, {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({})
                    });

                    if (!response.ok) {
                      let errorMessage = 'Connection test failed';
                      if (response.status === 401) {
                        errorMessage = 'Authentication failed. Please log in again.';
                      } else if (response.status === 403) {
                        errorMessage = 'Access denied. Please check your permissions.';
                      }
                      setConnectionStatus('error');
                      setConnectionMessage(errorMessage);
                      return;
                    }

                    const result = await response.json();
                    
                    if (result.success) {
                      if (result.connected) {
                        setConnectionStatus('success');
                        setConnectionMessage(result.message || 'Connection successful! Your agent is properly connected.');
                        
                        // Notify onboarding system of successful connection
                        setTimeout(() => {
                          // Trigger onboarding advancement
                          const onboardingEvent = new CustomEvent('onboarding:connection-success', {
                            detail: { success: true, message: result.message }
                          });
                          window.dispatchEvent(onboardingEvent);
                        }, 1000);
                      } else {
                        setConnectionStatus('error');
                        setConnectionMessage(result.message || 'Connection failed. Please check your setup.');
                      }
                    } else {
                      setConnectionStatus('error');
                      setConnectionMessage(result.error || 'Connection test failed.');
                    }
                  } catch (error) {
                    console.error('Error testing connection:', error);
                    setConnectionStatus('error');
                    setConnectionMessage('Unable to reach server. Please check your internet connection.');
                  } finally {
                    setIsTestingConnection(false);
                  }
                }}
                disabled={isTestingConnection}
                data-testid="test-connection-button"
                sx={{ 
                  px: 3, 
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {isTestingConnection ? 'Testing...' : '🔗 Test Connection'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
} 