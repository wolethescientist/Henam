import React, { useState } from 'react';
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
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  AvatarGroup,
  IconButton,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  PersonAdd,
  Settings,
} from '@mui/icons-material';
import { useCrudFeedback } from '../../hooks/useCrudFeedback';
import { useFeedback } from '../../contexts/FeedbackContext';
import LoadingButton from '../common/LoadingButton';
import type { Team } from '../../types';

// Mock API functions
const mockApi = {
  createTeam: async (teamData: any): Promise<Team> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return {
      id: Date.now(),
      ...teamData,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },
  
  updateTeam: async (id: number, updates: Partial<Team>): Promise<Team> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      id,
      name: 'Updated Team',
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
  },
  
  deleteTeam: async (_id: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
  },
  
  addMemberToTeam: async (teamId: number, userId: number): Promise<Team> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      id: teamId,
      name: 'Team',
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [{ 
        id: userId, 
        name: 'New Member', 
        email: 'member@example.com',
        is_active: true,
        created_at: new Date().toISOString()
      }],
    };
  }
};

/**
 * Example Teams component demonstrating the global CRUD feedback system
 */
const TeamsWithFeedback: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 1,
      name: 'Development Team',
      supervisor_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [
        { 
          id: 1, 
          name: 'John Doe', 
          email: 'john@example.com',
          is_active: true,
          created_at: new Date().toISOString()
        },
        { 
          id: 2, 
          name: 'Jane Smith', 
          email: 'jane@example.com',
          is_active: true,
          created_at: new Date().toISOString()
        },
      ],
    }
  ]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const { loading, createWithFeedback, updateWithFeedback, deleteWithFeedback } = useCrudFeedback();
  const { withGlobalLoading } = useFeedback();

  // Create team with feedback
  const handleCreateTeam = createWithFeedback(
    async (teamData: any) => {
      const newTeam = await mockApi.createTeam(teamData);
      setTeams(prev => [...prev, newTeam]);
      setFormData({ name: '' });
      setOpenDialog(false);
      return newTeam;
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
    async (id: number, updates: Partial<Team>) => {
      const updatedTeam = await mockApi.updateTeam(id, updates);
      setTeams(prev => prev.map(team => team.id === id ? updatedTeam : team));
      setEditingTeam(null);
      return updatedTeam;
    },
    {
      loadingMessage: 'Updating team...',
      successMessage: 'Team updated successfully!',
      errorMessage: 'Failed to update team. Please try again.',
      loadingType: 'button'
    }
  );

  // Delete team with feedback
  const handleDeleteTeam = deleteWithFeedback(
    async (id: number) => {
      await mockApi.deleteTeam(id);
      setTeams(prev => prev.filter(team => team.id !== id));
    },
    {
      loadingMessage: 'Deleting team...',
      successMessage: 'Team deleted successfully!',
      errorMessage: 'Failed to delete team. Please try again.',
      loadingType: 'button'
    }
  );

  // Add member with global loading
  const handleAddMember = withGlobalLoading(
    'team-member-add',
    async (teamId: number, userId: number) => {
      const updatedTeam = await mockApi.addMemberToTeam(teamId, userId);
      setTeams(prev => prev.map(team => team.id === teamId ? updatedTeam : team));
    },
    {
      loadingMessage: 'Adding member...',
      loadingType: 'button',
      successMessage: 'Member added successfully!',
      errorMessage: 'Failed to add member. Please try again.'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      handleUpdateTeam(editingTeam.id, formData);
    } else {
      handleCreateTeam(formData);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
    });
    setOpenDialog(true);
  };


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Teams Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingTeam(null);
            setFormData({ name: '' });
            setOpenDialog(true);
          }}
          sx={{
            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
            }
          }}
        >
          Add Team
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search teams..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      {/* Teams Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {team.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supervisor ID: {team.supervisor_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AvatarGroup max={4}>
                      {team.members?.map((member) => (
                        <Avatar key={member.id} sx={{ width: 32, height: 32 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Typography variant="body2" color="text.secondary">
                      {team.members?.length || 0} members
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {team.members?.length || 0} members
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEdit(team)}
                      disabled={loading.isLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteTeam(team.id)}
                      disabled={loading.isLoading}
                    >
                      Delete
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleAddMember(team.id, Date.now())}
                      disabled={loading.isLoading}
                      sx={{ color: 'primary.main' }}
                    >
                      <PersonAdd />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      <Settings />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingTeam ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Team Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={loading.isLoading}
              loadingText={editingTeam ? 'Updating...' : 'Creating...'}
              sx={{
                background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                }
              }}
            >
              {editingTeam ? 'Update Team' : 'Create Team'}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default TeamsWithFeedback;
