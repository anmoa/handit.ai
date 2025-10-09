import React, { useState } from 'react';
import {
  Box,
  Card,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Chip,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  X as CloseIcon,
  CheckCircle,
  Circle,
  Users,
  Database,
  ArrowLeft,
  Play,
  Plug,
  ShieldCheck,
  PaperPlaneTilt,
  House,
  Gear,
  Question,
  Book,
  Calendar,
  Link,
  Code,
  Rocket,
  Shield,
  Eye,
  ChartLine,
} from '@phosphor-icons/react';
import onboardingService from '../../services/onboarding/onboardingService';

// Icon mapping for string-based icon names
const iconMap = {
  'Play': Play,
  'Plug': Plug,
  'ShieldCheck': ShieldCheck,
  'CheckCircle': CheckCircle,
  'Circle': Circle,
  'Users': Users,
  'Database': Database,
  'ArrowLeft': ArrowLeft,
  'PaperPlaneTilt': PaperPlaneTilt,
  'House': House,
  'Gear': Gear,
  'Question': Question,
  'Book': Book,
  'Calendar': Calendar,
  'Link': Link,
  'Code': Code,
  'Rocket': Rocket,
  'Shield': Shield,
  'Eye': Eye,
  'Chart': ChartLine,
};

// Helper function to render icon from string or component
const renderIcon = (icon, props = {}) => {
  if (typeof icon === 'string') {
    const IconComponent = iconMap[icon];
    return IconComponent ? React.createElement(IconComponent, props) : React.createElement(Circle, props);
  }
  return React.createElement(icon, props);
};

const OnboardingMenu = ({ 
  open, 
  onClose, 
  currentView = 'main', 
  onOnboardingClick, 
  onStartTour,
  userOnboardingCurrentTour = null // Current tour user is on
}) => {
  const [view, setView] = useState(currentView);
  const [chatInput, setChatInput] = useState('');
  // Main onboarding steps based on config.json tours
  const onboardingSteps = onboardingService.getTourDefinition();

  // Calculate current tour number and completed tours
  const currentTourNumber = userOnboardingCurrentTour 
    ? onboardingSteps.find(step => step.tourId === userOnboardingCurrentTour)?.tourNumber || 1
    : (userOnboardingCurrentTour === null ? 4 : 1); // null means all tours completed
  
  // Calculate completed tours: all tours with numbers less than current tour
  const completedTourIds = onboardingSteps
    .filter(step => step.tourNumber < currentTourNumber)
    .map(step => step.tourId);
  
  const completedCount = completedTourIds.length;
  const totalTours = onboardingSteps.length;
  const completionPercentage = userOnboardingCurrentTour === null ? 100 : (completedCount / totalTours) * 100;

  // Badge shows remaining tours or completion status
  const badgeText = userOnboardingCurrentTour === null ? 'Done' : `${totalTours - currentTourNumber + 1}`;

  const menuItems = [
    { 
      id: 'onboarding', 
      label: 'Onboarding', 
      icon: CheckCircle,
      badge: badgeText,
      completed: completedCount === totalTours 
    },
    { 
      id: 'docs', 
      label: 'Documentation', 
      icon: Database,
      completed: false 
    },
    { 
      id: 'contact-calendly', 
      label: 'Office Hours', 
      icon: Users,
      completed: false 
    }
  ];

  const handleItemClick = (itemId) => {
    if (itemId === 'onboarding') {
      // Just switch to onboarding view, don't start tour immediately
      setView('onboarding');
    } else if (itemId === 'ai-agent-questions') {
      // Open AI agent questions/FAQ
      window.open('https://docs.handit.ai/faq', '_blank');
    } else if (itemId === 'docs') {
      // Open documentation
      window.open('https://docs.handit.ai', '_blank');
    } else if (itemId === 'contact-calendly') {
      // Open Calendly scheduling
      window.open('https://calendly.com/cristhian-handit/30min', '_blank');
    }
  };

  const handleStepClick = (step) => {
    // Start the specific tour
    if (onStartTour) {
      onStartTour(step.tourId);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Open OnboardingChat with the submitted question
    window.dispatchEvent(new CustomEvent('openOnboardingChat', { 
      detail: { mode: 'assistant', message: chatInput.trim() } 
    }));
    
    // Clear the input and close the menu
    setChatInput('');
    onClose();
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e);
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: 6,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card
        sx={{
          width: 420,
          bgcolor: '#2a2a2a',
          color: 'white',
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {view === 'main' ? (
          <>
            {/* Header with HandIt logo and close button */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <img 
                  src="/assets/lg.png" 
                  alt="HandIt" 
                  style={{ 
                    width: 20, 
                    height: 20,
                    marginRight: 6
                  }} 
                />
                <Typography variant="h6" sx={{ 
                  color: 'white', 
                  fontSize: '0.9rem', 
                  fontWeight: 600 
                }}>
                  HandIt
                </Typography>
              </Box>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{ 
                  color: '#ccc',
                  '&:hover': { 
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <CloseIcon size={16} />
              </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="h6" sx={{ mb: 1.5, color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                How can we help you today?
              </Typography>

              {/* All Menu Items */}
              <List sx={{ p: 0, mb: 2 }}>
                {menuItems.map((item) => (
                  <ListItem 
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    sx={{ 
                      py: 1.2, 
                      px: 1.2,
                      cursor: 'pointer',
                      borderRadius: 1,
                      mx: 0,
                      transition: 'all 0.2s ease',
                      bgcolor: item.id === 'onboarding' ? 'rgba(66, 165, 245, 0.15)' : 'transparent',
                      '&:hover': { 
                        bgcolor: item.id === 'onboarding' ? 'rgba(66, 165, 245, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        transform: 'translateX(3px)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: item.id === 'onboarding' ? '#42a5f5' : '#888', minWidth: 36 }}>
                      {/* icons are phosphor icons in string, render the corresponding icon */}
                      {renderIcon(item.icon, { size: 16 })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{ 
                        color: item.id === 'onboarding' ? '#42a5f5' : 'white',
                        fontSize: '0.8rem',
                        fontWeight: item.id === 'onboarding' ? 500 : 400
                      }}
                    />
                    {item.badge && (
                      <Chip 
                        label={item.badge} 
                        size="small"
                        sx={{ 
                          bgcolor: '#42a5f5', 
                          color: 'white',
                          fontSize: '0.65rem',
                          height: 18,
                          minWidth: 18,
                          fontWeight: 600
                        }}
                      />
                    )}
                  </ListItem>
                ))}
              </List>

              {/* Chat Input Section */}
              <Box sx={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                pt: 2
              }}>
                <form onSubmit={handleChatSubmit}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="How can we guide you?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    multiline
                    maxRows={1}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 2,
                        fontSize: '0.7rem',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#42a5f5',
                        },
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'white',
                        padding: '0px 10px',
                        fontSize: '0.9rem',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.5)',
                          opacity: 1,
                        },
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="submit"
                            size="small"
                            disabled={!chatInput.trim()}
                            sx={{
                              color: chatInput.trim() ? '#42a5f5' : 'rgba(255, 255, 255, 0.3)',
                              '&:hover': {
                                bgcolor: 'rgba(66, 165, 245, 0.1)',
                              },
                              '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.3)',
                              },
                            }}
                          >
                            <PaperPlaneTilt size={16} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </form>
              </Box>
            </Box>
          </>
        ) : (
          <>
            {/* Header with HandIt logo and close button */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  onClick={() => setView('main')}
                  size="small"
                  sx={{ 
                    color: '#ccc', 
                    mr: 0.5,
                    '&:hover': { color: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' }
                  }}
                >
                  <ArrowLeft size={16} />
                </IconButton>
                <img 
                  src="/assets/lg.png" 
                  alt="HandIt" 
                  style={{ 
                    width: 20, 
                    height: 20,
                    marginRight: 6
                  }} 
                />
                <Typography variant="h6" sx={{ 
                  color: 'white', 
                  fontSize: '0.9rem', 
                  fontWeight: 600 
                }}>
                  HandIt
                </Typography>
              </Box>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{ 
                  color: '#ccc',
                  '&:hover': { 
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <CloseIcon size={16} />
              </IconButton>
            </Box>

            {/* Onboarding View Content */}
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="h5" sx={{ mb: 1.2, color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                Let's get you onboarded
              </Typography>
              
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.75rem', fontWeight: 500 }}>
                  {Math.round(completionPercentage)}% complete
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={completionPercentage}
                  sx={{ 
                    flex: 1, 
                    height: 5, 
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#42a5f5',
                      borderRadius: 3
                    }
                  }}
                />
              </Stack>

              <List sx={{ p: 0 }}>
                {onboardingSteps.map((step, index) => {
                  const isCompleted = completedTourIds.includes(step.tourId);
                  const isCurrent = userOnboardingCurrentTour === step.tourId;
                  return (
                    <ListItem 
                      key={step.id}
                      onClick={() => handleStepClick(step)}
                      sx={{ 
                        py: 1.5, 
                        px: 1.2,
                        cursor: 'pointer',
                        borderRadius: 1,
                        mx: 0,
                        transition: 'all 0.2s ease',
                        bgcolor: isCurrent ? 'rgba(66, 165, 245, 0.15)' : 'transparent',
                        '&:hover': { 
                          bgcolor: isCurrent ? 'rgba(66, 165, 245, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                          transform: 'translateX(3px)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {isCompleted ? (
                          <CheckCircle size={18} color="#42a5f5" weight="fill" />
                        ) : (
                          renderIcon(step.icon, { 
                            size: 18, 
                            color: isCurrent ? "#42a5f5" : "#888" 
                          })
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={step.label}
                        primaryTypographyProps={{ 
                          color: isCompleted ? '#42a5f5' : (isCurrent ? '#42a5f5' : 'white'),
                          fontSize: '0.8rem',
                          fontWeight: isCompleted ? 500 : (isCurrent ? 500 : 400),
                          sx: { textDecoration: isCompleted ? 'line-through' : 'none' }
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>

              {/* Back to main menu */}
              <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <ListItem 
                  onClick={() => setView('main')}
                  sx={{ 
                    py: 1.2, 
                    px: 1.2,
                    cursor: 'pointer',
                    borderRadius: 1,
                    mx: 0,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateX(3px)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ArrowLeft size={16} color="#888" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Back to menu"
                    primaryTypographyProps={{ 
                      color: '#ccc',
                      fontSize: '0.8rem',
                      fontWeight: 400
                    }}
                  />
                </ListItem>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
};

export default OnboardingMenu; 