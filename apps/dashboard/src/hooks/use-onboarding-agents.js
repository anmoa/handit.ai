import { useEffect, useState, useRef } from 'react';
import { useGetAgentsQuery } from '@/services/agentsService';

/**
 * Custom hook that fetches agents conditionally based on onboarding state
 * - Returns tour agents when user is in walkthrough
 * - Returns regular agents when not in walkthrough
 * - Refetches immediately when tour state changes
 */
export const useOnboardingAgents = () => {
  const [isInWalkthrough, setIsInWalkthrough] = useState(false);
  const previousWalkthroughState = useRef(false);
  const hasInitialized = useRef(false);

  // Check if user is currently in the walkthrough tour
  useEffect(() => {
    const checkWalkthroughState = () => {
      try {
        const savedState = localStorage.getItem('onboardingState');
        if (savedState) {
          const state = JSON.parse(savedState);
          // Check if user is in the autonomous-engineer-setup tour
          const inWalkthrough = state.isActive && state.tourId === 'autonomous-engineer-setup';
          setIsInWalkthrough(inWalkthrough);
        } else {
          setIsInWalkthrough(false);
        }
      } catch (error) {
        console.error('Error checking walkthrough state:', error);
        setIsInWalkthrough(false);
      }
    };

    // Initial check
    checkWalkthroughState();
    
    // Mark as initialized so query can run
    hasInitialized.current = true;

    // Listen for onboarding state changes
    const handleOnboardingStateChange = (event) => {
      const { active } = event.detail;
      if (!active) {
        // Tour completed/skipped, use regular agents
        setIsInWalkthrough(false);
      } else {
        // Tour active, check if it's the walkthrough
        setTimeout(() => {
          checkWalkthroughState();
        }, 100); // Small delay to ensure localStorage is updated
      }
    };

    // Listen for storage changes (in case of multiple tabs)
    const handleStorageChange = (event) => {
      if (event.key === 'onboardingState') {
        checkWalkthroughState();
      }
    };

    window.addEventListener('onboardingStateChange', handleOnboardingStateChange);
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('onboardingStateChange', handleOnboardingStateChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch agents based on walkthrough state
  const agentsQuery = useGetAgentsQuery(
    isInWalkthrough ? { tourAgent: true } : {},
    {
      // Skip until we've determined the walkthrough state
      skip: !hasInitialized.current,
      // Force refetch when parameters change
      refetchOnMountOrArgChange: true,
    }
  );

  // Track walkthrough state changes for logging
  useEffect(() => {
    if (previousWalkthroughState.current !== isInWalkthrough) {
      console.log('Walkthrough state changed:', { 
        from: previousWalkthroughState.current, 
        to: isInWalkthrough,
        willFetchTourAgents: isInWalkthrough 
      });
      
      previousWalkthroughState.current = isInWalkthrough;
      // Let RTK Query handle the refetch naturally through parameter change
    }
  }, [isInWalkthrough]);

  
  // Debug: Log when agents data changes
  useEffect(() => {
    console.log('Agents data updated:', {
      isInWalkthrough,
      agentsCount: agentsQuery.data?.length || 0,
      firstAgent: agentsQuery.data?.[0]?.name || 'None',
      isLoading: agentsQuery.isLoading,
    });
  }, [agentsQuery.data, isInWalkthrough, agentsQuery.isLoading]);

  return {
    ...agentsQuery,
    isInWalkthrough,
  };
}; 