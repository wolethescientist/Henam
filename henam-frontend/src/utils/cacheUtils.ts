/**
 * Cache utilities for clearing corrupted data
 */

import { store } from '../store';

export const clearTeamsCache = () => {
  console.log('🧹 Clearing teams cache...');
  
  // Clear RTK Query cache for teams
  store.dispatch({
    type: 'api/invalidateTags',
    payload: ['Team']
  });
  
  // Clear unified teams cache
  store.dispatch({
    type: 'api/invalidateTags', 
    payload: ['User']
  });
  
  // Force refetch
  window.location.reload();
};

export const clearJobsCache = () => {
  console.log('🧹 Clearing jobs cache...');
  
  // Clear RTK Query cache for jobs
  store.dispatch({
    type: 'api/invalidateTags',
    payload: ['Job']
  });
  
  // Clear related caches
  store.dispatch({
    type: 'api/invalidateTags', 
    payload: ['Team', 'User', 'Invoice']
  });
  
  // Add timestamp to force backend cache clear
  sessionStorage.setItem('refresh_timestamp', Date.now().toString());
  
  // Force refetch without full page reload
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

export const softRefreshJobs = () => {
  console.log('🔄 Soft refreshing jobs data...');
  
  // Clear RTK Query cache for jobs only
  store.dispatch({
    type: 'api/invalidateTags',
    payload: ['Job']
  });
  
  // Add timestamp to force backend cache clear
  sessionStorage.setItem('refresh_timestamp', Date.now().toString());
};

export const emergencyCacheClear = () => {
  console.log('🚨 EMERGENCY CACHE CLEAR');
  
  // Clear all RTK Query cache
  store.dispatch({ type: 'api/util/resetApiState' });
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Reload page
  window.location.reload();
};

export const debugTeamsData = (data: any) => {
  console.log('🔍 TEAMS DEBUG DATA:', {
    teams: data?.teams?.length || 0,
    supervisors: data?.supervisors?.length || 0,
    available_staff: data?.available_staff?.length || 0,
    pagination: data?.pagination,
    firstTeam: data?.teams?.[0],
    rawData: data
  });
};