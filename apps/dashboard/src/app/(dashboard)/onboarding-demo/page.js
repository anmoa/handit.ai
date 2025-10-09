'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Slider,
} from '@mui/material';

import { useInvisibleMouse } from '@/components/onboarding/InvisibleMouse';
import { OnboardingChatContainer, ConnectAgentBanner } from '@/components/onboarding';

export default function OnboardingDemoPage() {
  // OnboardingMenu state
  const [menuOpen, setMenuOpen] = useState(false);

  // OnboardingAssistant state
  const [assistantVisible, setAssistantVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTitle, setStepTitle] = useState('Install Layup');

  // Banner state
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('Copy your LAYUP API token');
  const [bannerMessage, setBannerMessage] = useState('and store it in a secure .env file');
  const [bannerPosition, setBannerPosition] = useState({ top: 200, left: 300 });

  // Mouse state
  const mouse = useInvisibleMouse();

  // Orchestrator state
  const [orchestratorActive, setOrchestratorActive] = useState(false);

  // Chat Container state
  const [connectBannerVisible, setConnectBannerVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const stepTitles = [
    'Install Layup',
    'Connect Database', 
    'Setup API Keys',
    'Configure Settings',
    'Complete Setup'
  ];

  const handleNextStep = () => {
    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setStepTitle(stepTitles[nextStep]);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setStepTitle(stepTitles[prevStep]);
    }
  };

  const handleFinish = () => {
    alert('Onboarding completed!');
  };

  const handleOpenChat = () => {
    alert('Opening chat...');
  };

  const handleShowBanner = () => {
    banners.showBanner({
      title: bannerTitle,
      message: bannerMessage,
      position: bannerPosition,
      variant: 'info',
      arrow: 'top',
      autoHide: true,
      autoHideDelay: 5000,
    });
  };

  const handleMouseDemo = () => {
    mouse.showMouse({ trail: true });
    
    // Demo sequence
    setTimeout(() => mouse.moveMouse(200, 200), 500);
    setTimeout(() => mouse.moveMouse(400, 300), 1000);
    setTimeout(() => mouse.moveMouse(600, 200), 1500);
    setTimeout(() => mouse.clickAt(600, 200), 2000);
    setTimeout(() => mouse.hideMouse(), 3000);
  };

  const handleMouseToElement = () => {
    mouse.showMouse();
    mouse.moveToElement('[data-testid="demo-button"]');
    setTimeout(() => {
      mouse.clickElement('[data-testid="demo-button"]', () => {
        alert('Element clicked by invisible mouse!');
      });
    }, 1000);
  };

  const handleConnectionCheck = async () => {
    setConnectionStatus('checking');
    
    // Simulate connection check
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      setConnectionStatus(isSuccess ? 'connected' : 'error');
    }, 2000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ mb: 4, textAlign: 'center' }}>
        🎯 Super Onboarding System Demo
      </Typography>

      <Grid container spacing={4}>
        {/* OnboardingMenu Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              📋 Onboarding Menu
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              A comprehensive popup menu for guiding users through onboarding steps
            </Typography>
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                onClick={() => setMenuOpen(true)}
                fullWidth
              >
                Open Onboarding Menu
              </Button>
            </Stack>
          </Card>
        </Grid>

        {/* OnboardingAssistant Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              🤖 Onboarding Assistant
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Persistent floating assistant that stays on screen during onboarding
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={assistantVisible} 
                    onChange={(e) => setAssistantVisible(e.target.checked)}
                  />
                }
                label="Show Assistant"
              />
              <Typography variant="body2">Current Step: {currentStep + 1}/5</Typography>
              <Typography variant="caption" color="text.secondary">
                Step: {stepTitle}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button 
                  size="small" 
                  onClick={handlePreviousStep}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <Button 
                  size="small" 
                  onClick={handleNextStep}
                  disabled={currentStep === 4}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* OnboardingBanner Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              💬 Onboarding Banners
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Contextual tooltip-style banners for providing helpful information
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Banner Title"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                size="small"
              />
              <TextField
                label="Banner Message"
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                size="small"
                multiline
                rows={2}
              />
              <Stack spacing={1}>
                <Typography variant="caption">Position - Top: {bannerPosition.top}</Typography>
                <Slider
                  value={bannerPosition.top}
                  onChange={(e, val) => setBannerPosition(prev => ({ ...prev, top: val }))}
                  min={50}
                  max={500}
                  size="small"
                />
                <Typography variant="caption">Position - Left: {bannerPosition.left}</Typography>
                <Slider
                  value={bannerPosition.left}
                  onChange={(e, val) => setBannerPosition(prev => ({ ...prev, left: val }))}
                  min={100}
                  max={800}
                  size="small"
                />
              </Stack>
              <Button variant="contained" onClick={handleShowBanner}>
                Show Banner
              </Button>
            </Stack>
          </Card>
        </Grid>

        {/* InvisibleMouse Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              🖱️ Invisible Mouse
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Programmable mouse cursor for guided interactions and demonstrations
            </Typography>
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                onClick={handleMouseDemo}
                fullWidth
              >
                Demo Mouse Movement
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleMouseToElement}
                fullWidth
              >
                Move to Element & Click
              </Button>
              <Button 
                data-testid="demo-button"
                variant="outlined" 
                color="secondary"
                fullWidth
              >
                🎯 Target Button (Click Me!)
              </Button>
              <Stack direction="row" spacing={1}>
                <Button 
                  size="small" 
                  onClick={() => mouse.showMouse()}
                >
                  Show
                </Button>
                <Button 
                  size="small" 
                  onClick={() => mouse.hideMouse()}
                >
                  Hide
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* OnboardingChat Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              💬 Floating Chat Components
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Standalone floating chat components that can be positioned anywhere and triggered by events
            </Typography>
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openOnboardingChat', { 
                    detail: { mode: 'assistant' } 
                  }));
                }}
                fullWidth
              >
                Open Assistant Chat
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openOnboardingChat', { 
                    detail: { mode: 'agent-setup' } 
                  }));
                }}
                fullWidth
              >
                Open Agent Setup Chat
              </Button>
              <Typography variant="caption" color="text.secondary">
                Connection Status: {connectionStatus}
              </Typography>
            </Stack>
          </Card>
        </Grid>

        {/* ConnectAgentBanner Controls */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              🔗 Connect Agent Banner
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              A banner that triggers the agent setup chat experience
            </Typography>
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                onClick={() => setConnectBannerVisible(true)}
                fullWidth
              >
                Show Connect Agent Banner
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setConnectBannerVisible(false)}
                fullWidth
              >
                Hide Banner
              </Button>
            </Stack>
          </Card>
        </Grid>

        {/* OnboardingOrchestrator Controls */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
              🎯 JSON-Driven Onboarding Orchestrator
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
              Complete onboarding system that follows your JSON configuration. This is the main component that orchestrates all the others.
            </Typography>
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                onClick={() => setOrchestratorActive(true)}
                sx={{ 
                  bgcolor: 'white', 
                  color: '#667eea',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
                size="large"
              >
                🚀 Start JSON-Driven Onboarding
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
                This will start the full onboarding experience as defined in config.json:
                <br />• Opens the main menu first
                <br />• When you click "Onboarding", starts the guided tour
                <br />• Follows the JSON steps with cursor guidance, forms, and interactive elements
                <br />• Includes analytics tracking and personalization
              </Typography>
            </Stack>
          </Card>
        </Grid>

        {/* Demo Instructions */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              🚀 How to Use
            </Typography>
            <Typography variant="body1" paragraph>
              This demo showcases all the onboarding components working together:
            </Typography>
            <Stack spacing={1} sx={{ ml: 2 }}>
              <Typography variant="body2">
                • <strong>🎯 JSON-Driven Orchestrator:</strong> The complete system that reads config.json and orchestrates the entire onboarding flow
              </Typography>
              <Typography variant="body2">
                • <strong>Onboarding Menu:</strong> Click "Open Onboarding Menu" to see the full popup experience
              </Typography>
              <Typography variant="body2">
                • <strong>Assistant:</strong> Toggle the floating assistant and navigate through steps
              </Typography>
              <Typography variant="body2">
                • <strong>Banners:</strong> Customize and show contextual information banners
              </Typography>
              <Typography variant="body2">
                • <strong>Invisible Mouse:</strong> Programmatically control mouse movement and clicks
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ mt: 3, fontWeight: 'bold', color: 'primary.main' }}>
              💡 For the full experience, try the JSON-Driven Orchestrator first!
            </Typography>
          </Card>
        </Grid>
      </Grid>

      

      {/* Banner and Mouse containers */}
      <banners.BannerContainer />
      <mouse.MouseComponent />
    </Container>
  );
} 