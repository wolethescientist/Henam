import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Person,
  Edit,
  Lock,
  PhotoCamera,
  Save,
  Cancel,
  Email,
  Phone,
  Badge,
  CalendarToday,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import {
  useUpdateMyProfileMutation,
  useChangeMyPasswordMutation,
  useUploadMyPictureMutation,
} from '../../store/api/authApi';
import { logout } from '../../store/slices/authSlice';
import { useNotifications } from '../../contexts/NotificationContext';
import { API_BASE_URL } from '../../constants';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import PasswordStrengthIndicator from '../../components/common/PasswordStrengthIndicator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ProfileFormData {
  name?: string;
  email?: string;
  phone_number?: string;
  contact_info?: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const profileSchema: yup.ObjectSchema<ProfileFormData> = yup.object({
  name: yup.string().optional(),
  email: yup.string().email('Invalid email').optional(),
  phone_number: yup.string().optional(),
  contact_info: yup.string().optional(),
});

const passwordSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup.string().min(8, 'Password must be at least 8 characters').required('New password is required'),
  confirm_password: yup.string()
    .oneOf([yup.ref('new_password')], 'Passwords must match')
    .required('Please confirm your password'),
});

const ProfilePage: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { addNotification } = useNotifications();
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pictureDialogOpen, setPictureDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateMyProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangeMyPasswordMutation();
  const [uploadPicture, { isLoading: isUploadingPicture }] = useUploadMyPictureMutation();

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      contact_info: user?.contact_info || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: yupResolver(passwordSchema),
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (editMode) {
      resetProfile({
        name: user?.name || '',
        email: user?.email || '',
        phone_number: user?.phone_number || '',
        contact_info: user?.contact_info || '',
      });
    }
    setEditMode(!editMode);
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      await updateProfile(data).unwrap();
      addNotification({ type: 'success', title: 'Success', message: 'Profile updated successfully' });
      setEditMode(false);
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error?.data?.detail || 'Failed to update profile' });
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      }).unwrap();
      
      addNotification({ 
        type: 'success', 
        title: 'Password Changed', 
        message: 'Password changed successfully. You will be logged out for security.' 
      });
      
      setPasswordDialogOpen(false);
      resetPassword();
      
      // Logout user after successful password change
      setTimeout(() => {
        dispatch(logout());
      }, 2000);
      
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error?.data?.detail || 'Failed to change password' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        addNotification({ 
          type: 'error', 
          title: 'Invalid File Type', 
          message: 'Please select a JPEG, PNG, GIF, or WebP image file.' 
        });
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        addNotification({ 
          type: 'error', 
          title: 'File Too Large', 
          message: 'File size must be less than 5MB.' 
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPicture = async () => {
    if (!selectedFile) {
      addNotification({ type: 'error', title: 'Error', message: 'Please select a file to upload' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      await uploadPicture(formData).unwrap();
      addNotification({ type: 'success', title: 'Success', message: 'Profile picture uploaded successfully' });
      setPictureDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Error', message: error?.data?.detail || 'Failed to upload picture' });
    }
  };

  const handleCancelPictureUpload = () => {
    setPictureDialogOpen(false);
    setSelectedFile(null);
    setPreviewUrl('');
  };

  // Show loading while authentication is being restored or user data is being fetched
  if (authLoading || (isAuthenticated && !user)) {
    return <SkeletonLoader variant="profile" count={1} />;
  }

  // Show error only if not authenticated or user data failed to load after auth
  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">User information not available. Please try logging in again.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Person sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Profile
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Profile Header */}
        <Grid component="div" sx={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={user.picture_url ? `${API_BASE_URL}${user.picture_url}` : undefined}
                    sx={{ width: 100, height: 100 }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: -5,
                      right: -5,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                    size="small"
                    onClick={() => setPictureDialogOpen(true)}
                  >
                    <PhotoCamera fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {user.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    {user.is_active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" color="error" size="small" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Tabs */}
        <Grid component="div" sx={{ xs: 12 }}>
          <Paper>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Personal Information" />
              <Tab label="Account Settings" />
            </Tabs>

            {/* Personal Information Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Personal Information</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {editMode ? (
                    <>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSubmitProfile(onSubmitProfile)}
                        disabled={isUpdatingProfile}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={handleEditToggle}
                        disabled={isUpdatingProfile}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEditToggle}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid component="div" sx={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    {...registerProfile('name')}
                    error={!!profileErrors.name}
                    helperText={profileErrors.name?.message}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <Badge sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid component="div" sx={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    {...registerProfile('email')}
                    error={!!profileErrors.email}
                    helperText={profileErrors.email?.message}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid component="div" sx={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    {...registerProfile('phone_number')}
                    error={!!profileErrors.phone_number}
                    helperText={profileErrors.phone_number?.message}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid component="div" sx={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Contact Information"
                    multiline
                    rows={3}
                    {...registerProfile('contact_info')}
                    error={!!profileErrors.contact_info}
                    helperText={profileErrors.contact_info?.message}
                    disabled={!editMode}
                    placeholder="Additional contact information, address, etc."
                  />
                </Grid>
              </Grid>

              {user.team && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Team Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid component="div" sx={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Team"
                        value={user.team.name}
                        disabled
                      />
                    </Grid>
                    {user.supervisor && (
                      <Grid component="div" sx={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Supervisor"
                          value={user.supervisor.name}
                          disabled
                        />
                      </Grid>
                    )}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* Account Settings Tab */}
            <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
                Account Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid component="div" sx={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            Change Password
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Update your account password for security
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          startIcon={<Lock />}
                          onClick={() => setPasswordDialogOpen(true)}
                        >
                          Change Password
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid component="div" sx={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" gutterBottom>
                            Account Status
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Your account is currently {user.is_active ? 'active' : 'inactive'}
                          </Typography>
                        </Box>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          color={user.is_active ? 'success' : 'error'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid component="div" sx={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Account Information
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">
                          Created: {new Date(user.created_at).toLocaleDateString()}
        </Typography>
                      </Box>
                      {user.updated_at && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">
                            Last updated: {new Date(user.updated_at).toLocaleDateString()}
        </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
      </Paper>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Current Password"
              type="password"
              {...registerPassword('current_password')}
              error={!!passwordErrors.current_password}
              helperText={passwordErrors.current_password?.message}
            />
            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              type="password"
              {...registerPassword('new_password')}
              error={!!passwordErrors.new_password}
              helperText={passwordErrors.new_password?.message}
              onChange={(e) => {
                setNewPassword(e.target.value);
                registerPassword('new_password').onChange(e);
              }}
            />
            <PasswordStrengthIndicator password={newPassword} />
            <TextField
              fullWidth
              margin="normal"
              label="Confirm New Password"
              type="password"
              {...registerPassword('confirm_password')}
              error={!!passwordErrors.confirm_password}
              helperText={passwordErrors.confirm_password?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)} disabled={isChangingPassword}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPassword(onSubmitPassword)}
            variant="contained"
            disabled={isChangingPassword}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Picture Dialog */}
      <Dialog open={pictureDialogOpen} onClose={handleCancelPictureUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Profile Picture</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              id="picture-upload-input"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="picture-upload-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                sx={{ mb: 2 }}
              >
                Choose Image File
              </Button>
            </label>
            
            {selectedFile && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}
            
            {previewUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Avatar
                  src={previewUrl}
                  sx={{ width: 120, height: 120 }}
                />
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Supported formats: JPEG, PNG, GIF, WebP (Max size: 5MB)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPictureUpload} disabled={isUploadingPicture}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadPicture}
            variant="contained"
            disabled={isUploadingPicture || !selectedFile}
          >
            {isUploadingPicture ? 'Uploading...' : 'Upload Picture'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
