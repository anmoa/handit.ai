# 🎯 JSON-Driven Onboarding System

A comprehensive onboarding system that reads from `config.json` and orchestrates the entire user onboarding experience using multiple specialized components.

## 🏗️ Architecture

The system consists of:

1. **OnboardingService** - Manages JSON configuration and state
2. **OnboardingOrchestrator** - Main component that coordinates everything
3. **Individual Components** - Menu, Assistant, Banners, Mouse guidance
4. **JSON Configuration** - Defines tours, steps, and behaviors

## 🚀 Quick Start

### Basic Usage

```jsx
import { OnboardingOrchestrator } from '@/components/onboarding';

function MyPage() {
  const [onboardingActive, setOnboardingActive] = useState(false);

  return (
    <>
      <button onClick={() => setOnboardingActive(true)}>
        Start Onboarding
      </button>

      {onboardingActive && (
        <OnboardingOrchestrator
          autoStart={false}
          triggerOnMount={false}
          userState={{
            userId: 'user-123',
            agentType: 'document-ai',
            agentName: 'My Agent'
          }}
          onComplete={(tour) => {
            setOnboardingActive(false);
            console.log('Completed:', tour);
          }}
          onSkip={(data) => {
            setOnboardingActive(false);
            console.log('Skipped:', data.reason);
          }}
        />
      )}
    </>
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
  onComplete={handleComplete}
  onSkip={handleSkip}
/>
```

## 📝 JSON Configuration

The system reads from `apps/dashboard/src/services/onboarding/config.json`:

### Tour Structure

```json
{
  "tourConfig": {
    "triggers": {
      "firstLogin": {
        "condition": "user.loginCount === 1",
        "tourId": "welcome-concept-walkthrough"
      }
    },
    "tours": [
      {
        "id": "welcome-concept-walkthrough",
        "name": "Welcome Tour",
        "type": "modal",
        "steps": [...]
      }
    ]
  }
}
```

### Step Types

1. **fullscreen-modal** - Full-screen welcome screens
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

## 🎮 Components

### OnboardingOrchestrator

Main component that manages the entire flow:

**Props:**
- `autoStart`: Start automatically when conditions are met
- `triggerOnMount`: Check triggers on component mount
- `userState`: User information for personalization
- `onComplete`: Callback when tour completes
- `onSkip`: Callback when tour is skipped

### OnboardingService

Singleton service that manages configuration and state:

```js
import onboardingService from '@/services/onboarding/onboardingService';

// Initialize with user data
onboardingService.init({ userId: '123', agentType: 'document-ai' });

// Start a specific tour
onboardingService.startTour('welcome-concept-walkthrough');

// Handle form submissions
onboardingService.submitForm('agent-type-selection', formData);

// Track events
onboardingService.trackEvent('custom_event', { data: 'value' });
```

### Individual Components

Each component can be used standalone:

```jsx
import { 
  OnboardingMenu,
  OnboardingAssistant, 
  useOnboardingBanners,
  useInvisibleMouse 
} from '@/components/onboarding';

// Menu popup
<OnboardingMenu 
  open={true} 
  onClose={handleClose}
  onOnboardingClick={startTour} 
/>

// Floating assistant
<OnboardingAssistant
  visible={true}
  currentStep={2}
  totalSteps={5}
  onNext={handleNext}
  onPrevious={handlePrev}
/>

// Banners
const banners = useOnboardingBanners();
banners.showBanner({
  title: 'Info',
  message: 'Help text here',
  position: { top: 100, left: 200 }
});

// Mouse guidance
const mouse = useInvisibleMouse();
mouse.moveToElement('.my-button');
mouse.clickElement('.my-button');
```

## 🎨 Customization

### Agent Types

The system supports different agent types with personalized content:

- `document-ai` - Document processing agents
- `custom-agent` - General AI assistants  
- `langchain-rag` - Knowledge base agents

### Dynamic Content

Content is personalized based on user state:

```json
{
  "dynamicContent": {
    "recommendedEvaluators": {
      "document-ai": {
        "name": "Completeness Evaluator",
        "description": "Ensures all required fields are extracted"
      }
    }
  }
}
```

### Placeholders

Use placeholders in content that get replaced automatically:

- `{{user.agentName}}` - User's agent name
- `{{user.agentType}}` - Selected agent type
- `{{user.integrationToken}}` - Generated integration token
- `{{recommendedEvaluator.name}}` - Recommended evaluator name

## 📊 Analytics

Events are automatically tracked:

```js
// Built-in events
tour_started
step_completed  
tour_completed
tour_skipped
action_clicked
integration_completed
first_trace_received
evaluator_created

// Access analytics
onboardingService.analytics // Array of events
```

## 🔗 Integration Examples

### Dashboard Page

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

## 🧪 Testing

Visit `/onboarding-demo` to test all components:

1. **JSON-Driven Orchestrator** - Full experience following config.json
2. **Individual Components** - Test each component separately
3. **Interactive Controls** - Customize and test different scenarios

## 📁 File Structure

```
apps/dashboard/src/
├── components/onboarding/
│   ├── OnboardingOrchestrator.js    # Main orchestrator
│   ├── OnboardingMenu.js           # Menu popup
│   ├── OnboardingAssistant.js      # Floating assistant
│   ├── OnboardingBanner.js         # Tooltip banners
│   ├── InvisibleMouse.js           # Mouse guidance
│   └── index.js                    # Exports
├── services/onboarding/
│   ├── config.json                 # Tour configuration
│   └── onboardingService.js        # Service manager
└── app/(dashboard)/
    ├── onboarding-demo/page.js     # Demo page
    └── ag-monitoring/page.js       # Production example
```

## 🎯 Best Practices

1. **Start Simple** - Begin with the orchestrator for full experience
2. **Personalize** - Use agent types and user state for relevant content
3. **Test Thoroughly** - Use the demo page to validate all flows
4. **Analytics** - Monitor completion rates and drop-off points
5. **Incremental** - Add tours gradually as features are built

## 🔧 Configuration

Edit `config.json` to:
- Add new tours and steps
- Modify trigger conditions  
- Customize content for different user types
- Add cursor guidance sequences
- Configure analytics events

The system automatically handles:
- State management
- Component coordination  
- Event tracking
- Dynamic content replacement
- Navigation between steps 