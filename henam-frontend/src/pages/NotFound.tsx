import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: '8rem',
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 2,
          }}
        >
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            Go Home
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFound;
