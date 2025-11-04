import { useMemo, useState } from 'react';
import { useAppSelector } from './redux';

/**
 * Hook for conditional API queries based on user authentication and other conditions
 */
export const useConditionalQuery = () => {
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const queryOptions = useMemo(() => {
    return {
      // Single-user system - enable all queries
      skipFinancialReports: false,
      skipMonthlyReports: false,
      skipTeamManagement: false,
      skipUserManagement: false,
      
      // Skip heavy queries by default, load on demand
      skipDetailedReports: true,
      skipAnalytics: true,
      
      // User-specific queries
      skipPersonalData: !currentUser,
    };
  }, [currentUser]);

  return queryOptions;
};

/**
 * Hook for lazy loading of expensive queries
 */
export const useLazyLoading = () => {
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());

  const loadSection = (section: string) => {
    setLoadedSections(prev => new Set(prev).add(section));
  };

  const isSectionLoaded = (section: string) => {
    return loadedSections.has(section);
  };

  const shouldLoadSection = (section: string) => {
    return isSectionLoaded(section);
  };

  return {
    loadSection,
    isSectionLoaded,
    shouldLoadSection,
  };
};
