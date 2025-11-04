import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to prevent duplicate API calls during navigation
 * Tracks which queries have been made in the current session
 */
export const useSessionQuery = () => {
  const location = useLocation();
  const sessionQueries = useRef<Set<string>>(new Set());
  const lastLocation = useRef<string>('');

  useEffect(() => {
    // Clear session queries only on page refresh, not navigation
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation && navigation.type === 'reload') {
      sessionQueries.current.clear();
      console.log('🔄 Session queries cleared due to page refresh');
    }
  }, []);

  useEffect(() => {
    // Track location changes but don't clear queries
    if (lastLocation.current !== location.pathname) {
      console.log(`📍 Navigation: ${lastLocation.current} → ${location.pathname}`);
      lastLocation.current = location.pathname;
    }
  }, [location.pathname]);

  const shouldSkipQuery = (queryKey: string, additionalConditions: boolean = false) => {
    const fullKey = `${location.pathname}-${queryKey}`;
    const hasQueried = sessionQueries.current.has(fullKey);
    
    if (!hasQueried && !additionalConditions) {
      sessionQueries.current.add(fullKey);
      console.log(`✅ Allowing query: ${queryKey} for ${location.pathname}`);
      return false;
    }
    
    if (hasQueried) {
      console.log(`⏭️ Skipping duplicate query: ${queryKey} for ${location.pathname}`);
    }
    
    return hasQueried || additionalConditions;
  };

  const clearQueryCache = (queryKey?: string) => {
    if (queryKey) {
      const fullKey = `${location.pathname}-${queryKey}`;
      sessionQueries.current.delete(fullKey);
      console.log(`🗑️ Cleared query cache: ${queryKey}`);
    } else {
      sessionQueries.current.clear();
      console.log('🗑️ Cleared all query cache');
    }
  };

  return {
    shouldSkipQuery,
    clearQueryCache,
    currentPath: location.pathname
  };
};