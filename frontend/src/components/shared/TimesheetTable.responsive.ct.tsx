import { expect, test } from '@playwright/experimental-ct-react';
import React from 'react';
import TimesheetTable from './TimesheetTable/TimesheetTable';
import type { Timesheet } from '../../../types/api';

const mobileTimesheets: Timesheet[] = [
  {
    id: 7101,
    tutorId: 101,
    courseId: 55,
    courseCode: 'COMP2001',
    courseName: 'Algorithms and Data Structures',
    tutorName: 'Jordan Blake',
    hours: 8.5,
    hourlyRate: 48,
    description: 'Workshop facilitation and assignment review for Week 8.',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-09-25T09:00:00Z',
    updatedAt: '2025-09-27T10:30:00Z',
    lecturerName: 'Prof. Kate Williams',
    submitterName: 'Jordan Blake',
    weekStartDate: '2025-09-22',
  },
  {
    id: 7102,
    tutorId: 115,
    courseId: 72,
    courseCode: 'DATA3102',
    courseName: 'Statistical Learning',
    tutorName: 'Riley Morgan',
    hours: 7,
    hourlyRate: 52,
    description: 'Consultation support and marking moderation.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-09-26T13:15:00Z',
    updatedAt: '2025-09-28T16:45:00Z',
    lecturerName: 'Dr. Nina Patel',
    submitterName: 'Riley Morgan',
    weekStartDate: '2025-09-22',
  },
];

test('mobile layout wraps content and reveals hidden fields via details expander', async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 640 });

  await mount(
    <div style={{ padding: '16px', maxWidth: '100vw' }}>
      <TimesheetTable
        timesheets={mobileTimesheets}
        showActions
        approvalRole="LECTURER"
        actionMode="approval"
      />
    </div>,
  );

  await expect.poll(async () => {
    return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  }).toBeTruthy();

  const toggle = page.getByTestId(`details-toggle-${mobileTimesheets[0].id}`);
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  const detailsRegion = page.locator(`#timesheet-${mobileTimesheets[0].id}-details`);
  await expect(detailsRegion).toBeHidden();

  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(detailsRegion).toBeVisible();
  await expect(detailsRegion).toContainText('Description');
  await expect(detailsRegion).toContainText(mobileTimesheets[0].description);
  await expect(detailsRegion).toContainText('Updated');
});
