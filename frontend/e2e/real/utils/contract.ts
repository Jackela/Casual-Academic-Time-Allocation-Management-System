/**
 * Contract helpers – lightweight checks for OpenAPI-aligned responses.
 * Keep assertions tolerant to schema evolution while validating key semantics.
 */
import { APIResponse, expect } from '@playwright/test';

export interface ExpectContractOptions {
  expectedStatus: number | number[];
  requiredFields?: string[];
}

export async function expectContract(res: APIResponse, opts: ExpectContractOptions) {
  const statuses = Array.isArray(opts.expectedStatus) ? opts.expectedStatus : [opts.expectedStatus];
  expect(statuses).toContain(res.status());
  const body = await res.json().catch(() => ({}));
  for (const f of opts.requiredFields ?? []) {
    expect(body, `Missing contract field: ${f}`).toHaveProperty(f);
  }
}

export default { expectContract };

