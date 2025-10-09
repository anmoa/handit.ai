/**
 * @fileoverview Reminder Dialog Component
 * 
 * Shows a subtle reminder dialog for users who have completed onboarding
 * but haven't connected their agent yet. Shows maximum 2 times per day
 * with time restrictions to avoid being annoying.
 */

'use client';

import * as React from 'react';
import { Card, Button, Box, Typography, IconButton, Stack, Fade, Grow } from '@mui/material';
import { TerminalWindow, X, GithubLogo } from '@phosphor-icons/react';
import { useGetUserQuery } from '@/services/auth/authService';

const REMINDER_BANNER_KEY = 'handit-reminder-banner';
const MAX_SHOWS_PER_DAY = 24;
const MIN_HOURS_BETWEEN_SHOWS = 1; // Minimum 4 hours between shows

export function ReminderDialog({ 
  hasNoAgents, 
  hasPullRequests, 
  isInWalkthrough, 
  isOnboardingActive,
  readyToCheck,
  pullRequests = []
}) {
  const [showDialog, setShowDialog] = React.useState(false);
  const { data: userData } = useGetUserQuery();

  // Check if dialog should be shown
  React.useEffect(() => {
    // Don't show if user has agents, PRs, is in walkthrough, or onboarding is active
    if (!hasNoAgents || isInWalkthrough || isOnboardingActive || !readyToCheck) {
      setShowDialog(false);
      return;
    }

    // Check if we should show the dialog based on time restrictions
    const shouldShow = checkIfShouldShowBanner();
    setShowDialog(shouldShow);
  }, [hasNoAgents, isInWalkthrough, isOnboardingActive, readyToCheck]);

  const checkIfShouldShowBanner = () => {
    try {
      const today = new Date().toDateString();
      const now = new Date();
      const bannerData = JSON.parse(localStorage.getItem(REMINDER_BANNER_KEY) || '{}');

      // If no data for today, show banner
      if (!bannerData[today]) {
        return true;
      }

      const todayData = bannerData[today];
      
      // If we've already shown max times today, don't show
      if (todayData.shows >= MAX_SHOWS_PER_DAY) {
        return false;
      }

      // If we've shown before today, check time restrictions
      if (todayData.lastShown) {
        const lastShown = new Date(todayData.lastShown);
        const hoursSinceLastShow = (now - lastShown) / (1000 * 60 * 60);
        
        // If less than minimum hours have passed, don't show
        if (hoursSinceLastShow < MIN_HOURS_BETWEEN_SHOWS) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking banner show conditions:', error);
      return false;
    }
  };

  const handleConnectClick = () => {
    // Track that banner was clicked
    trackBannerInteraction('clicked');
    
    // Start the specific tour directly (like automatic start does)
    window.dispatchEvent(new CustomEvent('onboarding:start-tour', {
      detail: { tourId: 'autonomous-engineer-setup' }
    }));
    
    // Close the dialog
    setShowDialog(false);
  };

  const handleDismiss = () => {
    // Track that dialog was dismissed
    trackBannerInteraction('dismissed');
    setShowDialog(false);
  };

  const trackBannerInteraction = (action) => {
    try {
      const today = new Date().toDateString();
      const now = new Date();
      const bannerData = JSON.parse(localStorage.getItem(REMINDER_BANNER_KEY) || '{}');

      if (!bannerData[today]) {
        bannerData[today] = { shows: 0, lastShown: null };
      }

      const todayData = bannerData[today];
      
      if (action === 'clicked' || action === 'dismissed') {
        todayData.shows += 1;
        todayData.lastShown = now.toISOString();
        bannerData[today] = todayData;
        
        localStorage.setItem(REMINDER_BANNER_KEY, JSON.stringify(bannerData));
      }
    } catch (error) {
      console.error('Error tracking banner interaction:', error);
    }
  };

  if (!showDialog) return null;

  const variantStyles = {
    bgcolor: '#2a2a2a',
    borderColor: '#71f2af',
    color: 'white'
  };

  return (
    <Fade in={showDialog} timeout={200}>
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9997,
          maxWidth: 500,
          borderRadius: 1.5,
        }}
      >
        <Grow in={showDialog} timeout={300}>
          <Card
            sx={{
              ...variantStyles,
              borderRadius: 1.5,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                    Ready to optimize your AI?
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleDismiss}
                  sx={{ 
                    color: '#888', 
                    p: 0.5,
                    ml: 1,
                    borderRadius: 1.5,
                    '&:hover': {
                      color: 'white'
                    }
                  }}
                  size="small"
                >
                  <X size={16} />
                </IconButton>
              </Box>
              
              <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4, mb: 2 }}>
                <strong style={{ color: '#71f2af' }}>handit.ai</strong> is your autonomous engineer that continuously monitors, evaluates, and optimizes your AI agents 24/7.
              </Typography>

                <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4, mb: 2 }}>
                  {hasPullRequests 
                    ? "Your handit integration setup is ready! Review and approve the connection PR, then execute your agent to unlock AI optimization. We'll start analyzing and improving your AI as soon as we receive the first trace."
                    : "Connect your agent to start receiving automatic AI improvements and performance insights."
                  }
                </Typography>

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {hasPullRequests ? (
                  <Button
                    onClick={() => {
                      // Get the latest PR URL and open it
                      const latestPR = pullRequests.length > 0 ? pullRequests[0] : null;
                      if (latestPR?.prUrl) {
                        window.open(latestPR.prUrl, '_blank');
                      }
                    }}
                    variant="text"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      color: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      px: 2,
                      py: 0.5,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      },
                      '&:focus': {
                        bgcolor: 'rgba(255, 255, 255, 0.15)'
                      }
                    }}
                  >
                    Review PR
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectClick}
                    variant="text"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      color: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      px: 2,
                      py: 0.5,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      },
                      '&:focus': {
                        bgcolor: 'rgba(255, 255, 255, 0.15)'
                      }
                    }}
                  >
                    Get Started
                  </Button>
                )}
              </Stack>
            </Box>
          </Card>
        </Grow>
      </Box>
    </Fade>
  );
}
