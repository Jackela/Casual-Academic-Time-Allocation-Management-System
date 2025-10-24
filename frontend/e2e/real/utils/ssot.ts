/**
 * SSOT helpers – validate client payload excludes financial fields and
 * responses include server-calculated amounts only.
 */
import { expect } from '@playwright/test';

// Fields that MUST NOT be sent by client (computed server-side)
export const FORBIDDEN_FINANCIAL_FIELDS = [
  'hourlyRate',
  'payableHours',
  'totalPay',
  'overtimePay',
];

export function expectNoFinancialFields(payload: Record<string, unknown>) {
  for (const f of FORBIDDEN_FINANCIAL_FIELDS) {
    expect(payload, `Client payload must not include financial field: ${f}`).not.toHaveProperty(f);
  }
}

export function expectServerFinancials(responseBody: Record<string, unknown>) {
  // Presence check only; exact semantics covered by contract assertions
  expect(responseBody).toHaveProperty('calculated');
  const calc = (responseBody as any).calculated;
  expect(calc).toHaveProperty('payableHours');
  expect(calc).toHaveProperty('totalPay');
}

export default { expectNoFinancialFields, expectServerFinancials };

