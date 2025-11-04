import React, { useEffect } from 'react';
import { useGetUnifiedTeamsDataQuery } from '../../store/api/unifiedApis';

interface ApiCallTrackerProps {
  componentName: string;
  params?: any;
  enabled?: boolean;
}

const ApiCallTracker: React.FC<ApiCallTrackerProps> = ({ 
  componentName, 
  params = { page: 1, limit: 10 }, 
  enabled = true 
}) => {
  const { data, error, requestId } = useGetUnifiedTeamsDataQuery(params, {
    skip: !enabled,
  });

  useEffect(() => {
    if (enabled) {
      console.log(`🔍 [${componentName}] API call initiated`, {
        params,
        requestId,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack?.split('\n').slice(1, 5)
      });
    }
  }, [componentName, params, enabled, requestId]);

  useEffect(() => {
    if (data) {
      console.log(`✅ [${componentName}] API call completed`, {
        teamsCount: data.teams?.length || 0,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }, [data, componentName, requestId]);

  useEffect(() => {
    if (error) {
      console.log(`❌ [${componentName}] API call failed`, {
        error,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }, [error, componentName, requestId]);

  return null; // This component doesn't render anything
};

export default ApiCallTracker;