import React from 'react';
import {
  Box,
  Button,
  Select,
  MenuItem,
  Typography,
  Stack,
  FormControl,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
  startIndex: number;
  endIndex: number;
  showLimitSelector?: boolean;
  showInfo?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
  hasNext,
  hasPrevious,
  startIndex,
  endIndex,
  showLimitSelector = true,
  showInfo = true,
}) => {
  const handlePrevious = () => {
    if (hasPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLimitChange = (event: any) => {
    onLimitChange(event.target.value);
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <Box>
      {showInfo && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {startIndex} to {endIndex} of {totalCount} results
          </Typography>
          
          {showLimitSelector && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Show:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={limit}
                  onChange={handleLimitChange}
                  size="small"
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                per page
              </Typography>
            </Stack>
          )}
        </Stack>
      )}

      <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
        {/* Previous Button */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<ChevronLeftIcon />}
          onClick={handlePrevious}
          disabled={!hasPrevious}
        >
          Previous
        </Button>

        {/* Page Numbers */}
        <Stack direction="row" spacing={0.5}>
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <Typography sx={{ px: 1, py: 0.5 }} color="text.secondary">
                  ...
                </Typography>
              ) : (
                <Button
                  size="small"
                  variant={page === currentPage ? 'contained' : 'outlined'}
                  color={page === currentPage ? 'primary' : 'inherit'}
                  onClick={() => onPageChange(page as number)}
                  sx={{ minWidth: 40 }}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </Stack>

        {/* Next Button */}
        <Button
          size="small"
          variant="outlined"
          endIcon={<ChevronRightIcon />}
          onClick={handleNext}
          disabled={!hasNext}
        >
          Next
        </Button>
      </Stack>
    </Box>
  );
};

export default Pagination;
