import { useState, useEffect, useRef } from 'react';

// Isolated connection status manager
export const useConnectionStatus = (initialStatus = 'disconnected') => {
  const [connectionStatus, setConnectionStatus] = useState(initialStatus);
  const statusRef = useRef(initialStatus);

  const updateStatus = (newStatus) => {
    statusRef.current = newStatus;
    setConnectionStatus(newStatus);
  };

  const handleConnectionCheck = async (checkFunction) => {
    if (!checkFunction) return;

    updateStatus('checking');
    
    try {
      const result = await checkFunction();
      updateStatus(result ? 'connected' : 'error');
      return result;
    } catch (error) {
      updateStatus('error');
      throw error;
    }
  };

  return {
    connectionStatus,
    updateStatus,
    handleConnectionCheck,
    isChecking: connectionStatus === 'checking'
  };
};

export default useConnectionStatus; 