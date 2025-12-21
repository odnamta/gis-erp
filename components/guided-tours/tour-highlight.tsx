'use client';

/**
 * Tour Highlight Component
 * v0.37: Training Mode / Guided Tours
 * 
 * Overlay that highlights the target element during a tour step
 */

import React, { useEffect, useState } from 'react';

interface TourHighlightProps {
  target: string;
  padding?: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourHighlight({ target, padding = 8 }: TourHighlightProps) {
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateHighlight = () => {
      const element = document.querySelector(target);
      
      if (!element) {
        setRect(null);
        setIsVisible(false);
        return;
      }

      const elementRect = element.getBoundingClientRect();
      
      setRect({
        top: elementRect.top - padding,
        left: elementRect.left - padding,
        width: elementRect.width + padding * 2,
        height: elementRect.height + padding * 2,
      });
      setIsVisible(true);

      // Scroll element into view if needed
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    };

    // Initial update
    updateHighlight();

    // Update on scroll/resize
    window.addEventListener('scroll', updateHighlight, true);
    window.addEventListener('resize', updateHighlight);

    // Also update periodically in case of dynamic content
    const interval = setInterval(updateHighlight, 500);

    return () => {
      window.removeEventListener('scroll', updateHighlight, true);
      window.removeEventListener('resize', updateHighlight);
      clearInterval(interval);
    };
  }, [target, padding]);

  if (!isVisible || !rect) {
    // Show full overlay when target not found
    return (
      <div
        className="fixed inset-0 z-[10000] bg-black/50 transition-opacity duration-300"
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  return (
    <>
      {/* Overlay with cutout for target element */}
      <div
        className="fixed inset-0 z-[10000] transition-opacity duration-300"
        style={{ pointerEvents: 'none' }}
      >
        {/* Top overlay */}
        <div
          className="absolute bg-black/50"
          style={{
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(0, rect.top),
          }}
        />
        
        {/* Left overlay */}
        <div
          className="absolute bg-black/50"
          style={{
            top: rect.top,
            left: 0,
            width: Math.max(0, rect.left),
            height: rect.height,
          }}
        />
        
        {/* Right overlay */}
        <div
          className="absolute bg-black/50"
          style={{
            top: rect.top,
            left: rect.left + rect.width,
            right: 0,
            height: rect.height,
          }}
        />
        
        {/* Bottom overlay */}
        <div
          className="absolute bg-black/50"
          style={{
            top: rect.top + rect.height,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        
        {/* Highlight border around target */}
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 4px rgba(var(--primary), 0.2)',
          }}
        />
      </div>
    </>
  );
}

export default TourHighlight;
