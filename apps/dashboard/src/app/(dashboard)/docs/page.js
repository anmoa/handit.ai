'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Code,
  Copy,
  Robot,
  FileText,
  Trash,
  ChatCircle,
  CheckCircle,
  Clock,
  XCircle,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useGetUserQuery } from '../../../services/auth/authService';
import docsService from '../../../services/docsService';
import CodeRenderer from '../../../components/onboarding/CodeRenderer';

const DocsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [docsContent, setDocsContent] = useState(null);
  const [hasCustomDocs, setHasCustomDocs] = useState(false);
  const [docsTimestamp, setDocsTimestamp] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { data: userData } = useGetUserQuery();
  const router = useRouter();

  // Get current environment
  const environment = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('environment') || 'production';
    }
    return 'production';
  }, []);

  // Get the appropriate API token based on environment
  const apiToken = React.useMemo(() => {
    if (environment === 'staging') {
      return userData?.company?.stagingApiToken;
    }
    return userData?.company?.apiToken;
  }, [environment, userData?.company]);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = () => {
    const content = docsService.getDocsContent();
    const hasCustom = docsService.hasCustomDocs();
    const timestamp = docsService.getDocsTimestamp();
    
    setDocsContent(content);
    setHasCustomDocs(hasCustom);
    setDocsTimestamp(timestamp);
  };

  const handleClearDocs = () => {
    docsService.clearDocs();
    loadDocs();
  };

  const handleOpenChat = () => {
    window.dispatchEvent(new CustomEvent('openOnboardingChat', { 
      detail: { mode: 'assistant', message: 'I want to connect my agent to Handit' } 
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestError(false);
    setTestSuccess(false);
    
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
      
      const result = await response.json();

      if (result?.connected) {
        setTestSuccess(true);
        setTestError(false);
        // Notify onboarding orchestrator if needed
        window.dispatchEvent(new CustomEvent('onboarding:connection-success', { detail: { success: true } }));
      } else {
        setTestError(true);
        setTestSuccess(false);
      }
    } catch (e) {
      setTestError(true);
      setTestSuccess(false);
    } finally {
      setTestLoading(false);
    }
  };

  const renderApiTokenSection = () => (
    <Card sx={{ 
      mb: 3, 
      backgroundColor: '#111111', 
      color: 'oklch(0.929 0.013 255.508)',
      border: '1px solid #2d3748',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'oklch(0.929 0.013 255.508)' }}>
          <CheckCircle size={20} color="oklch(0.929 0.013 255.508)" />
          Your API Token
          <Chip 
            label={environment === 'staging' ? 'Staging' : 'Production'} 
            size="small" 
            variant="outlined"
            sx={{
              color: 'oklch(0.729 0.013 255.508)',
              borderColor: 'oklch(0.729 0.013 255.508)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}
          />
        </Typography>
        {apiToken ? (
          <Box sx={{ position: 'relative' }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'oklch(0.729 0.013 255.508)' }}>
              Use this API token in your agent configuration:
            </Typography>
            <Paper
              sx={{
                overflow: 'hidden',
                bgcolor: '#0a0a0a',
                border: '1px solid #2d3748',
                boxShadow: 'none',
                position: 'relative',
              }}
            >
              <CodeRenderer
                code={apiToken}
                language="text"
                showLineNumbers={false}
              />
              <Tooltip title="Copy API token">
                <IconButton
                  onClick={() => copyToClipboard(apiToken)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    width: 24,
                    height: 24,
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' }
                  }}
                >
                  <Copy size={12} />
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'oklch(0.729 0.013 255.508)' }}>
            API token not available. Please check your account settings.
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderMarkdownContent = (markdownContent) => {
         if (!markdownContent) {
       return (
         <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'oklch(0.729 0.013 255.508)' }}>
           No documentation available
         </Typography>
       );
     }

    const elements = [];
    let currentSection = [];
    let inCodeBlock = false;
    let codeBlockLang = 'text';
    let codeBlockLines = [];

    // Helper to render text with **bold** inline
    function renderInlineBold(text) {
      const parts = [];
      let lastIndex = 0;
      const regex = /\*\*(.+?)\*\*/g;
      let match;
      let key = 0;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        parts.push(
          <span key={`bold-${key++}`} style={{ fontWeight: 700 }}>{match[1]}</span>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      return parts;
    }

    const lines = markdownContent.split('\n');
    lines.forEach((line, index) => {
      // Detect start/end of code block
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).trim() || 'text';
          // Push any previous text section
          if (currentSection.length > 0) {
            elements.push(
              <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'oklch(0.729 0.013 255.508)' }}>
                {currentSection.join('\n')}
              </Typography>
            );
            currentSection = [];
          }
        } else {
          // Ending a code block
          inCodeBlock = false;
          elements.push(
            <Box key={`code-${elements.length}`} sx={{ mb: 4, mt: 3, position: 'relative' }}>
              <Paper
                sx={{
                  overflow: 'hidden',
                  bgcolor: '#1e1e1e',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'none',
                }}
              >
                <CodeRenderer
                  code={codeBlockLines.join('\n')}
                  language={codeBlockLang}
                  showLineNumbers={false}
                />
              </Paper>
              <Tooltip title="Copy code">
                <IconButton
                  onClick={() => copyToClipboard(codeBlockLines.join('\n'))}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    width: 24,
                    height: 24,
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' }
                  }}
                >
                  <Copy size={12} />
                </IconButton>
              </Tooltip>
            </Box>
          );
          codeBlockLines = [];
          codeBlockLang = 'text';
        }
        return;
      }
      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Handle headers (#, ##, ###, ####)
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection.length > 0) {
                     elements.push(
             <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', color: 'oklch(0.729 0.013 255.508)' }}>
               {currentSection.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < currentSection.length - 1 ? <br /> : null}</React.Fragment>)}
             </Typography>
           );
          currentSection = [];
        }
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        let variant, styleProps;
                 if (level === 1) {
           variant = 'h4';
           styleProps = { fontWeight: 600, mt: elements.length > 0 ? 6 : 0, mb: 4, color: 'oklch(0.929 0.013 255.508)' };
         } else if (level === 2) {
           variant = 'h5';
           styleProps = { fontWeight: 600, mt: elements.length > 0 ? 5 : 0, mb: 3, color: 'oklch(0.929 0.013 255.508)' };
         } else if (level === 3) {
           variant = 'h6';
           styleProps = { fontWeight: 600, mt: 4, mb: 2, color: 'oklch(0.929 0.013 255.508)' };
         } else if (level === 4) {
           variant = 'subtitle1';
           styleProps = { fontWeight: 600, mt: 3, mb: 2, color: 'oklch(0.929 0.013 255.508)' };
         }
        elements.push(
          <Typography 
            key={`header-${elements.length}`} 
            variant={variant} 
            sx={styleProps}
          >
            {text}
          </Typography>
        );
        return;
      }

      // Handle numbered bold step titles
      const numberedBoldMatch = line.match(/^(\d+\.)\s+\*\*(.+?)\*\*:?\s*(.*)$/);
      if (numberedBoldMatch) {
        if (currentSection.length > 0) {
          elements.push(
            <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', color: 'oklch(0.729 0.013 255.508)' }}>
              {currentSection.join('\n')}
            </Typography>
          );
          currentSection = [];
        }
                 elements.push(
           <Typography key={`step-title-${elements.length}`} variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 4, color: 'oklch(0.929 0.013 255.508)' }}>
             {numberedBoldMatch[1]} {numberedBoldMatch[2]}{numberedBoldMatch[3] ? ':' : ''}
           </Typography>
         );
         if (numberedBoldMatch[3]) {
           elements.push(
             <Typography key={`step-desc-${elements.length}`} variant="body1" sx={{ mb: 3, color: 'oklch(0.729 0.013 255.508)' }}>
               {renderInlineBold(numberedBoldMatch[3])}
             </Typography>
           );
         }
        return;
      }

      // Regular text
      currentSection.push(line);
    });

    // Add any remaining text section
    if (currentSection.length > 0) {
      const paragraphs = [];
      let para = [];
      for (let i = 0; i < currentSection.length; i++) {
        const line = currentSection[i];
        if (!line.trim()) {
          if (para.length > 0) {
            paragraphs.push(para);
            para = [];
          }
        } else {
          para.push(line);
        }
      }
      if (para.length > 0) paragraphs.push(para);
      
             paragraphs.forEach((lines, idx) => {
         elements.push(
           <Typography key={`section-${elements.length}-${idx}`} variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', color: 'oklch(0.729 0.013 255.508)' }}>
             {lines.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < lines.length - 1 ? <br /> : null}</React.Fragment>)}
           </Typography>
         );
       });
    }

    return <Box>{elements}</Box>;
  };

  const renderContent = () => {
    if (hasCustomDocs) {
      const generatedContent = docsService.getGeneratedContent();
      if (generatedContent) {
        return (
          <Box>
                
            {renderMarkdownContent(generatedContent)}
          </Box>
        );
      }
    }

    // Show default content
    const defaultDocs = docsService.getDefaultDocs();
    const contentToShow = activeTab === 0 ? defaultDocs.python : defaultDocs.javascript;
    
    return (
             <Box>
         <Alert severity="info" sx={{ 
           mb: 4, 
           backgroundColor: '#1a1a1a', 
           color: 'oklch(0.929 0.013 255.508)', 
           borderColor: 'oklch(0.729 0.013 255.508)',
           border: '1px solid oklch(0.729 0.013 255.508)',
         }}>
           <AlertTitle sx={{ color: 'oklch(0.929 0.013 255.508)' }}>Default Documentation</AlertTitle>
           <Stack direction="row" spacing={2} alignItems="center">
             <Typography variant="body2" sx={{ color: 'oklch(0.729 0.013 255.508)' }}>
               These are the default setup instructions. You can generate personalized docs using the AI chat assistant.
             </Typography>
             <Button
               size="small"
               variant="outlined"
               startIcon={<ChatCircle size={16} />}
               onClick={handleOpenChat}
               sx={{
                 color: 'oklch(0.929 0.013 255.508)',
                 borderColor: 'oklch(0.929 0.013 255.508)',
                 '&:hover': {
                   backgroundColor: 'rgba(255, 255, 255, 0.1)',
                   borderColor: 'oklch(0.929 0.013 255.508)',
                 }
               }}
             >
               Generate Custom Docs
             </Button>
           </Stack>
         </Alert>
        
                 <Tabs
           value={activeTab}
           onChange={(event, newValue) => setActiveTab(newValue)}
           sx={{ 
             mb: 4,
             '& .MuiTab-root': {
               color: 'oklch(0.729 0.013 255.508)',
               '&.Mui-selected': {
                 color: 'oklch(0.929 0.013 255.508)',
               }
             },
             '& .MuiTabs-indicator': {
               backgroundColor: 'oklch(0.929 0.013 255.508)',
             }
           }}
         >
           <Tab label="Python" />
           <Tab label="JavaScript" />
         </Tabs>
        
        {renderMarkdownContent(contentToShow)}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        m: 'var(--Content-margin)',
        p: 'var(--Content-padding)',
        px: { xs: 3, sm: 4, md: 6 }, // Added horizontal padding
        pb: 7, // Add bottom padding to account for fixed banner
        width: 'var(--Content-width)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        color: 'oklch(0.929 0.013 255.508)',
      }}
    >
      <Paper sx={{ 
        p: 4, 
        backgroundColor: '#111111', 
        color: 'oklch(0.929 0.013 255.508)',
        border: '1px solid #2d3748',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        marginTop: '24px',
        mb: 7, // Add bottom margin to prevent overlap with fixed banner
      }}>
        {renderContent()}
      </Paper>

      {/* Fixed Test Connection Banner */}
      <Card sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111111', 
        color: 'oklch(0.929 0.013 255.508)',
        border: '1px solid #2d3748',
        borderBottom: 'none',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        borderRadius: 0,
              }}>
        <CardContent sx={{ py: 2, px: 4 }}>
          <Stack direction="row" spacing={3} alignItems="center" justifyContent="space-between" sx={{ marginLeft: '280px' }}>
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'oklch(0.929 0.013 255.508)' }}>
              </Typography>
              <Typography variant="body2" sx={{ color: 'oklch(0.729 0.013 255.508)' }}>
              </Typography>
            </Box>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, }}>
              {testSuccess && (
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={18} />
                    Connection successful!
                  </Typography>
                )}
                {testError && (
                  <Typography variant="body2" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <XCircle size={18} />
                    Connection failed. Please check your setup.
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={testLoading}
                  sx={{
                    minWidth: 140,
                    position: 'relative',
                    marginLeft: '15px'
                  }}
                  data-testid="guide-test-connection-button"
                >
                  {testLoading ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocsPage; 