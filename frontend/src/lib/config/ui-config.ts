import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Currency, TimesheetUiConstraints } from '../../types/timesheet';
import { secureLogger } from '../../utils/secure-logger';
import { getTimesheetUiConstraints, setTimesheetValidatorConstraints } from '../validation/ajv';
import {
  fetchTimesheetConstraints,
  type TimesheetConstraintOverrides,
} from './server-config';
import { formatCurrency } from '../../utils/formatting';

type ConstraintSource =
  | TimesheetUiConstraints
  | TimesheetConstraintOverrides
  | null
  | undefined;

const FALLBACK_CONSTRAINTS: TimesheetUiConstraints = {
  hours: {
    min: 0.25,
    max: 60,
    step: 0.25,
  },
  weekStart: {
    mondayOnly: true,
  },
  currency: 'AUD' as Currency,
};

const cloneConstraints = (source: TimesheetUiConstraints): TimesheetUiConstraints => ({
  hours: { ...source.hours },
  weekStart: { ...source.weekStart },
  currency: source.currency,
});

const mergeConstraintSources = (
  ...sources: ConstraintSource[]
): TimesheetUiConstraints => {
  return sources.reduce<TimesheetUiConstraints>((acc, source) => {
    if (!source) {
      return acc;
    }

    const typedSource = source as TimesheetConstraintOverrides & TimesheetUiConstraints;

    const hours = typedSource.hours;
    if (hours) {
      if (typeof hours.min === 'number' && Number.isFinite(hours.min)) {
        acc.hours.min = hours.min;
      }
      if (typeof hours.max === 'number' && Number.isFinite(hours.max)) {
        acc.hours.max = hours.max;
      }
      if (typeof hours.step === 'number' && hours.step > 0) {
        acc.hours.step = hours.step;
      }
    }

    const weekStart = typedSource.weekStart;
    if (weekStart && typeof weekStart.mondayOnly === 'boolean') {
      acc.weekStart.mondayOnly = weekStart.mondayOnly;
    }

    if (typedSource.currency) {
      acc.currency = typedSource.currency;
    }

    return acc;
  }, cloneConstraints(FALLBACK_CONSTRAINTS));
};

let schemaConstraints: TimesheetUiConstraints | null = null;

try {
  schemaConstraints = getTimesheetUiConstraints();
} catch (error) {
  secureLogger.warn(
    '[ui-config] Failed to load constraints from schema. Falling back to static defaults.',
    error,
  );
}

let cachedConstraints = mergeConstraintSources(
  FALLBACK_CONSTRAINTS,
  schemaConstraints,
);
setTimesheetValidatorConstraints(cachedConstraints);

export let HOURS_MIN = cachedConstraints.hours.min;
export let HOURS_MAX = cachedConstraints.hours.max;
export let HOURS_STEP = cachedConstraints.hours.step;
export let CURRENCY = cachedConstraints.currency;
export let MONDAY_ONLY = cachedConstraints.weekStart.mondayOnly;
export const WEEK_START_DAY = 1;
export let UI_CONSTRAINTS = {
  HOURS_MIN,
  HOURS_MAX,
  HOURS_STEP,
  CURRENCY,
  MONDAY_ONLY,
  WEEK_START_DAY,
} as const;

const listeners = new Set<(next: TimesheetUiConstraints) => void>();
let fetchState: 'idle' | 'pending' | 'settled' = 'idle';

const updateExports = (next: TimesheetUiConstraints) => {
  cachedConstraints = cloneConstraints(next);
  HOURS_MIN = cachedConstraints.hours.min;
  HOURS_MAX = cachedConstraints.hours.max;
  HOURS_STEP = cachedConstraints.hours.step;
  CURRENCY = cachedConstraints.currency;
  MONDAY_ONLY = cachedConstraints.weekStart.mondayOnly;
  UI_CONSTRAINTS = {
    HOURS_MIN,
    HOURS_MAX,
    HOURS_STEP,
    CURRENCY,
    MONDAY_ONLY,
    WEEK_START_DAY,
  } as const;
  setTimesheetValidatorConstraints(cachedConstraints);
};

const notifyListeners = () => {
  for (const listener of listeners) {
    listener(cloneConstraints(cachedConstraints));
  }
};

const ensureServerConstraints = () => {
  if (fetchState !== 'idle') {
    return;
  }

  if (typeof window === 'undefined') {
    fetchState = 'settled';
    return;
  }

  fetchState = 'pending';

  fetchTimesheetConstraints()
    .then((overrides) => {
      if (!overrides) {
        return;
      }

      const merged = mergeConstraintSources(
        FALLBACK_CONSTRAINTS,
        schemaConstraints,
        overrides,
      );
      updateExports(merged);
      notifyListeners();
    })
    .catch((error) => {
      secureLogger.warn(
        '[ui-config] Unable to merge constraints from server payload.',
        error,
      );
    })
    .finally(() => {
      fetchState = 'settled';
    });
};

if (typeof window !== 'undefined') {
  ensureServerConstraints();
}

export const useUiConstraints = () => {
  const [constraints, setConstraints] = useState<TimesheetUiConstraints>(
    cloneConstraints(cachedConstraints),
  );

  useEffect(() => {
    const handleUpdate = (next: TimesheetUiConstraints) => {
      setConstraints(next);
    };

    listeners.add(handleUpdate);
    ensureServerConstraints();

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return useMemo(
    () => ({
      HOURS_MIN: constraints.hours.min,
      HOURS_MAX: constraints.hours.max,
      HOURS_STEP: constraints.hours.step,
      CURRENCY: constraints.currency,
      WEEK_START_DAY,
      mondayOnly: constraints.weekStart.mondayOnly,
    }),
    [constraints],
  );
};

export const useCurrencyFormatter = () => {
  const { CURRENCY } = useUiConstraints();

  const baseOptions = useMemo<Intl.NumberFormatOptions>(
    () => ({
      style: 'currency',
      currency: CURRENCY,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [CURRENCY],
  );

  return useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const amount =
        typeof value === 'number' && Number.isFinite(value)
          ? value
          : Number(value) || 0;

      const mergedOptions: Intl.NumberFormatOptions = {
        ...baseOptions,
        ...options,
      };

      if (mergedOptions.style === 'currency' && !mergedOptions.currency) {
        mergedOptions.currency = CURRENCY;
      }

      return formatCurrency(amount, mergedOptions);
    },
    [CURRENCY, baseOptions],
  );
};

export const getUiConstraintsSnapshot = (): TimesheetUiConstraints =>
  cloneConstraints(cachedConstraints);
