import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Button,
  Stack,
  Fade,
  Alert,
} from '@mui/material';
import {
  X as CloseIcon,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';
import OnboardingChat from './OnboardingChat';

const ConnectAgentBanner = ({ 
  visible = true, 
  onClose,
  onConnectionSuccess,
  onSkip,
  chatPosition = "center" // Position for the agent setup chat when opened - center for better visibility
}) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isClosing, setIsClosing] = useState(false);

  const handleConnectionCheck = async () => {
    setConnectionStatus('checking');
    
    try {
      // TODO: Replace with actual connection check API call
      // Simulate connection check
      setTimeout(() => {
        // For demo purposes, randomly succeed or fail
        const isSuccess = Math.random() > 0.3;
        
        if (isSuccess) {
          setConnectionStatus('connected');
          setTimeout(() => {
            onConnectionSuccess?.();
          }, 1000);
        } else {
          setConnectionStatus('error');
        }
      }, 2000);
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleSkip = () => {
    setIsClosing(true);
    setTimeout(() => {
      onSkip?.();
    }, 300);
  };

  if (!visible) return null;

  return (
    <Fade in={visible && !isClosing}>
      <Card
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          bgcolor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
          width: 450,
          maxWidth: 'calc(100vw - 40px)',
          border: '1px solid #e0e0e0',
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#4A90E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              H
            </Box>
            <Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: '#333',
                  fontSize: '1.1rem'
                }}
              >
                Connect Your Agent
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontSize: '0.9rem'
                }}
              >
                Let's get your agent connected to Handit
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              onClick={handleSkip}
              sx={{
                color: '#666',
                fontSize: '0.85rem',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              Skip for now
            </Button>
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                color: '#666',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CloseIcon size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Connection Status Alert */}
        {connectionStatus === 'connected' && (
          <Alert 
            severity="success" 
            sx={{ 
              m: 2, 
              mb: 0,
              '& .MuiAlert-message': {
                fontSize: '0.9rem'
              }
            }}
          >
            <strong>Connection Successful!</strong> Your agent is now connected to Handit.
          </Alert>
        )}

        {connectionStatus === 'error' && (
          <Alert 
            severity="error" 
            sx={{ 
              m: 2, 
              mb: 0,
              '& .MuiAlert-message': {
                fontSize: '0.9rem'
              }
            }}
          >
            <strong>Connection Failed.</strong> Please check your setup and try again.
          </Alert>
        )}

        {/* Chat Interface Trigger */}
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
            Click the button below to start a conversation with our AI assistant who will guide you through the setup process.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openOnboardingChat', { 
                detail: { mode: 'assistant', message: 'I want to connect my agent to Handit', position: chatPosition } 
              }));
            }}
            sx={{
              bgcolor: '#4A90E2',
              color: 'white',
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              '&:hover': {
                bgcolor: '#357ABD'
              }
            }}
          >
            🤖 Start Setup Chat
          </Button>
        </Box>
      </Card>
    </Fade>
  );
};

export default ConnectAgentBanner; 