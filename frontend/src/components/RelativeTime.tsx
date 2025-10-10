import { useMemo, useCallback } from 'react';
import clsx from 'clsx';

import './RelativeTime.css';

type RelativeTimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

const RELATIVE_TIME_THRESHOLDS: Array<{
  max: number;
  value: number;
  unit: RelativeTimeUnit;
}> = [
  { max: 60, value: 1, unit: 'second' },
  { max: 3600, value: 60, unit: 'minute' },
  { max: 86400, value: 3600, unit: 'hour' },
  { max: 604800, value: 86400, unit: 'day' },
  { max: 2629800, value: 604800, unit: 'week' }, // ~1 month
  { max: 31557600, value: 2629800, unit: 'month' }, // ~1 year
  { max: Infinity, value: 31557600, unit: 'year' },
];

type RelativeTimeProps = {
  timestamp: string | number | Date;
  className?: string;
  now?: Date;
  fallback?: string;
  tabIndex?: number;
};

const parseTimestamp = (value: RelativeTimeProps['timestamp']): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const getRelativeTime = (
  date: Date,
  now: Date,
): { value: number; unit: RelativeTimeUnit } => {
  const diffInSeconds = (date.getTime() - now.getTime()) / 1000;
  const absoluteSeconds = Math.abs(diffInSeconds);

  for (const threshold of RELATIVE_TIME_THRESHOLDS) {
    if (absoluteSeconds < threshold.max) {
      return {
        value: Math.round(diffInSeconds / threshold.value),
        unit: threshold.unit,
      };
    }
  }

  return {
    value: Math.round(diffInSeconds / 31557600),
    unit: 'year',
  };
};

const DEFAULT_FALLBACK = '—';

const RelativeTime = ({
  timestamp,
  className,
  now,
  fallback = DEFAULT_FALLBACK,
  tabIndex = 0,
}: RelativeTimeProps) => {
  const targetDate = parseTimestamp(timestamp);
  const referenceNow = now ?? new Date();

  const {
    relativeText,
    isoString,
    absoluteLabel,
    tooltipText,
  } = useMemo(() => {
    if (!targetDate) {
      return {
        relativeText: fallback,
        isoString: '',
        absoluteLabel: '',
        tooltipText: '',
      };
    }

    const { value, unit } = getRelativeTime(targetDate, referenceNow);
    const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
      numeric: 'auto',
    });
    const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const relative = relativeFormatter.format(value, unit);
    const absolute = dateTimeFormatter.format(targetDate);
    const iso = targetDate.toISOString();
    const tooltip = `${absolute} • ${iso}`;

    return {
      relativeText: relative,
      isoString: iso,
      absoluteLabel: absolute,
      tooltipText: tooltip,
    };
  }, [fallback, referenceNow, targetDate]);

  const dataTooltip = useMemo(() => tooltipText, [tooltipText]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur();
      }
    },
    [],
  );

  const classes = clsx('relative-time', className);

  return (
    <span
      className={classes}
      data-tooltip={dataTooltip}
      title={tooltipText}
      aria-label={absoluteLabel || undefined}
      tabIndex={tabIndex}
      role="text"
      data-iso={isoString || undefined}
      onKeyDown={handleKeyDown}
    >
      {relativeText}
    </span>
  );
};

export default RelativeTime;
