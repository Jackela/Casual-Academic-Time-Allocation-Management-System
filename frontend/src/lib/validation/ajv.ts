import Ajv, {
  type ErrorObject,
  type ValidateFunction,
  type JSONSchemaType,
} from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import commonSchema from '../../../../schema/common.schema.json';
import timesheetSchema from '../../../../schema/timesheet.schema.json';
import type {
  Timesheet,
  TimesheetUiConstraints,
} from '../../types/timesheet';

export type TimesheetValidator = ValidateFunction<Timesheet>;
export type AjvError = ErrorObject<
  string,
  Record<string, unknown>,
  unknown
>;

export interface TimesheetValidationResult {
  valid: boolean;
  errors: AjvError[] | null;
}

interface CompiledSchemas {
  ajv: Ajv;
  timesheetValidator: TimesheetValidator;
}

const createCompiler = (): CompiledSchemas => {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  ajv.addSchema(commonSchema);

  const typedTimesheetSchema =
    timesheetSchema as unknown as JSONSchemaType<Timesheet>;
  const timesheetValidator = ajv.compile<Timesheet>(typedTimesheetSchema);

  return { ajv, timesheetValidator };
};

let compiledSchemas: CompiledSchemas | null = null;

const ensureCompiled = (): CompiledSchemas => {
  if (!compiledSchemas) {
    compiledSchemas = createCompiler();
  }

  return compiledSchemas;
};

export const compileSchemas = (): CompiledSchemas => ensureCompiled();

const cloneConstraints = (source: TimesheetUiConstraints): TimesheetUiConstraints => ({
  hours: { ...source.hours },
  weekStart: { ...source.weekStart },
  currency: source.currency,
});

let activeUiConstraints: TimesheetUiConstraints | null = null;

const getActiveConstraints = (): TimesheetUiConstraints => {
  if (activeUiConstraints) {
    return cloneConstraints(activeUiConstraints);
  }

  return cloneConstraints(getTimesheetUiConstraints());
};

export const setTimesheetValidatorConstraints = (
  constraints: TimesheetUiConstraints | null,
): void => {
  activeUiConstraints = constraints ? cloneConstraints(constraints) : null;
};

const createUiConstraintError = (
  instancePath: string,
  message: string,
  params: Record<string, unknown>,
): AjvError => ({
  instancePath,
  message,
  params,
  keyword: 'uiConstraint',
  schemaPath: '#/ui-constraints',
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isIsoDateString = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 10;

export const validateTimesheet = (
  payload: unknown,
): TimesheetValidationResult => {
  const { timesheetValidator } = ensureCompiled();
  const valid = timesheetValidator(payload);

  const collectedErrors: AjvError[] = valid
    ? []
    : (timesheetValidator.errors ?? []).slice();

  const constraints = getActiveConstraints();
  const data = (payload ?? {}) as Partial<Timesheet> & {
    weekStartDate?: string;
  };

  const hoursValue = data.hours;
  if (isFiniteNumber(hoursValue)) {
    if (
      hoursValue < constraints.hours.min ||
      hoursValue > constraints.hours.max
    ) {
      collectedErrors.push(
        createUiConstraintError(
          '/hours',
          `must be between ${constraints.hours.min} and ${constraints.hours.max}`,
          {
            min: constraints.hours.min,
            max: constraints.hours.max,
          },
        ),
      );
    } else {
      const { step } = constraints.hours;
      if (step > 0) {
        const epsilon = 1e-8;
        const normalized =
          Math.round((hoursValue - constraints.hours.min) / step) * step +
          constraints.hours.min;
        if (Math.abs(normalized - hoursValue) > epsilon) {
          collectedErrors.push(
            createUiConstraintError('/hours', `must align with step of ${step}`, {
              step,
            }),
          );
        }
      }
    }
  }

  const weekStartValue = data.weekStart ?? data.weekStartDate;
  if (constraints.weekStart.mondayOnly && isIsoDateString(weekStartValue)) {
    const parsed = new Date(`${weekStartValue}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCDay() !== 1
    ) {
      collectedErrors.push(
        createUiConstraintError('/weekStart', 'must start on Monday', {
          mondayOnly: true,
        }),
      );
    }
  }

  const resultValid = collectedErrors.length === 0;

  return {
    valid: resultValid,
    errors: resultValid ? null : collectedErrors,
  };
};

type HoursConstraints = {
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
};

type WeekStartConstraints = {
  ['x-mondayOnly']?: boolean;
};

type CurrencyConstraints = {
  enum?: readonly string[];
};

export const getTimesheetUiConstraints = (): TimesheetUiConstraints => {
  const hoursSchema =
    (timesheetSchema as { properties?: Record<string, HoursConstraints> })
      .properties?.hours ?? {};
  const weekStartSchema =
    (timesheetSchema as { properties?: Record<string, WeekStartConstraints> })
      .properties?.weekStart ?? {};
  const defs =
    (commonSchema as { $defs?: Record<string, unknown> }).$defs ?? {};
  const currencySchema = defs.Currency as CurrencyConstraints | undefined;

  return {
    hours: {
      min: hoursSchema.minimum ?? 0.25,
      max: hoursSchema.maximum ?? 60,
      step: hoursSchema.multipleOf ?? 0.25,
    },
    weekStart: {
      mondayOnly: Boolean(weekStartSchema['x-mondayOnly']),
    },
    currency:
      (Array.isArray(currencySchema?.enum) && currencySchema.enum[0]) || 'AUD',
  } as const;
};
