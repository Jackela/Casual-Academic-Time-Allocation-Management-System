/**
 * Utility functions for formatting data in the CATAMS application
 */

/**
 * Format currency amount in Australian dollars
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date string to Australian format
 */
export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return date.toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format hours with proper decimal handling
 */
export const formatHours = (hours: number): string => {
  return hours.toFixed(1);
};

/**
 * Calculate total pay from hours and rate
 */
export const calculateTotalPay = (hours: number, hourlyRate: number): number => {
  if (hours < 0 || hourlyRate < 0) {
    throw new Error('Hours and hourly rate must be non-negative');
  }
  
  return Math.round((hours * hourlyRate) * 100) / 100; // Round to 2 decimal places
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format user role for display
 */
export const formatRole = (role: string): string => {
  return role.toLowerCase().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format status with proper capitalization
 */
export const formatStatus = (status: string): string => {
  return status.toLowerCase().replace(/^\w/, c => c.toUpperCase());
};