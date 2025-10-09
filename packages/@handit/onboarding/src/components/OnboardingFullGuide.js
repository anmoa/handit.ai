import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Divider,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  X,
  Copy,
  Code,
  CheckCircle,
  ArrowRight,
  Key,
  XCircle,
} from '@phosphor-icons/react';
import CodeRenderer from './CodeRenderer';
// Note: authService should be provided by the consuming application
// import { useGetUserQuery } from '../../services/auth/authService';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const OnboardingFullGuide = ({ visible, onClose, content = '' }) => {
  const [isVisible, setIsVisible] = useState(visible);
  // const { data: userData } = useGetUserQuery();
  const userData = null; // Should be provided by consuming application
  
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

  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  useEffect(() => {
    const handleShowGuide = (event) => {
      setIsVisible(true);
    };

    window.addEventListener('onboarding:show-full-guide', handleShowGuide);
    return () => {
      window.removeEventListener('onboarding:show-full-guide', handleShowGuide);
    };
  }, []);

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
        setShowBanner(true);
        setTestError(false);
        // Notify onboarding orchestrator to advance to next step
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

  const handleBannerClose = () => setShowBanner(false);

  // Helper to render text with **bold** inline
  function renderInlineBold(text) {
    // Replace **bold** with <span style={{fontWeight:700}}>bold</span>
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

  const renderMarkdownContent = (markdownContent) => {
    if (!markdownContent) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No setup guide available
        </Typography>
      );
    }

    const elements = [];
    let currentSection = [];
    let inCodeBlock = false;
    let codeBlockLang = 'text';
    let codeBlockLines = [];

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
              <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
                {currentSection.join('\n')}
              </Typography>
            );
            currentSection = [];
          }
        } else {
          // Ending a code block
          inCodeBlock = false;
          elements.push(
            <Box key={`code-${elements.length}`} sx={{ mb: 3, position: 'relative' }}>
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
      // Detect indented code block (4 spaces or tab)
      if (/^(    |\t)/.test(line)) {
        // If previous section exists, push it
        if (currentSection.length > 0) {
          elements.push(
            <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
              {currentSection.join('\n')}
            </Typography>
          );
          currentSection = [];
        }
        // Collect all consecutive indented lines as code
        let codeLines = [line.replace(/^(    |\t)/, '')];
        let nextIndex = index + 1;
        while (nextIndex < lines.length && /^(    |\t)/.test(lines[nextIndex])) {
          codeLines.push(lines[nextIndex].replace(/^(    |\t)/, ''));
          nextIndex++;
        }
        elements.push(
          <Box key={`code-${elements.length}`} sx={{ mb: 3, position: 'relative' }}>
            <Paper
              sx={{
                overflow: 'hidden',
                bgcolor: '#1e1e1e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'none',
              }}
            >
              <CodeRenderer
                code={codeLines.join('\n')}
                language={'text'}
                showLineNumbers={false}
              />
            </Paper>
            <Tooltip title="Copy code">
              <IconButton
                onClick={() => copyToClipboard(codeLines.join('\n'))}
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
        // Skip the lines we just processed
        for (let i = index + 1; i < nextIndex; i++) lines[i] = '';
        return;
      }
      // Handle headers (#, ##, ###, ####)
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection.length > 0) {
          // Render previous section as paragraphs
          const paragraphs = [];
          let para = [];
          for (let i = 0; i < currentSection.length; i++) {
            const l = currentSection[i];
            if (!l.trim()) {
              if (para.length > 0) {
                paragraphs.push(para);
                para = [];
              }
            } else {
              para.push(l);
            }
          }
          if (para.length > 0) paragraphs.push(para);
          paragraphs.forEach((lines, idx) => {
            elements.push(
              <Typography key={`section-${elements.length}-${idx}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
                {lines.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < lines.length - 1 ? <br /> : null}</React.Fragment>)}
              </Typography>
            );
          });
          currentSection = [];
        }
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        let variant, styleProps;
        if (level === 1) {
          variant = 'h5';
          styleProps = { fontWeight: 600, mt: elements.length > 0 ? 3 : 0, mb: 2, color: 'var(--mui-palette-primary-400)' };
        } else if (level === 2) {
          variant = 'h6';
          styleProps = { fontWeight: 600, mt: elements.length > 0 ? 3 : 0, mb: 2, color: 'var(--mui-palette-primary-400)' };
        } else if (level === 3) {
          variant = 'subtitle1';
          styleProps = { fontWeight: 700, mb: 1, color: 'var(--mui-palette-primary-400)' };
        } else if (level === 4) {
          variant = 'subtitle1';
          styleProps = { fontWeight: 700, mb: 1, color: 'var(--mui-palette-text-secondary)' };
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
      // Handle numbered bold step titles (e.g., '1. **Install the SDK:**')
      const numberedBoldMatch = line.match(/^(\d+\.)\s+\*\*(.+?)\*\*:?\s*(.*)$/);
      if (numberedBoldMatch) {
        if (currentSection.length > 0) {
          elements.push(
            <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
              {currentSection.join('\n')}
            </Typography>
          );
          currentSection = [];
        }
        // Render the bolded step title
        elements.push(
          <Typography key={`step-title-${elements.length}`} variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'white' }}>
            {numberedBoldMatch[1]} <span style={{ fontWeight: 700 }}>{numberedBoldMatch[2]}</span>{numberedBoldMatch[3] ? ':' : ''}
          </Typography>
        );
        // If there's additional text after the bold, render it as normal text
        if (numberedBoldMatch[3]) {
          elements.push(
            <Typography key={`step-desc-${elements.length}`} variant="body1" sx={{ mb: 2, color: 'var(--mui-palette-text-secondary)' }}>
              {renderInlineBold(numberedBoldMatch[3])}
            </Typography>
          );
        }
        return;
      }
      // Handle dash bold step subtitles (e.g., '- **Initialize Handit.ai Service:**')
      const dashBoldMatch = line.match(/^\s*-\s+\*\*(.+?)\*\*:?\s*(.*)$/);
      if (dashBoldMatch) {
        if (currentSection.length > 0) {
          elements.push(
            <Typography key={`section-${elements.length}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
              {currentSection.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < currentSection.length - 1 ? <br /> : null}</React.Fragment>)}
            </Typography>
          );
          currentSection = [];
        }
        elements.push(
          <Typography key={`dash-title-${elements.length}`} variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'var(--mui-palette-text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>{dashBoldMatch[1]}</span>{dashBoldMatch[2] ? ':' : ''}
          </Typography>
        );
        if (dashBoldMatch[2]) {
          elements.push(
            <Typography key={`dash-desc-${elements.length}`} variant="body1" sx={{ mb: 2, color: 'var(--mui-palette-text-secondary)' }}>
              {renderInlineBold(dashBoldMatch[2])}
            </Typography>
          );
        }
        return;
      }
      // Handle full-line bold (e.g., '**Step 2: Get Your Integration Token**')
      const fullLineBoldMatch = line.match(/^\*\*(.+)\*\*$/);
      if (fullLineBoldMatch) {
        if (currentSection.length > 0) {
          // Render previous section as paragraphs
          const paragraphs = [];
          let para = [];
          for (let i = 0; i < currentSection.length; i++) {
            const l = currentSection[i];
            if (!l.trim()) {
              if (para.length > 0) {
                paragraphs.push(para);
                para = [];
              }
            } else {
              para.push(l);
            }
          }
          if (para.length > 0) paragraphs.push(para);
          paragraphs.forEach((lines, idx) => {
            elements.push(
              <Typography key={`section-${elements.length}-${idx}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
                {lines.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < lines.length - 1 ? <br /> : null}</React.Fragment>)}
              </Typography>
            );
          });
          currentSection = [];
        }
        elements.push(
          <Typography key={`fullbold-title-${elements.length}`} variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'var(--mui-palette-text-secondary)' }}>
            {fullLineBoldMatch[1]}
          </Typography>
        );
        return;
      }
      // Regular text or list
      currentSection.push(line);
    });
    // Add any remaining text section
    if (currentSection.length > 0) {
      // Split into paragraphs at blank lines
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
      // Render each paragraph as a Typography, separated by margin
      paragraphs.forEach((lines, idx) => {
        elements.push(
          <Typography key={`section-${elements.length}-${idx}`} variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'var(--mui-palette-text-secondary)' }}>
            {lines.map((l, i) => <React.Fragment key={i}>{renderInlineBold(l)}{i < lines.length - 1 ? <br /> : null}</React.Fragment>)}
          </Typography>
        );
      });
    }
    return <Box>{elements}</Box>;
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Guide Modal */}
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h5" fontWeight="600">
            Agent Setup Guide
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 3,
            py: 2,
            pb: 10, // Extra padding for fixed button
          }}
        >
          {/* API Token Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mui-palette-text-secondary)' }}>
              <Key size={20} color="var(--mui-palette-primary-400)" />
              Your API Token
              <Chip 
                label={environment === 'staging' ? 'Staging' : 'Production'} 
                size="small" 
                color={environment === 'staging' ? 'warning' : 'primary'} 
                variant="outlined"
              />
            </Typography>
            <Paper
              sx={{
                p: 2,
                bgcolor: 'transparent',
                border: 'none',
                position: 'relative',
                boxShadow: 'none',
              }}
            >
              {apiToken ? (
                <>
                  <Typography variant="body2" sx={{ mb: 1, color: 'var(--mui-palette-text-secondary)' }}>
                    Use this API token in your agent configuration:
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
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
                          top: 4,
                          right: 4,
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
                </>
              ) : (
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'var(--mui-palette-text-secondary)' }}>
                  API token not available. Please check your account settings.
                </Typography>
              )}
            </Paper>
          </Box>

          {/* AI Assistant Guide Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mui-palette-text-secondary)' }}>
              <CheckCircle size={20} color="var(--mui-palette-primary-400)" />
              Setup Guide
            </Typography>
            <Paper
              sx={{
                p: 3,
                bgcolor: 'transparent',
                border: 'none',
                boxShadow: 'none',
              }}
            >
              {renderMarkdownContent(content)}
            </Paper>
          </Box>

          {/* Test Connection Step */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'var(--mui-palette-text-secondary)' }}>
              <ArrowRight size={20} color="var(--mui-palette-primary-400)" />
              Test Your Connection
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'transparent', border: 'none', boxShadow: 'none' }}>
              <Typography variant="body1" sx={{ mb: 2, color: 'var(--mui-palette-text-secondary)' }}>
                Once you've followed the setup guide above and integrated the API token, use the "Test Connection" button below to verify everything is working correctly.
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--mui-palette-text-secondary)' }}>
                This will check if your agent can successfully communicate with Handit's monitoring system.
              </Typography>
              {testError && (
                <Typography variant="body2" color="error" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <XCircle size={18} color="#e53935" style={{ marginRight: 4 }} />
                  Connection failed. Please check your setup and try again.
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>

        {/* Fixed Bottom Actions */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ minWidth: 100 }}
            disabled={testLoading}
            data-testid="guide-close-button"
          >
            Close
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {testError && (
              <XCircle size={20} color="#e53935" style={{ marginRight: 4 }} />
            )}
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              data-testid="guide-test-connection-button"
              sx={{
                bgcolor: 'primary.main',
                color: 'black',
                '&:hover': { bgcolor: 'var(--mui-palette-secondary-main)' },
                minWidth: 140,
                position: 'relative',
                pl: testLoading ? 4 : 2,
              }}
              disabled={testLoading}
            >
              {testLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ marginRight: 8 }}>Testing...</span>
                  <span className="MuiCircularProgress-root MuiCircularProgress-indeterminate" style={{ display: 'inline-block', width: 20, height: 20 }}>
                    <svg viewBox="22 22 44 44" style={{ width: 20, height: 20 }}>
                      <circle cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" strokeMiterlimit="20" stroke="currentColor" style={{ color: '#1976d2', opacity: 0.7 }} />
                    </svg>
                  </span>
                </Box>
              ) : (
                'Test Connection'
              )}
            </Button>
          </Box>
        </Box>
        {/* Success Banner */}
        <Snackbar open={showBanner} autoHideDuration={4000} onClose={handleBannerClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={handleBannerClose} severity="success" sx={{ width: '100%' }}>
            Connection successful! Your agent is now connected to Handit.
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default OnboardingFullGuide; 