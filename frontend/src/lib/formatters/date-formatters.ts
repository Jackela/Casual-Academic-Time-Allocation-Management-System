/**
 * Date formatting utilities following Australian locale
 *
 * CRITICAL RULE: Absolute timestamps for HISTORICAL events (Submitted/Updated)
 *                Relative time ALLOWED for TIME-SENSITIVE events (Deadlines/Reminders)
 */

export const LOCALE = 'en-AU';

export interface DateFormatOptions {
  includeTime?: boolean;
  includeYear?: boolean;
}

/**
 * Format absolute date/time: "15 Jan 2025, 2:30 PM"
 * USE FOR: Historical events (Submitted, Updated, Created)
 */
export const formatAbsoluteDateTime = (
  date: Date | string | null | undefined,
  options: DateFormatOptions = { includeTime: true, includeYear: true },
): string => {
  if (!date) return '—';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    ...(options.includeYear && { year: 'numeric' }),
    ...(options.includeTime && {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  }).format(dateObj);
};

/**
 * Format week starting date: "15 Jan 2025"
 */
export const formatWeekDate = (date: Date | string | null | undefined): string => {
  return formatAbsoluteDateTime(date, { includeTime: false, includeYear: true });
};

/**
 * Format currency in AUD
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format relative time for TIME-SENSITIVE contexts (deadlines, reminders)
 * USE FOR: Upcoming deadlines ("Due in 3 hours"), reminders, time-critical alerts
 * NEVER USE FOR: Historical events (Submitted/Updated timestamps)
 *
 * @param date - Future date to calculate relative time from
 * @param context - Context type: 'deadline' | 'reminder' | 'alert'
 */
export const formatRelativeTime = (
  date: Date | string,
  _context: 'deadline' | 'reminder' | 'alert',
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();

  // Guard: Only for future dates
  if (diffMs < 0) {
    throw new Error(
      'formatRelativeTime() is only for future dates. ' +
      'For past events, use formatAbsoluteDateTime().',
    );
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    // Beyond 7 days, show absolute date
    return formatAbsoluteDateTime(dateObj, { includeTime: false });
  }

  if (diffDays > 0) {
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `Due in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
};

/**
 * This function is DEPRECATED - use formatRelativeTime() with proper context
 * @deprecated Renamed to formatRelativeTime() with context parameter
 */
export const formatHistoricalRelativeTime = (): never => {
  throw new Error(
    'Historical relative time formatting is prohibited. ' +
    'Use formatAbsoluteDateTime() for past events, ' +
    'or formatRelativeTime(date, context) for future deadlines.',
  );
};
