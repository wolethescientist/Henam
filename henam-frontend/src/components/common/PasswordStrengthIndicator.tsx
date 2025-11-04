import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Chip,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthText,
} from '../../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
  showSuggestions?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showDetails = true,
  showSuggestions = true,
}) => {
  if (!password) {
    return null;
  }

  const validation = validatePassword(password);
  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthText = getPasswordStrengthText(validation.strength);

  return (
    <Box sx={{ mt: 1 }}>
      {/* Strength Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={validation.score}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: strengthColor,
              borderRadius: 3,
            },
          }}
        />
        <Chip
          label={strengthText}
          size="small"
          sx={{
            backgroundColor: strengthColor,
            color: 'white',
            fontWeight: 'bold',
            minWidth: 60,
          }}
        />
      </Box>

      {/* Score */}
      <Typography variant="caption" color="text.secondary">
        Strength: {validation.score}/100
      </Typography>

      {/* Validation Errors */}
      {showDetails && validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <AlertTitle>Password Requirements</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.errors.map((error, index) => (
              <li key={index}>
                <Typography variant="body2">{error}</Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Success Message */}
      {showDetails && validation.isValid && (
        <Alert severity="success" sx={{ mt: 1 }}>
          <Typography variant="body2">
            Great! Your password meets all security requirements.
          </Typography>
        </Alert>
      )}

      {/* Suggestions */}
      {showSuggestions && !validation.isValid && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <AlertTitle>Tips for a Strong Password</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2">
                Use at least 12 characters
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Mix uppercase and lowercase letters
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Include numbers and special characters
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Avoid common words and patterns
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Don't use personal information
              </Typography>
            </li>
          </ul>
        </Alert>
      )}
    </Box>
  );
};

export default PasswordStrengthIndicator;
