/**
 * Validation utilities for the CATAMS application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Additional validation for problematic patterns
  if (email.includes('..') || email.startsWith('@') || email.endsWith('@') || 
      email.includes(' ') || !email.includes('.', email.indexOf('@'))) {
    return { isValid: false, error: 'Email format is invalid' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email format is invalid' };
  }
  
  if (email.length > 255) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
};

/**
 * Validate hours worked
 */
export const validateHours = (hours: number): ValidationResult => {
  if (isNaN(hours)) {
    return { isValid: false, error: 'Hours must be a valid number' };
  }
  
  if (hours < 0.1) {
    return { isValid: false, error: 'Hours must be at least 0.1' };
  }
  
  if (hours > 168) {
    return { isValid: false, error: 'Hours cannot exceed 168 per week' };
  }
  
  return { isValid: true };
};

/**
 * Validate hourly rate
 */
export const validateHourlyRate = (rate: number): ValidationResult => {
  if (isNaN(rate)) {
    return { isValid: false, error: 'Hourly rate must be a valid number' };
  }
  
  if (rate <= 0) {
    return { isValid: false, error: 'Hourly rate must be greater than 0' };
  }
  
  if (rate > 200) {
    return { isValid: false, error: 'Hourly rate cannot exceed 200.00' };
  }
  
  return { isValid: true };
};

/**
 * Validate description text
 */
export const validateDescription = (description: string): ValidationResult => {
  if (!description) {
    return { isValid: false, error: 'Description is required' };
  }
  
  if (description.trim().length === 0) {
    return { isValid: false, error: 'Description cannot be empty' };
  }
  
  if (description.length > 500) {
    return { isValid: false, error: 'Description cannot exceed 500 characters' };
  }
  
  return { isValid: true };
};

/**
 * Validate date string
 */
export const validateDate = (dateString: string): ValidationResult => {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  // Check if date is not too far in the past (more than 2 years)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  if (date < twoYearsAgo) {
    return { isValid: false, error: 'Date cannot be more than 2 years in the past' };
  }
  
  // Check if date is not too far in the future (more than 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  if (date > oneYearFromNow) {
    return { isValid: false, error: 'Date cannot be more than 1 year in the future' };
  }
  
  return { isValid: true };
};

/**
 * Validate week start date (must be a Monday)
 */
export const validateWeekStartDate = (dateString: string): ValidationResult => {
  const basicValidation = validateDate(dateString);
  if (!basicValidation.isValid) {
    return basicValidation;
  }
  
  const date = new Date(dateString);
  
  // Check if it's a Monday (0 = Sunday, 1 = Monday, ...)
  if (date.getDay() !== 1) {
    return { isValid: false, error: 'Week start date must be a Monday' };
  }
  
  return { isValid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  
  return { isValid: true };
};