/**
 * Password validation utilities for enhanced security
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
}

/**
 * Validates password strength and returns detailed feedback
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 20;
  } else {
    score += 10;
  }

  // Character variety checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 15;
  }

  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 15;
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  } else {
    score += 15;
  }

  if (!hasSpecialChars) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 15;
  }

  // Common password patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i,
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    errors.push('Password contains common patterns and is not secure');
    score -= 20;
  }

  // Sequential characters
  const hasSequentialChars = /(.)\1{2,}/.test(password);
  if (hasSequentialChars) {
    errors.push('Password should not contain repeated characters');
    score -= 10;
  }

  // Keyboard patterns
  const keyboardPatterns = [
    /qwerty/i,
    /asdf/i,
    /zxcv/i,
    /1234/,
    /abcd/i,
  ];

  const hasKeyboardPattern = keyboardPatterns.some(pattern => pattern.test(password));
  if (hasKeyboardPattern) {
    errors.push('Password should not contain keyboard patterns');
    score -= 15;
  }

  // Ensure score is not negative
  score = Math.max(0, score);

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 70) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Generates a secure password suggestion
 */
export function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the rest with random characters
  const allChars = lowercase + uppercase + numbers + specialChars;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Checks if password is different from common variations of a given string
 */
export function isPasswordDifferentFromString(password: string, referenceString: string): boolean {
  if (!referenceString) return true;
  
  const variations = [
    referenceString.toLowerCase(),
    referenceString.toUpperCase(),
    referenceString + '123',
    referenceString + '!',
    referenceString + '1',
    '123' + referenceString,
    referenceString + '2024',
    referenceString + '2023',
  ];

  return !variations.some(variation => password.toLowerCase().includes(variation.toLowerCase()));
}

/**
 * Gets password strength color for UI
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return '#f44336'; // Red
    case 'medium':
      return '#ff9800'; // Orange
    case 'strong':
      return '#4caf50'; // Green
    default:
      return '#9e9e9e'; // Grey
  }
}

/**
 * Gets password strength text for UI
 */
export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    default:
      return 'Unknown';
  }
}
