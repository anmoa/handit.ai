import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingChat from './OnboardingChat';
import onboardingService from '../../services/onboarding/onboardingService';
import docsService from '../../services/docsService';

const OnboardingChatContainer = ({ 
  onConnectionCheck,
  connectionStatus = 'disconnected',
  onComplete,
  questions = []
}) => {
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState('bottom-right');
  const router = useRouter();

  useEffect(() => {
    const handleOpenChat = (event) => {
      if (event.detail.mode === 'assistant') {
        setAssistantVisible(true);
        // Update position if specified
        if (event.detail.position) {
          setAssistantPosition(event.detail.position);
        }
        // If there's an initial message, it will be handled by the OnboardingChat component
      }
    };

    const handleShowFullGuide = (event) => {
      const { content } = event.detail;
      
      // Save the generated documentation
      if (content) {
        docsService.saveGeneratedDocs(content);
      }
      
      // Navigate to docs page
      router.push('/docs');
      
      // Progress onboarding to next step (should go directly to test-connection-button)
      const nextStep = onboardingService.nextStep();
      if (nextStep) {
        window.dispatchEvent(new CustomEvent('onboarding:step-changed', {
          detail: { step: nextStep }
        }));
      }
    };



    const handleTestConnectionClicked = () => {
      // Move to test connection step
      const nextStep = onboardingService.nextStep();
      if (nextStep) {
        window.dispatchEvent(new CustomEvent('onboarding:step-changed', {
          detail: { step: nextStep }
        }));
      }
    };

    window.addEventListener('openOnboardingChat', handleOpenChat);
    window.addEventListener('onboarding:show-full-guide', handleShowFullGuide);
    window.addEventListener('onboarding:test-connection-clicked', handleTestConnectionClicked);

    return () => {
      window.removeEventListener('openOnboardingChat', handleOpenChat);
      window.removeEventListener('onboarding:show-full-guide', handleShowFullGuide);
      window.removeEventListener('onboarding:test-connection-clicked', handleTestConnectionClicked);
    };
  }, []);

  const handleConnectionCheck = async () => {
    if (onConnectionCheck) {
      await onConnectionCheck();
    }
  };

  return (
    <>
      {/* Universal Chat Assistant */}
      <OnboardingChat
        mode="assistant"
        isDarkMode={true}
        position={assistantPosition}
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        onConnectionCheck={handleConnectionCheck}
        connectionStatus={connectionStatus}
        onComplete={onComplete}
        questions={questions}
      />
    </>
  );
};

export default OnboardingChatContainer; 