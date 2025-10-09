// Export all components
export {
  OnboardingMenu,
  OnboardingAssistant, 
  OnboardingBanner,
  useOnboardingBanners,
  InvisibleMouse,
  useInvisibleMouse,
  OnboardingOrchestrator,
  OnboardingChat,
  ConnectAgentBanner,
  OnboardingChatContainer
} from './components';

// Export context and providers
export {
  OnboardingProvider,
  useOnboardingContext,
  useDocsService,
  useAuthService,
  useUserService
} from './context/OnboardingContext';

// Export the service
export { default as onboardingService } from './services/onboardingService';

// Export default configuration template
export const defaultConfig = {
  tourConfig: {
    version: "1.0.0",
    defaultSettings: {
      theme: {
        primaryColor: "#6366f1",
        secondaryColor: "#f8fafc",
        textColor: "#1e293b",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        borderRadius: "12px",
        fontSize: "16px",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
      },
      animation: {
        duration: 300,
        easing: "ease-in-out",
        highlightPulse: true
      },
      positioning: {
        offset: 10,
        zIndex: 10000
      }
    },
    triggers: {},
    tours: [],
    dynamicContent: {},
    analytics: {},
    personalizations: {}
  }
}; 