import React, { useState, useEffect, useRef } from 'react';
import OnboardingBanner from './OnboardingBanner';

const StableBannerContainer = ({ banners, onCloseBanner }) => {
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);
  const [stableBanners, setStableBanners] = useState(banners);
  const loadingTimeoutRef = useRef(null);
  const bannersRef = useRef(banners);

  // Keep ref updated
  useEffect(() => {
    bannersRef.current = banners;
  }, [banners]);

  // Listen for loading state changes
  useEffect(() => {
    const handleLoadingStateChange = (event) => {
      const { loading } = event.detail;
      
      if (loading) {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setIsLoadingBlocked(true);
      } else {
        // Delay unblocking to prevent flicker
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoadingBlocked(false);
          // Update stable banners when loading is done
          setStableBanners([...bannersRef.current]);
        }, 150);
      }
    };

    window.addEventListener('onboarding:loading-state-change', handleLoadingStateChange);
    return () => {
      window.removeEventListener('onboarding:loading-state-change', handleLoadingStateChange);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Update stable banners only when not loading blocked
  useEffect(() => {
    if (!isLoadingBlocked) {
      setStableBanners(banners);
    }
  }, [banners, isLoadingBlocked]);

  return (
    <>
      {stableBanners.map(banner => (
        <OnboardingBanner
          key={banner.id}
          {...banner}
          onClose={() => onCloseBanner(banner.id)}
        />
      ))}
    </>
  );
};

export default StableBannerContainer; 