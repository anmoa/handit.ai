import React, { createContext, useContext } from 'react';

const OnboardingContext = createContext({
  docsService: null,
  authService: null,
  userService: null,
});

export const OnboardingProvider = ({ 
  children, 
  docsService, 
  authService, 
  userService 
}) => {
  return (
    <OnboardingContext.Provider 
      value={{ 
        docsService, 
        authService, 
        userService 
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};

// Convenience hooks for individual services
export const useDocsService = () => {
  const { docsService } = useOnboardingContext();
  return docsService;
};

export const useAuthService = () => {
  const { authService } = useOnboardingContext();
  return authService;
};

export const useUserService = () => {
  const { userService } = useOnboardingContext();
  return userService;
}; 