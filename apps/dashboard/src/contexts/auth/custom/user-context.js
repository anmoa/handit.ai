/**
 * Custom Authentication Context
 * 
 * This module implements a React context for managing user authentication state
 * in a custom authentication system. It provides user data, loading states,
 * and error handling to the application.
 * 
 * Features:
 * - User session management
 * - Loading state handling
 * - Error state management
 * - Session checking functionality
 * 
 * @module user-context
 */

'use client';

import * as React from 'react';

import { authClient } from '@/lib/auth/custom/client';
import { logger } from '@/lib/default-logger';

/**
 * React context for user authentication state
 * Provides access to user data, loading states, and error information
 * @type {React.Context}
 */
export const UserContext = React.createContext(undefined);

/**
 * Provider component for user authentication context
 * Manages user session state and provides authentication functionality
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be wrapped
 * @returns {JSX.Element} Context provider component
 */
export function UserProvider({ children }) {
  // Initialize state with default values
  const [state, setState] = React.useState({
    user: null,
    error: null,
    isLoading: true,
  });

  /**
   * Checks the current user session
   * Attempts to retrieve and validate the current user's session
   * 
   * @returns {Promise<Object|null>} User data if session is valid, null otherwise
   */
  const checkSession = React.useCallback(async () => {
    try {
      // Attempt to get user data from the auth client
      const { data, error } = await authClient.getUser();

      if (error) {
        // Log error and update state with error information
        logger.error(error);
        setState((prev) => ({ ...prev, user: null, error: 'Something went wrong', isLoading: false }));
        return;
      }

      // Update state with user data
      setState((prev) => ({ ...prev, user: data ?? null, error: null, isLoading: false }));
      return data;
    } catch (err) {
      // Handle unexpected errors
      logger.error(err);
      setState((prev) => ({ ...prev, user: null, error: 'Something went wrong', isLoading: false }));
    }
  }, []);

  // Check session on component mount
  React.useEffect(() => {
    checkSession().catch((err) => {
      logger.error(err);
      // noop
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Expected
  }, []);

  // Listen for user data changes (e.g., onboarding progress updates)
  React.useEffect(() => {
    const handleUserDataChanged = (event) => {
      checkSession().then((userData) => {
        console.log('User context: Session refreshed, new user data:', userData?.onboardingCurrentTour);
      }).catch((err) => {
        logger.error('Failed to refresh user session:', err);
      });
    };

    // Add event listener
    window.addEventListener('userDataChanged', handleUserDataChanged);

    // Cleanup event listener
    return () => {
      window.removeEventListener('userDataChanged', handleUserDataChanged);
    };
  }, [checkSession]);

  // Provide context value to children
  return <UserContext.Provider value={{ ...state, checkSession }}>{children}</UserContext.Provider>;
}

/**
 * Consumer component for user authentication context
 * Allows components to subscribe to authentication state changes
 * @type {React.Consumer}
 */
export const UserConsumer = UserContext.Consumer;
