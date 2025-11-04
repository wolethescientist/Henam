import { useEffect, useState } from 'react';

export const useHighlight = () => {
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an item to highlight from notification navigation
    const itemToHighlight = sessionStorage.getItem('highlightItem');
    if (itemToHighlight) {
      setHighlightedItem(itemToHighlight);
      
      // Clear the highlight after 1.5 seconds
      const timer = setTimeout(() => {
        setHighlightedItem(null);
        sessionStorage.removeItem('highlightItem');
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  const isHighlighted = (itemId: string) => {
    return highlightedItem === itemId;
  };

  const getHighlightStyles = (itemId: string) => {
    if (isHighlighted(itemId)) {
      return {
        backgroundColor: 'success.light',
        border: '2px solid',
        borderColor: 'success.main',
        boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)',
        transform: 'scale(1.01)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        animation: 'smoothPulse 1.2s ease-in-out infinite',
        '@keyframes smoothPulse': {
          '0%': {
            boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)',
            transform: 'scale(1.01)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(76, 175, 80, 0.7)',
            transform: 'scale(1.015)',
          },
          '100%': {
            boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)',
            transform: 'scale(1.01)',
          },
        },
      };
    }
    return {};
  };

  return {
    highlightedItem,
    isHighlighted,
    getHighlightStyles,
  };
};
