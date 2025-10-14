import { useId, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

type RelativeTimeUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

interface RelativeTimeThreshold {
  max: number;
  value: number;
  unit: RelativeTimeUnit;
}

const RELATIVE_TIME_THRESHOLDS: RelativeTimeThreshold[] = [
  { max: 60, value: 1, unit: 'second' },
  { max: 3600, value: 60, unit: 'minute' },
  { max: 86400, value: 3600, unit: 'hour' },
  { max: 604800, value: 86400, unit: 'day' },
  { max: 2629800, value: 604800, unit: 'week' }, // ~1 month
  { max: 31557600, value: 2629800, unit: 'month' }, // ~1 year
  { max: Infinity, value: 31557600, unit: 'year' },
];

export interface RelativeTimeProps {
  /**
   * ISO timestamp string to display in relative format.
   */
  timestamp: string;
  /**
   * Optional class names applied to the trigger element.
   */
  className?: string;
  /**
   * Text rendered when the provided timestamp is invalid.
   */
  fallback?: string;
  /**
   * Override the current date when calculating relative time (useful for tests).
   */
  now?: Date;
  /**
   * Controls keyboard focus behaviour.
   */
  tabIndex?: number;
}

const DEFAULT_FALLBACK = '—';

const ISO_TIMEZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

const normalizeTimestamp = (value: string): string => {
  const trimmed = value.trim();
  if (ISO_TIMEZONE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  // Treat naive timestamps as UTC to avoid client timezone skew.
  return `${trimmed}Z`;
};

const parseTimestamp = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const normalized = normalizeTimestamp(value);
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const computeRelativeDescriptor = (target: Date, now: Date) => {
  const diffInSeconds = (now.getTime() - target.getTime()) / 1000;
  const absoluteSeconds = Math.abs(diffInSeconds);
  const isFuture = diffInSeconds < 0;
  const roundingSeconds = diffInSeconds >= 0 ? diffInSeconds : absoluteSeconds;

  for (const threshold of RELATIVE_TIME_THRESHOLDS) {
    if (absoluteSeconds < threshold.max) {
      return {
        value: Math.round(roundingSeconds / threshold.value),
        unit: threshold.unit,
        absoluteSeconds,
        isFuture,
      };
    }
  }

  return {
    value: Math.round(roundingSeconds / 31557600),
    unit: 'year' as const,
    absoluteSeconds,
    isFuture,
  };
};

const formatAbsoluteTimestamp = (date: Date): { absolute: string; iso: string } => {
  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return {
    absolute: dateTimeFormatter.format(date),
    iso: date.toISOString(),
  };
};

const RelativeTime = ({
  timestamp,
  className,
  fallback = DEFAULT_FALLBACK,
  now,
  tabIndex = 0,
}: RelativeTimeProps) => {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const parsedDate = useMemo(() => parseTimestamp(timestamp), [timestamp]);
  const referenceNow = useMemo(() => now ?? new Date(), [now]);

  const relativeData = useMemo(() => {
    if (!parsedDate) {
      return null;
    }

    const descriptor = computeRelativeDescriptor(parsedDate, referenceNow);
    const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const { absolute, iso } = formatAbsoluteTimestamp(parsedDate);
    let relativeText: string;

    if (descriptor.absoluteSeconds < 60) {
      relativeText = 'Just now';
    } else if (descriptor.isFuture) {
      relativeText = absolute;
    } else {
      const scaledValue = descriptor.value === 0 ? 1 : Math.max(descriptor.value, 1);
      relativeText = relativeFormatter.format(-scaledValue, descriptor.unit);
    }

    return {
      relativeText,
      absoluteLabel: absolute,
      iso,
      tooltipText: `${absolute} • ${iso}`,
    };
  }, [parsedDate, referenceNow]);

  const handleOpen = () => {
    if (relativeData) {
      setIsOpen(true);
    }
  };

  const handleClose = () => setIsOpen(false);

  if (!relativeData) {
    return (
      <span
        className={cn('inline-flex items-center whitespace-nowrap text-sm text-muted-foreground', className)}
        aria-label="Unavailable time"
        title={fallback}
      >
        {fallback}
      </span>
    );
  }

  const { relativeText, absoluteLabel, iso, tooltipText } = relativeData;

  return (
    <span
      className={cn('relative inline-flex items-center', className)}
    >
      <span
        tabIndex={tabIndex}
        aria-describedby={tooltipId}
        aria-label={absoluteLabel}
        data-iso={iso}
        className="whitespace-nowrap text-sm font-medium text-foreground"
        title={tooltipText}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            handleClose();
          }
        }}
      >
        {relativeText}
      </span>

      <span
        role="tooltip"
        id={tooltipId}
        aria-hidden={!isOpen}
        className={cn(
          'pointer-events-none absolute left-1/2 top-full mt-2 w-max max-w-[18rem] -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-lg transition-opacity duration-150 elevation-tooltip',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="block font-semibold">{absoluteLabel}</span>
        <span className="block text-[10px] text-muted-foreground">{iso}</span>
      </span>
    </span>
  );
};

export default RelativeTime;
