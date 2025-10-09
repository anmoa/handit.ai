# @handit/onboarding

> Interactive onboarding components and service for AI agents and applications

[![npm version](https://badge.fury.io/js/%40handit%2Fonboarding.svg)](https://badge.fury.io/js/%40handit%2Fonboarding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive React package for creating interactive onboarding experiences with guided tours, AI assistants, and customizable UI components.

## ✨ Features

- 🎯 **Guided Tours** - Step-by-step interactive walkthroughs
- 🤖 **AI Assistant** - Built-in chat assistant for user guidance
- 🎨 **Customizable UI** - Material-UI based components
- 📱 **Responsive Design** - Works on all device sizes
- 🔧 **JSON Configuration** - Flexible configuration system
- 📊 **Analytics** - Built-in event tracking
- 🎮 **Mouse Guidance** - Invisible cursor animations
- 🎪 **Banner System** - Contextual help tooltips

## 📦 Installation

```bash
npm install @handit/onboarding
```

### Peer Dependencies

```bash
npm install react react-dom @mui/material @mui/icons-material @phosphor-icons/react
```

## 🚀 Quick Start

### Basic Usage

```jsx
import { OnboardingProvider, OnboardingOrchestrator, defaultConfig } from '@handit/onboarding';

function App() {
  const config = {
    ...defaultConfig,
    tourConfig: {
      ...defaultConfig.tourConfig,
      tours: [
        {
          id: "welcome-tour",
          name: "Welcome Tour",
          steps: [
            {
              id: "welcome-step",
              type: "banner",
              content: {
                heading: "Welcome! 👋",
                description: "Let's get you started with our platform."
              }
            }
          ]
        }
      ]
    }
  };

  return (
    <OnboardingProvider>
      <div className="App">
        <OnboardingOrchestrator config={config} />
      </div>
    </OnboardingProvider>
  );
}
```

### Auto-triggered Onboarding

```jsx
<OnboardingOrchestrator
  autoStart={true}
  triggerOnMount={true}
  userState={{
    loginCount: 1,
    signupCompleted: true,
    agentType: 'custom-agent'
  }}
  onComplete={(tourId) => console.log('Tour completed:', tourId)}
  onSkip={(reason) => console.log('Tour skipped:', reason)}
/>
```

## 🎮 Components

### OnboardingOrchestrator

The main orchestrator component that manages the entire onboarding flow.

```jsx
import { OnboardingOrchestrator } from '@handit/onboarding';

<OnboardingOrchestrator
  config={yourConfig}
  autoStart={false}
  triggerOnMount={true}
  userState={{ userId: '123', agentType: 'document-ai' }}
  onComplete={(tourId) => console.log('Completed:', tourId)}
  onSkip={(data) => console.log('Skipped:', data.reason)}
/>
```

**Props:**
- `config` - Tour configuration object
- `autoStart` - Start automatically when conditions are met
- `triggerOnMount` - Check triggers on component mount
- `userState` - User information for personalization
- `onComplete` - Callback when tour completes
- `onSkip` - Callback when tour is skipped

### OnboardingMenu

Menu component for displaying available tours.

```jsx
import { OnboardingMenu } from '@handit/onboarding';

<OnboardingMenu 
  open={true}
  onClose={() => setMenuOpen(false)}
  onTourSelect={(tourId) => startTour(tourId)}
/>
```

### OnboardingAssistant

Floating assistant component for step-by-step guidance.

```jsx
import { OnboardingAssistant } from '@handit/onboarding';

<OnboardingAssistant
  visible={true}
  currentStep={2}
  totalSteps={5}
  onNext={handleNext}
  onPrevious={handlePrevious}
/>
```

### OnboardingBanner

Banner component for displaying contextual help.

```jsx
import { OnboardingBanner } from '@handit/onboarding';

<OnboardingBanner 
  step={currentStep}
  onNext={() => onboardingService.nextStep()}
  onPrevious={() => onboardingService.previousStep()}
  onClose={() => onboardingService.skipTour()}
/>
```

## 🔧 Service API

### onboardingService

Programmatic control of the onboarding flow.

```jsx
import { onboardingService } from '@handit/onboarding';

// Initialize with user state
onboardingService.init({
  userId: 'user123',
  loginCount: 1,
  signupCompleted: true,
  agentType: 'custom-agent'
});

// Start a specific tour
onboardingService.startTour('welcome-concept-walkthrough');

// Navigate steps
onboardingService.nextStep();
onboardingService.previousStep();

// Skip current tour
onboardingService.skipTour('user_skip');

// Get current information
const currentStep = onboardingService.getCurrentStep();
const tourInfo = onboardingService.getCurrentTourInfo();

// Listen to events
onboardingService.on('tourCompleted', (tour) => {
  console.log('Tour completed:', tour);
});

onboardingService.on('tourSkipped', (data) => {
  console.log('Tour skipped:', data);
});
```

## 📝 Configuration

### Basic Configuration Structure

```json
{
  "tourConfig": {
    "version": "1.0.0",
    "defaultSettings": {
      "theme": {
        "primaryColor": "#6366f1",
        "secondaryColor": "#f8fafc",
        "textColor": "#1e293b",
        "backgroundColor": "rgba(0, 0, 0, 0.7)",
        "borderRadius": "12px",
        "fontSize": "16px",
        "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
      },
      "animation": {
        "duration": 300,
        "easing": "ease-in-out",
        "highlightPulse": true
      },
      "positioning": {
        "offset": 10,
        "zIndex": 10000
      }
    },
    "triggers": {
      "firstLogin": {
        "condition": "user.loginCount === 1 && user.signupCompleted === true",
        "tourId": "welcome-concept-walkthrough"
      }
    },
    "tours": [
      {
        "id": "welcome-concept-walkthrough",
        "name": "Welcome Walkthrough",
        "description": "Interactive dashboard walkthrough",
        "type": "guided",
        "icon": "Play",
        "settings": {
          "canSkip": true,
          "showOnlyOnce": true,
          "canReplay": true,
          "showProgress": true,
          "showAssistant": true,
          "assistantPosition": "bottom-center",
          "backdrop": false,
          "escapeToClose": true,
          "clickOutsideToClose": false
        },
        "steps": [
          {
            "stepNumber": 1,
            "id": "welcome-banner",
            "type": "banner",
            "title": "Welcome to HandIt",
            "target": "body",
            "placement": "center",
            "content": {
              "heading": "Welcome to HandIt! 👋",
              "description": "The Open Source Engine that Auto-Improves Your AI.",
              "variant": "welcome",
              "showCloseButton": false,
              "autoHide": false,
              "icon": "🚀"
            },
            "actions": [
              {
                "text": "Start Tour",
                "type": "secondary",
                "action": "nextStep",
                "analytics": "welcome_start_dashboard_tour"
              }
            ]
          }
        ]
      }
    ],
    "dynamicContent": {
      "recommendedEvaluators": {
        "document-ai": {
          "name": "Completeness Evaluator",
          "description": "Ensures all required fields are extracted"
        }
      }
    },
    "analytics": {
      "events": {
        "tour_started": ["tourId", "userId", "timestamp"],
        "step_completed": ["tourId", "stepId", "userId", "timeSpent", "timestamp"],
        "tour_completed": ["tourId", "userId", "totalTime", "timestamp"],
        "tour_skipped": ["tourId", "stepId", "userId", "reason", "timestamp"]
      }
    },
    "personalizations": {
      "agentType": {
        "document-ai": {
          "terminology": {
            "agent": "document processor",
            "inputs": "documents",
            "outputs": "extracted data"
          }
        }
      }
    }
  }
}
```

### Step Types

1. **banner** - Full-screen welcome screens
2. **modal** - Form dialogs and information modals
3. **cursor-only** - Invisible cursor guidance
4. **tooltip** - Positioned help tooltips

### Cursor Guidance

```json
{
  "type": "cursor-only",
  "cursorGuidance": {
    "enabled": true,
    "steps": [
      {
        "target": ".nav-text",
        "targetText": "Tracing",
        "action": { "type": "click" },
        "instruction": {
          "title": "Click on Tracing",
          "description": "This shows all your agent executions",
          "position": "right"
        }
      }
    ]
  }
}
```

### Dynamic Content Placeholders

Use placeholders that get replaced automatically:

- `{{user.agentName}}` - User's agent name
- `{{user.agentType}}` - Selected agent type
- `{{user.integrationToken}}` - Generated integration token
- `{{recommendedEvaluator.name}}` - Recommended evaluator name

## 🎨 Customization

### Dependency Injection

Provide external services via the OnboardingProvider:

```jsx
const userService = {
  updateOnboardingProgress: async (tourId) => {
    // Your implementation
  }
};

const docsService = {
  saveGeneratedDocs: (content) => {
    // Your implementation
  }
};

const authService = {
  useGetUserQuery: () => {
    return { data: userData, error: null, isLoading: false };
  }
};

<OnboardingProvider 
  userService={userService}
  docsService={docsService}
  authService={authService}
>
  {/* Your app */}
</OnboardingProvider>
```

### Styling with Material-UI

```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
    },
  },
});

<ThemeProvider theme={theme}>
  <OnboardingProvider>
    <OnboardingOrchestrator config={config} />
  </OnboardingProvider>
</ThemeProvider>
```

## 📊 Analytics

The service automatically tracks events:

```jsx
// Built-in events
tour_started
step_completed  
tour_completed
tour_skipped
action_clicked
integration_completed
first_trace_received
evaluator_created

// Listen to events
onboardingService.on('tourStarted', (data) => {
  // Send to your analytics service
  analytics.track('onboarding_tour_started', data);
});

// Access all events
console.log(onboardingService.analytics);
```

## 🧪 Examples

### Dashboard Integration

```jsx
export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <button onClick={() => setShowOnboarding(true)}>
        Get Started
      </button>

      {showOnboarding && (
        <OnboardingOrchestrator
          config={dashboardConfig}
          userState={{ agentType: 'document-ai' }}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
```

### Auto-trigger on First Login

```jsx
export default function AppLayout({ user }) {
  return (
    <>
      <Navigation />
      <MainContent />
      
      <OnboardingOrchestrator
        autoStart={true}
        triggerOnMount={true}
        config={onboardingConfig}
        userState={{
          loginCount: user.loginCount,
          signupCompleted: user.signupCompleted,
          agentType: user.preferences?.agentType
        }}
      />
    </>
  );
}
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Development with watch mode
npm run dev

# Run tests
npm test
```

## 📄 License

MIT © [Handit](https://github.com/handit)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 API Reference

For detailed API documentation, see the [API Reference](./API.md).

## 🆘 Support

- 📖 [Documentation](https://github.com/handit/autonom/tree/main/packages/@handit/onboarding)
- 🐛 [Issues](https://github.com/handit/autonom/issues)
- 💬 [Discussions](https://github.com/handit/autonom/discussions) 