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
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Groups,
  Add,
  Edit,
  Delete,
  Search,
  Visibility,
  PersonAdd,
  PersonRemove,
} from '@mui/icons-material';
import KebabMenu from '../../components/common/KebabMenu';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useGetUnifiedTeamsDataQuery } from '../../store/api/unifiedApis';
import { useDeleteTeamMutation, useCreateTeamMutation, useUpdateTeamMutation, useAddTeamMemberMutation, useRemoveTeamMemberMutation } from '../../store/api/teamsApi';
import ApiCallTracker from '../../components/debug/ApiCallTracker';
import { useDispatch } from 'react-redux';
import { baseApi } from '../../store/api/baseApi';
import type { Team, CreateTeamForm } from '../../types';
import { useHighlight } from '../../hooks/useHighlight';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';

const OptimizedTeamsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTeamForm>({
    name: '',
    supervisor_id: undefined,
  });
  const { getHighlightStyles } = useHighlight();
  const dispatch = useDispatch();

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

  // Single API call with stable caching
  const { data: unifiedData, isLoading, error, refetch } = useGetUnifiedTeamsDataQuery({
    page: page + 1,
    limit: rowsPerPage,
    search: debouncedSearchTerm || undefined,
  }, {
    refetchOnMountOrArgChange: 60, // Only refetch if data is older than 60 seconds
    refetchOnFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't auto-refetch on reconnect to prevent race conditions
    skip: false, // Never skip the query
  });

  // Remove aggressive refetch - let RTK Query handle it

  // Debug logging with data validation
  React.useEffect(() => {
    console.log('🔍 Teams Data Debug:', {
      isLoading,
      error,
      unifiedData,
      teams: unifiedData?.teams,
      teamsCount: unifiedData?.teams?.length,
      firstTeam: unifiedData?.teams?.[0],
      firstTeamSupervisor: unifiedData?.teams?.[0]?.supervisor,
      firstTeamMembers: unifiedData?.teams?.[0]?.members,
      supervisorsCount: unifiedData?.supervisors?.length,
      availableStaffCount: unifiedData?.available_staff?.length
    });

    // Validate data integrity
    if (unifiedData?.teams) {
      const teamsWithoutSupervisors = unifiedData.teams.filter(team => !team.supervisor);
      const teamsWithoutMembers = unifiedData.teams.filter(team => !team.members || team.members.length === 0);
      
      if (teamsWithoutSupervisors.length > 0) {
        console.warn('⚠️ Teams without supervisors:', teamsWithoutSupervisors.length);
      }
      if (teamsWithoutMembers.length > 0) {
        console.warn('⚠️ Teams without members:', teamsWithoutMembers.length);
      }
    }
  }, [unifiedData, isLoading, error]);

  const [deleteTeam] = useDeleteTeamMutation();
  const [createTeam] = useCreateTeamMutation();
  const [updateTeam] = useUpdateTeamMutation();
  const [addTeamMember] = useAddTeamMemberMutation();
  const [removeTeamMember] = useRemoveTeamMemberMutation();

  // Initialize feedback hooks
  const { createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();

  // Data extraction with validation
  const teams = unifiedData?.teams || [];
  const supervisors = unifiedData?.supervisors || [];
  const availableStaff = unifiedData?.available_staff || [];

  const filteredTeams = teams; // Already filtered by search in API

  // Prevent rendering if we have teams but they're all missing critical data
  // This could indicate a race condition or corrupted cache
  const hasValidTeamData = teams.length === 0 || teams.some(team => 
    team.id && team.name && (team.supervisor || team.members)
  );

  // Additional debugging
  console.log('🔍 Detailed Teams Debug:', {
    rawUnifiedData: unifiedData,
    teamsArray: teams,
    firstTeam: teams[0],
    firstTeamSupervisor: teams[0]?.supervisor,
    firstTeamMembers: teams[0]?.members,
    firstTeamCreatedAt: teams[0]?.created_at,
    hasValidTeamData,
    dataIntegrityCheck: {
      teamsCount: teams.length,
      supervisorsCount: supervisors.length,
      availableStaffCount: availableStaff.length,
      teamsWithSupervisors: teams.filter(t => t.supervisor).length,
      teamsWithMembers: teams.filter(t => t.members && t.members.length > 0).length
    }
  });

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        supervisor_id: team.supervisor_id || undefined,
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        supervisor_id: undefined,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTeam(null);
  };

  const handleInputChange = (field: keyof CreateTeamForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  // Create team with feedback
  const handleCreateTeam = createWithFeedback(
    async (teamData: CreateTeamForm) => {
      const result = await createTeam(teamData).unwrap();
      handleCloseDialog();
      // Force refetch to ensure the new team appears immediately
      refetch();
      return result;
    },
    {
      loadingMessage: 'Creating team...',
      successMessage: 'Team created successfully!',
      errorMessage: 'Failed to create team. Please try again.',
      loadingType: 'button'
    }
  );

  // Update team with feedback
  const handleUpdateTeam = updateWithFeedback(
    async (teamData: CreateTeamForm) => {
      if (!editingTeam) throw new Error('No team selected for update');
      const result = await updateTeam({ id: editingTeam.id, data: teamData }).unwrap();
      handleCloseDialog();
      // Force refetch to ensure the updated team appears immediately
      refetch();
      return result;
    },
    {
      loadingMessage: 'Updating team...',
      successMessage: 'Team updated successfully!',
      errorMessage: 'Failed to update team. Please try again.',
      loadingType: 'button'
    }
  );

  const handleSubmit = async () => {
    if (editingTeam) {
      await handleUpdateTeam(formData);
    } else {
      await handleCreateTeam(formData);
    }
  };

  // Delete team with feedback
  const handleDeleteTeam = deleteWithFeedback(
    async (teamId: number) => {
      await deleteTeam(teamId).unwrap();
      // Force refetch to ensure the deleted team is removed immediately
      refetch();
    },
    {
      loadingMessage: 'Deleting team...',
      successMessage: 'Team deleted successfully!',
      errorMessage: 'Failed to delete team. Please try again.',
      loadingType: 'button'
    }
  );

  const handleDelete = async (teamId: number) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      await handleDeleteTeam(teamId);
    }
  };

  const handleViewMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const handleAddMember = async (userId: number) => {
    if (selectedTeam && selectedTeam.id) {
      try {
        await addTeamMember({ teamId: selectedTeam.id, userId }).unwrap();
        // Force refetch to ensure the updated team members appear immediately
        refetch();
      } catch (error) {
        console.error('Failed to add team member:', error);
      }
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (selectedTeam && selectedTeam.id) {
      try {
        await removeTeamMember({ teamId: selectedTeam.id, userId }).unwrap();
        // Force refetch to ensure the updated team members appear immediately
        refetch();
      } catch (error) {
        console.error('Failed to remove team member:', error);
      }
    }
  };

  if (isLoading) {
    return <SkeletonLoader variant="teams" count={10} />;
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Failed to load teams. Please try again.</Alert>
      </Box>
    );
  }

  // Handle case where data might be corrupted or incomplete
  if (unifiedData && teams.length > 0 && !hasValidTeamData) {
    console.warn('⚠️ Detected potentially corrupted team data, triggering refresh...');
    
    return (
      <Box p={3}>
        <Alert 
          severity="warning" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                console.log('🔄 Refreshing corrupted data');
                refetch();
              }}
            >
              Refresh
            </Button>
          }
        >
          Team data appears incomplete. Click refresh to reload.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Debug tracker */}
      <ApiCallTracker
        componentName="OptimizedTeamsPage"
        params={{
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearchTerm || undefined,
        }}
      />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Teams Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Team
        </Button>
      </Box>

      {/* Search and Stats */}
      <Box display="flex" flexWrap="wrap" gap={3} mb={3}>
        <Box flex="1" minWidth="300px">
          <TextField
            fullWidth
            placeholder="Search teams..."
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
        </Box>
        <Box minWidth="200px">
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {unifiedData?.pagination?.total_count || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Teams
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Teams Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Team Name</TableCell>
                <TableCell>Supervisor</TableCell>
                <TableCell>Members</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeams.map((team, index) => (
                <TableRow
                  key={team.id ? `team-row-${team.id}` : `team-row-index-${index}`}
                  sx={{
                    ...getHighlightStyles(`team-${team.id || index}`),
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <Groups />
                      </Avatar>
                      <Typography variant="subtitle1">{team.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {team.supervisor && team.supervisor.name ? (
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                          {team.supervisor.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {team.supervisor.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {team.supervisor.email}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Chip label="No Supervisor" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${Array.isArray(team.members) ? team.members.length : 0} members`}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {team.created_at ? new Date(team.created_at).toLocaleDateString() : 'Invalid Date'}
                  </TableCell>
                  <TableCell align="right">
                    <KebabMenu
                      actions={[
                        {
                          label: 'View Members',
                          icon: <Visibility />,
                          onClick: () => handleViewMembers(team),
                        },
                        {
                          label: 'Edit Team',
                          icon: <Edit />,
                          onClick: () => handleOpenDialog(team),
                        },
                        {
                          label: 'Delete Team',
                          icon: <Delete />,
                          onClick: () => team.id && handleDelete(team.id),
                          color: 'error',
                          divider: true,
                          disabled: !team.id,
                        },
                      ]}
                      tooltip="Team actions"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={unifiedData?.pagination?.total_count || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Create/Edit Team Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeam ? 'Edit Team' : 'Create New Team'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Team Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Supervisor</InputLabel>
              <Select
                value={formData.supervisor_id || ''}
                onChange={handleInputChange('supervisor_id')}
                label="Supervisor"
              >
                {supervisors.map((supervisor, index) => (
                  <MenuItem key={supervisor.id ? `supervisor-${supervisor.id}` : `supervisor-index-${index}`} value={supervisor.id}>
                    {supervisor.name} ({supervisor.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTeam ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Members Dialog */}
      <Dialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Team Members - {selectedTeam?.name}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexWrap="wrap" gap={3}>
            <Box flex="1" minWidth="300px">
              <Typography variant="h6" gutterBottom>
                Current Members
              </Typography>
              <List>
                {(selectedTeam?.members || []).map((member, index) => (
                  <ListItem key={member.id ? `member-${member.id}` : `member-index-${index}`}>
                    <ListItemText
                      primary={member.name}
                      secondary={member.email}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Remove from Team">
                        <IconButton
                          edge="end"
                          onClick={() => member.id && handleRemoveMember(member.id)}
                          color="error"
                          disabled={!member.id}
                        >
                          <PersonRemove />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {(!selectedTeam?.members || selectedTeam.members.length === 0) && (
                  <Typography key="no-members" color="text.secondary">No members assigned</Typography>
                )}
              </List>
            </Box>
            <Box flex="1" minWidth="300px">
              <Typography variant="h6" gutterBottom>
                Available Staff
              </Typography>
              <List>
                {availableStaff.map((staff, index) => (
                  <ListItem key={staff.id ? `staff-${staff.id}` : `staff-index-${index}`}>
                    <ListItemText
                      primary={staff.name}
                      secondary={staff.email}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Add to Team">
                        <IconButton
                          edge="end"
                          onClick={() => staff.id && handleAddMember(staff.id)}
                          color="primary"
                          disabled={!staff.id}
                        >
                          <PersonAdd />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {availableStaff.length === 0 && (
                  <Typography key="no-staff" color="text.secondary">No available staff</Typography>
                )}
              </List>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizedTeamsPage;
