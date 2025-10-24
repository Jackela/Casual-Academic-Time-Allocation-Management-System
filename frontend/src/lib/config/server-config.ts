import type { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { Currency, TimesheetUiConstraints } from '../../types/timesheet';
import commonSchema from '../../../../schema/common.schema.json';
import { secureApiClient } from '../../services/api-secure';
import { secureLogger } from '../../utils/secure-logger';
import { getConfig } from '../../config/unified-config';
import { ENV_CONFIG } from '../../utils/environment';

export interface TimesheetConstraintOverrides {
  hours?: {
    min?: number;
    max?: number;
    step?: number;
  };
  weekStart?: {
    mondayOnly?: boolean;
  };
  currency?: Currency;
}

type TimesheetConstraintPayload = TimesheetConstraintOverrides;

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});

addFormats(ajv);
ajv.addSchema(commonSchema);

const serverConstraintSchema = {
  $id: 'TimesheetConstraintsResponse',
  type: 'object',
  additionalProperties: false,
  properties: {
    hours: {
      type: 'object',
      additionalProperties: false,
      properties: {
        min: { type: 'number', minimum: 0 },
        max: { type: 'number', minimum: 0 },
        step: { type: 'number', exclusiveMinimum: 0 },
      },
    },
    weekStart: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mondayOnly: { type: 'boolean' },
      },
    },
    currency: {
      $ref: 'common.schema.json#/$defs/Currency',
    },
  },
};

const validateServerConstraints: ValidateFunction<TimesheetConstraintPayload> =
  ajv.compile(serverConstraintSchema);

const resolveTimesheetConfigEndpoints = (): string[] => {
  if (
    (typeof __E2E_GLOBALS__ !== 'undefined' && __E2E_GLOBALS__) ||
    ENV_CONFIG.isE2E() ||
    ENV_CONFIG.getMode() === 'test'
  ) {
    return [];
  }

  const endpoints = new Set<string>(['/api/config']);

  try {
    const config = getConfig();
    const endpoint = config.api.endpoints.timesheets.config;
    if (endpoint) {
      endpoints.add(endpoint);
    }
  } catch (error) {
    secureLogger.warn(
      '[server-config] Unable to resolve timesheet configuration endpoint, using default',
      error,
    );
  }

  endpoints.add('/api/timesheets/config');

  return Array.from(endpoints);
};

/**
 * Fetch UI constraints from the server and validate against shared schema.
 * Returns partial overrides that can be merged with schema and fallback defaults.
 */
export async function fetchTimesheetConstraints(
  signal?: AbortSignal,
): Promise<TimesheetConstraintOverrides | null> {
  const endpoints = resolveTimesheetConfigEndpoints();

  for (const endpoint of endpoints) {
    try {
      const response = await secureApiClient.get<unknown>(endpoint, { signal });
      const payload = response.data;

      if (!validateServerConstraints(payload)) {
        secureLogger.warn('[server-config] Invalid timesheet constraints payload received', {
          endpoint,
          errors: validateServerConstraints.errors ?? [],
        });
        continue;
      }

      return (payload as TimesheetConstraintPayload) ?? null;
    } catch (error) {
      secureLogger.warn(
        '[server-config] Failed to fetch timesheet constraints from server',
        { endpoint, error },
      );
    }
  }

  return null;
}

/**
 * Helper to merge server overrides with defaults in non-React contexts.
 */
export const mergeServerConstraints = (
  base: TimesheetUiConstraints,
  overrides: TimesheetConstraintOverrides | null,
): TimesheetUiConstraints => {
  if (!overrides) {
    return base;
  }

  const merged: TimesheetUiConstraints = {
    hours: {
      min: overrides.hours?.min ?? base.hours.min,
      max: overrides.hours?.max ?? base.hours.max,
      step: overrides.hours?.step ?? base.hours.step,
    },
    weekStart: {
      mondayOnly: overrides.weekStart?.mondayOnly ?? base.weekStart.mondayOnly,
    },
    currency: overrides.currency ?? base.currency,
  };

  return merged;
};
