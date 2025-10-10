import Ajv, {
  type ErrorObject,
  type ValidateFunction,
  type JSONSchemaType,
} from 'ajv';
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
  const ajv = new Ajv({
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

export const validateTimesheet = (
  payload: unknown,
): TimesheetValidationResult => {
  const { timesheetValidator } = ensureCompiled();
  const valid = timesheetValidator(payload);

  return {
    valid: Boolean(valid),
    errors: valid ? null : timesheetValidator.errors ?? null,
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
