import { useMemo, useCallback } from 'react';

import { getTimesheetUiConstraints } from '../validation/ajv';
import type { Currency, TimesheetUiConstraints } from '../../types/timesheet';

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

let resolvedConstraints: TimesheetUiConstraints | null = null;

const loadConstraints = (): TimesheetUiConstraints => {
  if (resolvedConstraints) {
    return resolvedConstraints;
  }

  try {
    resolvedConstraints = getTimesheetUiConstraints();
  } catch (error) {
    resolvedConstraints = FALLBACK_CONSTRAINTS;
  }

  return resolvedConstraints;
};

const constraints = loadConstraints();

export const HOURS_MIN = constraints.hours.min;
export const HOURS_MAX = constraints.hours.max;
export const HOURS_STEP = constraints.hours.step;
export const CURRENCY = constraints.currency;
export const MONDAY_ONLY = constraints.weekStart.mondayOnly;
export const WEEK_START_DAY = 1;

export const UI_CONSTRAINTS = {
  HOURS_MIN,
  HOURS_MAX,
  HOURS_STEP,
  CURRENCY,
  MONDAY_ONLY,
  WEEK_START_DAY,
} as const;

export const useUiConstraints = () =>
  useMemo(
    () => ({
      HOURS_MIN,
      HOURS_MAX,
      HOURS_STEP,
      CURRENCY,
      WEEK_START_DAY,
      mondayOnly: MONDAY_ONLY,
    }),
    [],
  );

export const useCurrencyFormatter = () => {
  const { CURRENCY } = useUiConstraints();

  const baseFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
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

      if (!options) {
        return baseFormatter.format(amount);
      }

      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: CURRENCY,
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      });

      return formatter.format(amount);
    },
    [CURRENCY, baseFormatter],
  );
};
