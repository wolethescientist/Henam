import React from 'react';
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import { useGetUnifiedTeamsDataQuery } from '../../store/api/unifiedApis';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../common/Pagination';

const PaginatedTeamsList: React.FC = () => {
  const { page, limit, setPage, setLimit } = usePagination({
    initialPage: 1,
    initialLimit: 10,
  });

  const {
    data,
    error,
    isLoading,
    isFetching,
  } = useGetUnifiedTeamsDataQuery({
    page,
    limit,
  });

  if (isLoading) {
    return (
      <Box textAlign="center" sx={{ py: 8 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading teams...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load teams. Please try again.
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="warning">
        <AlertTitle>Warning</AlertTitle>
        No teams data available.
      </Alert>
    );
  }

  const { teams, pagination } = data;

  return (
    <Stack spacing={3}>
      {/* Teams List */}
      <Box>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          Teams ({pagination.total_count})
        </Typography>
        
        {isFetching && (
          <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
            Updating...
          </Typography>
        )}

        {teams.length === 0 ? (
          <Typography color="text.secondary">No teams found.</Typography>
        ) : (
          <Stack spacing={2}>
            {teams.map((team) => (
              <Box
                key={team.id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="subtitle1" fontWeight="semibold">
                  {team.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supervisor: {team.supervisor?.name || 'Not assigned'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Members: {team.members?.length || 0}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.total_pages}
        totalCount={pagination.total_count}
        limit={pagination.limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        hasNext={pagination.has_next}
        hasPrevious={pagination.has_previous}
        startIndex={pagination.start_index}
        endIndex={pagination.end_index}
        showLimitSelector={true}
        showInfo={true}
      />
    </Stack>
  );
};

export default PaginatedTeamsList;
