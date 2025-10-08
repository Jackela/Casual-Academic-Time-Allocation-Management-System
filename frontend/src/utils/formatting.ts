/**
 * Formatting Utilities
 * 
 * Centralized formatting functions for consistent data display
 * across the application.
 */

import type { TimesheetStatus, User } from '../types/api';

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format date string to Australian locale format
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-AU', { ...defaultOptions, ...options });
  } catch {
    return dateString; // Return original if formatting fails
  }
}

/**
 * Format date string to include time
 */
export function formatDateTime(dateString: string): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date to short format (DD/MM/YYYY)
 */
export function formatDateShort(dateString: string): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diffMs < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
    
    // Less than a day
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    
    // Less than a week
    if (diffMs < 604800000) {
      const days = Math.floor(diffMs / 86400000);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    
    // Fall back to formatted date
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

// =============================================================================
// Currency Formatting
// =============================================================================

/**
 * Format number as Australian currency
 */
export function formatCurrency(amount: number | string, options?: Intl.NumberFormatOptions): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return '$0.00';
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  
  return new Intl.NumberFormat('en-AU', { ...defaultOptions, ...options }).format(numAmount);
}

/**
 * Format number as currency without symbol
 */
export function formatCurrencyValue(amount: number | string): string {
  return formatCurrency(amount, { style: 'decimal' });
}

/**
 * Calculate and format total pay
 */
export function formatTotalPay(hours: number, hourlyRate: number): string {
  const total = hours * hourlyRate;
  return formatCurrency(total);
}

// =============================================================================
// Number Formatting
// =============================================================================

/**
 * Format hours with 'h' suffix
 */
export function formatHours(hours: number | string): string {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  if (isNaN(numHours)) return '0h';
  
  // Show one decimal place for fractional hours
  const formatted = numHours % 1 === 0 
    ? numHours.toString() 
    : numHours.toFixed(1);
    
  return `${formatted}h`;
}

/**
 * Format percentage with % suffix
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(value: number): string {
  if (isNaN(value)) return '0';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
}

// =============================================================================
// Status & Badge Formatting
// =============================================================================

/**
 * Format timesheet status for display
 */
export function formatTimesheetStatus(status: TimesheetStatus): string {
  if (!status) return 'Unknown';
  
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get CSS class for timesheet status badge
 */
export function getStatusBadgeClass(status: TimesheetStatus): string {
  const baseClass = 'status-badge';
  
  switch (status) {
    case 'DRAFT':
      return `${baseClass} status-draft`;
    case 'PENDING_TUTOR_CONFIRMATION':
      return `${baseClass} status-pending`;
    case 'TUTOR_CONFIRMED':
      return `${baseClass} status-confirmed`;
    case 'LECTURER_CONFIRMED':
      return `${baseClass} status-confirmed`;
    case 'FINAL_CONFIRMED':
      return `${baseClass} status-final-confirmed`;
    case 'REJECTED':
      return `${baseClass} status-rejected`;
    case 'MODIFICATION_REQUESTED':
      return `${baseClass} status-modification`;
    default:
      return `${baseClass} status-default`;
  }
}

/**
 * Format user role for display
 */
export function formatUserRole(role: User['role']): string {
  if (!role) return 'Unknown';
  
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'LECTURER':
      return 'Lecturer';
    case 'TUTOR':
      return 'Tutor';
    default:
      return role;
  }
}

// =============================================================================
// Text Formatting
// =============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert camelCase or PascalCase to readable text
 */
export function camelToReadable(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Get initials from a name
 */
export function getInitials(name: string, maxInitials: number = 2): string {
  if (!name) return '?';
  
  const words = name.trim().split(' ');
  const initials = words
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
    
  return initials || '?';
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a value is valid for formatting
 */
export function isValidValue<T>(value: T | null | undefined | ''): value is T {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Safely format a value with fallback
 */
export function safeFormat<TInput, TResult>(
  value: TInput | null | undefined | '',
  formatter: (val: TInput) => TResult,
  fallback: TResult,
): TResult {
  try {
    if (!isValidValue<TInput>(value)) {
      return fallback;
    }

    return formatter(value);
  } catch {
    return fallback;
  }
}

// =============================================================================
// Export all formatters
// =============================================================================

export const formatters = {
  // Date & Time
  date: formatDate,
  dateTime: formatDateTime,
  dateShort: formatDateShort,
  relativeTime: formatRelativeTime,
  
  // Currency & Numbers
  currency: formatCurrency,
  currencyValue: formatCurrencyValue,
  totalPay: formatTotalPay,
  hours: formatHours,
  percentage: formatPercentage,
  compactNumber: formatCompactNumber,
  
  // Status & Display
  timesheetStatus: formatTimesheetStatus,
  statusBadgeClass: getStatusBadgeClass,
  userRole: formatUserRole,
  
  // Text
  truncate: truncateText,
  titleCase,
  camelToReadable,
  initials: getInitials,
  
  // Utilities
  safe: safeFormat
};
