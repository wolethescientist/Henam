import React from 'react';
import { Snackbar as MuiSnackbar, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { hideSnackbar } from '../../store/slices/uiSlice';
import type { RootStateType } from '../../store';

const Snackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { open, message, severity } = useAppSelector((state: RootStateType) => state.ui.snackbar);

  const handleClose = () => dispatch(hideSnackbar());

  return (
    <MuiSnackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </MuiSnackbar>
  );
};

export default Snackbar;
