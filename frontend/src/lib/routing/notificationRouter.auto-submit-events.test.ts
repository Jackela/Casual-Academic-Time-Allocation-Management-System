import { describe, it, expect } from 'vitest';
import { notificationRouter } from './notificationRouter';

describe('notificationRouter - auto submit related events', () => {
  it('returns payload for TIMESHEET_SUBMIT_SUCCESS', () => {
    const payload = notificationRouter({ type: 'TIMESHEET_SUBMIT_SUCCESS', count: 2 });
    expect(payload).toMatchObject({
      channel: 'toast',
      severity: 'success',
    });
    expect(String(payload?.message ?? '')).toContain('2');
  });

  it('returns payload for DRAFTS_PENDING', () => {
    const payload = notificationRouter({ type: 'DRAFTS_PENDING', count: 1 });
    expect(payload).toMatchObject({
      channel: 'banner',
      severity: 'warning',
    });
    expect(String(payload?.title ?? '')).toContain('Draft');
  });
});

