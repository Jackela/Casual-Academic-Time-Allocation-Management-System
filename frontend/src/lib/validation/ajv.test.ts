import { afterEach, describe, expect, it } from 'vitest';
import {
  setTimesheetValidatorConstraints,
  validateTimesheet,
} from './ajv';

const OVERRIDDEN_CONSTRAINTS = {
  hours: { min: 0.25, max: 48, step: 0.25 },
  weekStart: { mondayOnly: true },
  currency: 'AUD',
} as const;

const basePayload = {
  courseId: 'CS101',
  weekStart: '2024-01-15',
  hours: 12,
  description: 'Tutorial support sessions',
} as const;

afterEach(() => {
  setTimesheetValidatorConstraints(null);
});

describe('validateTimesheet UI overrides', () => {
  it('fails validation when hours exceed server maximum', () => {
    setTimesheetValidatorConstraints(OVERRIDDEN_CONSTRAINTS);

    const result = validateTimesheet({
      ...basePayload,
      hours: 54,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).not.toBeNull();
    expect(result.errors?.some((error) =>
      error.instancePath === '/hours' &&
      (error.message ?? '').includes('48'),
    )).toBe(true);
  });

  it('fails validation when week start is not Monday under override', () => {
    setTimesheetValidatorConstraints(OVERRIDDEN_CONSTRAINTS);

    const result = validateTimesheet({
      ...basePayload,
      weekStart: '2024-01-16',
    });

    expect(result.valid).toBe(false);
    expect(result.errors?.some((error) =>
      error.instancePath === '/weekStart' &&
      (error.message ?? '').includes('Monday'),
    )).toBe(true);
  });

  it('passes validation when payload matches overrides', () => {
    setTimesheetValidatorConstraints(OVERRIDDEN_CONSTRAINTS);

    const result = validateTimesheet({
      ...basePayload,
      hours: 32,
      weekStart: '2024-03-04',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });
});
