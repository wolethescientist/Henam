import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  Card,
  CardContent,
  Grid,
  Avatar,
} from '@mui/material';
import {
  AccessTime,
  Login,
  Logout,
  Search,
  Schedule,
  TrendingUp,
  CheckCircle,
  Cancel,
  Warning,
  Person,
} from '@mui/icons-material';
import { useGetUnifiedAttendanceDataQuery } from '../../store/api/unifiedApis';
import { useCheckInMutation, useCheckOutMutation } from '../../store/api/attendanceApi';
import { useAppSelector } from '../../hooks/redux';
import { useHighlight } from '../../hooks/useHighlight';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const OptimizedAttendancePage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { getHighlightStyles } = useHighlight();

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  const { user: currentUser } = useAppSelector((state) => state.auth);
  
  // Single user system - all functionality available
  
  // Only make API calls if user has permission
  
  // Single API call instead of multiple separate calls
  const { data: unifiedData, isLoading, error } = useGetUnifiedAttendanceDataQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: debouncedSearchTerm || undefined,
    user_id: undefined, // Show all users
    team_id: undefined, // Admin can see all teams
  });

  const [checkIn] = useCheckInMutation();
  const [checkOut] = useCheckOutMutation();

  const attendanceRecords = unifiedData?.attendance_records || [];
  const stats = unifiedData?.stats || {
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0
  };

  const filteredRecords = attendanceRecords; // Already filtered by API

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCheckIn = async () => {
    try {
      await checkIn({}).unwrap();
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut({}).unwrap();
    } catch (error) {
      console.error('Failed to check out:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'late': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle />;
      case 'absent': return <Cancel />;
      case 'late': return <Warning />;
      default: return <Schedule />;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString();
  };

  const getAttendanceRate = () => {
    if (stats.total_records === 0) return 0;
    return Math.round((stats.present_count / stats.total_records) * 100);
  };

  if (isLoading) {
    return <SkeletonLoader variant="attendance" count={10} />;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Failed to load attendance data. Please try again.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Attendance Management</Typography>
        {currentUser && (
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<Login />}
              onClick={handleCheckIn}
              color="success"
            >
              Check In
            </Button>
            <Button
              variant="outlined"
              startIcon={<Logout />}
              onClick={handleCheckOut}
              color="error"
            >
              Check Out
            </Button>
          </Box>
        )}
      </Box>

      {/* Search and Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid component="div" sx={{ xs: 12, md: 8 }}>
          <TextField
            fullWidth
            placeholder="Search attendance records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid component="div" sx={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {getAttendanceRate()}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Attendance Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2, bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.present_count}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Present Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2, bgcolor: 'error.main' }}>
                  <Cancel />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.absent_count}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Absent Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2, bgcolor: 'warning.main' }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.late_count}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Late Days
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <AccessTime />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.total_records}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Attendance Records Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hours Worked</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow 
                  key={record.id}
                  sx={{
                    ...getHighlightStyles(`attendance-${record.id}`),
                  }}
                >
                  {currentUser && (
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {record.staff?.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {record.staff?.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {record.staff?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Schedule sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">
                        {new Date(record.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(record.check_in)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(record.check_out)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      color={getStatusColor(record.status) as any}
                      size="small"
                      icon={getStatusIcon(record.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {record.check_in && record.check_out ? 
                        `${Math.round((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60) * 10) / 10}h` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      No notes
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={unifiedData?.total_count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Quick Actions */}
      {currentUser && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Login />}
                onClick={handleCheckIn}
                color="success"
              >
                Check In Now
              </Button>
            </Grid>
            <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Logout />}
                onClick={handleCheckOut}
                color="error"
              >
                Check Out Now
              </Button>
            </Grid>
            <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<TrendingUp />}
                href="/finance"
              >
                View Reports
              </Button>
            </Grid>
            <Grid component="div" sx={{ xs: 12, sm: 6, md: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Person />}
                href="/profile"
              >
                Update Profile
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default OptimizedAttendancePage;
