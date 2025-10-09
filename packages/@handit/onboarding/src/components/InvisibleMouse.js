import React, { useState, useEffect, useRef } from 'react';
import { Box, Fade } from '@mui/material';
import { CursorClick, Hand } from '@phosphor-icons/react';

const InvisibleMouse = ({ 
  visible = false,
  position = { x: 0, y: 0 },
  type = 'pointer', // 'pointer', 'click', 'hand'
  size = 24,
  color = '#42a5f5',
  animationDuration = 150,
  trail = false,
  pulsing = false
}) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isAnimating, setIsAnimating] = useState(false);
  const [trailPositions, setTrailPositions] = useState([]);
  const mouseRef = useRef(null);

  useEffect(() => {
    if (position.x !== currentPosition.x || position.y !== currentPosition.y) {
      if (trail) {
        setTrailPositions(prev => [...prev.slice(-5), currentPosition]);
      }
      
      setCurrentPosition(position);
    }
  }, [position, currentPosition, trail]);

  const getMouseIcon = () => {
    switch (type) {
      case 'click':
        return <CursorClick size={size} color={color} weight="fill" />;
      case 'hand':
        return <Hand size={size} color={color} weight="fill" />;
      default:
        return (
          <Box sx={{ position: 'relative', display: 'inline-block', width: '60px', height: '40px' }}>
            {/* Clean SVG mouse cursor */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              style={{
                position: 'absolute',
                top: 16,
                left: 0,
                zIndex: 100000,
                filter: 'drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.4))',
              }}
            >
              <path
                d="M0 0 L0 14 L4 10 L7 16 L9 15 L6 9 L11 9 Z"
                fill={color}
              />
            </svg>
            {/* HandIt banner positioned at bottom right - clean design */}
            <Box
              sx={{
                bgcolor: color,
                color: 'white',
                borderRadius: '12px',
                px: 1.5,
                py: 0.5,
                fontSize: '10px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                height: '20px',
                position: 'absolute',
                top: '28px',
                left: '18px',
                zIndex: 100000,
              }}
            >
              HandIt
            </Box>
          </Box>
        );
    }
  };



  if (!visible) return null;

  return (
    <>
      {/* Trail Effect */}
      {trail && trailPositions.map((trailPos, index) => (
        <Fade 
          key={`trail-${index}`} 
          in={true} 
          timeout={500}
          style={{
            transitionDelay: `${index * 100}ms`
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              left: trailPos.x,
              top: trailPos.y,
              zIndex: 100000 + index,
              pointerEvents: 'none',
              opacity: (index + 1) / trailPositions.length * 0.3,
              transform: 'translate(-50%, -50%)',
              cursor: 'none',
            }}
          >
            {getMouseIcon()}
          </Box>
        </Fade>
      ))}

      {/* Main Mouse Cursor */}
      <Fade in={visible} timeout={200}>
        <Box
          ref={mouseRef}
          sx={{
            position: 'fixed',
            left: currentPosition.x,
            top: currentPosition.y,
            zIndex: 100000,
            cursor: 'none',
            transform: 'translate(-50%, -50%)',
            transition: isAnimating ? 'none' : `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            animation: pulsing ? 'pulse 1.5s ease-in-out infinite' : 'none',
            pointerEvents: 'none', // Allow clicks to pass through
            '@keyframes pulse': {
              '0%': {
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 1,
              },
              '50%': {
                transform: 'translate(-50%, -50%) scale(1.2)',
                opacity: 0.7,
              },
              '100%': {
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 1,
              },
            },
          }}
        >
          {getMouseIcon()}
        </Box>
      </Fade>
    </>
  );
};

// Hook for controlling the invisible mouse
export const useInvisibleMouse = () => {
  const [mouseState, setMouseState] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    type: 'pointer',
    pulsing: false,
    trail: false,
  });

  // Use ref to track current position to avoid stale state issues
  const currentPositionRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(false);

  // Update refs whenever state changes
  useEffect(() => {
    currentPositionRef.current = mouseState.position;
    isVisibleRef.current = mouseState.visible;
  }, [mouseState.position, mouseState.visible]);

  const showMouse = (options = {}) => {
    setMouseState(prev => ({
      ...prev,
      visible: true,
      ...options,
    }));
  };

  const hideMouse = () => {
    setMouseState(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const moveMouse = (x, y, options = {}) => {
    setMouseState(prev => ({
      ...prev,
      position: { x, y },
      ...options,
    }));
  };

  const clickAt = (x, y, callback) => {
    moveMouse(x, y, { type: 'click', pulsing: true });
    setTimeout(() => {
      if (callback) callback();
      setMouseState(prev => ({
        ...prev,
        type: 'pointer',
        pulsing: false,
      }));
    }, 200);
  };

  const moveToElement = (selector, offset = { x: 0, y: 0 }) => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + offset.x;
      const y = rect.top + rect.height / 2 + offset.y;
      moveMouse(x, y);
      return { x, y };
    }
    return null;
  };

  const animateToElement = (selector, options = {}) => {
    const {
      duration = 800,
      startFromCenter = true,
      offset = { x: 0, y: 0 },
      onComplete
    } = options;

    const element = document.querySelector(selector);
    if (!element) {
      console.warn('Element not found for selector:', selector);
      return null;
    }

    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2 + offset.x;
    const targetY = rect.top + rect.height / 2 + offset.y;

    // Smart start position logic:
    // 1. If mouse is already visible, start from current position
    // 2. If mouse is not visible, respect startFromCenter parameter
    let startX, startY;
    
    if (isVisibleRef.current) {
      // Mouse is already visible, start from current position
      startX = currentPositionRef.current.x;
      startY = currentPositionRef.current.y;
    } else {
      // Mouse is not visible, use startFromCenter parameter
      startX = startFromCenter ? window.innerWidth / 2 : currentPositionRef.current.x;
      startY = startFromCenter ? window.innerHeight / 2 : currentPositionRef.current.y;
    }

    // Only update state if mouse is not visible, or if we need to change other properties
    if (!isVisibleRef.current) {
      setMouseState(prev => ({
        ...prev,
        visible: true,
        position: { x: startX, y: startY },
        type: 'pointer',
        pulsing: true,
        trail: true,
      }));
      
      // Update refs to stay in sync
      currentPositionRef.current = { x: startX, y: startY };
      isVisibleRef.current = true;
    } else {
      // Mouse is already visible, just ensure proper state without changing position
      setMouseState(prev => ({
        ...prev,
        pulsing: true,
        trail: true,
      }));
    }

    // Animate to target with smooth steps
    const steps = 60; // 60 steps for smooth animation
    const stepDuration = duration / steps;
    let currentStep = 0;

    const animate = () => {
      if (currentStep >= steps) {
        // Animation complete
        setMouseState(prev => ({
          ...prev,
          position: { x: targetX, y: targetY },
          pulsing: true,
        }));
        
        // Update position ref to stay in sync
        currentPositionRef.current = { x: targetX, y: targetY };
        
        if (onComplete) onComplete();
        return;
      }

      // Calculate current position using easing
      const progress = currentStep / steps;
      const easeProgress = easeInOutCubic(progress);
      
      const currentX = startX + (targetX - startX) * easeProgress;
      const currentY = startY + (targetY - startY) * easeProgress;

      setMouseState(prev => ({
        ...prev,
        position: { x: currentX, y: currentY },
      }));

      // Update position ref to stay in sync
      currentPositionRef.current = { x: currentX, y: currentY };

      currentStep++;
      setTimeout(animate, stepDuration);
    };

    // Start animation after a brief delay
    setTimeout(animate, 50);
    
    return { x: targetX, y: targetY };
  };

  // Easing function for smooth animation
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const clickElement = (selector, callback) => {
    const position = moveToElement(selector);
    if (position) {
      setTimeout(() => {
        clickAt(position.x, position.y, callback);
      }, 100);
    }
  };

  const MouseComponent = () => <InvisibleMouse {...mouseState} />;

  return {
    showMouse,
    hideMouse,
    moveMouse,
    clickAt,
    moveToElement,
    animateToElement,
    clickElement,
    mouseState,
    MouseComponent,
  };
};

export default InvisibleMouse; 