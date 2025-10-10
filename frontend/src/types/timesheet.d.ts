import type { FromSchema } from 'json-schema-to-ts';
import commonSchema from '../../../schema/common.schema.json';
import timesheetSchema from '../../../schema/timesheet.schema.json';

type CommonSchema = typeof commonSchema;
type CommonDefinitions = NonNullable<CommonSchema['$defs']>;

export type TimesheetSchema = typeof timesheetSchema;
export type Timesheet = FromSchema<TimesheetSchema>;

export type TimesheetStatus = FromSchema<CommonDefinitions['TimesheetStatus']>;
export type WeekDay = FromSchema<CommonDefinitions['WeekDay']>;
export type Currency = FromSchema<CommonDefinitions['Currency']>;

export interface TimesheetUiConstraints {
  hours: {
    min: number;
    max: number;
    step: number;
  };
  weekStart: {
    mondayOnly: boolean;
  };
  currency: Currency;
}
