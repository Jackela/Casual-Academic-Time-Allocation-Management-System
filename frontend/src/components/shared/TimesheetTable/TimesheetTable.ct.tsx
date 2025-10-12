import { expect, test } from '@playwright/experimental-ct-react';
import React from 'react';
import TimesheetTable from './TimesheetTable';
import type { Timesheet } from '../../../types/api';

const denseTimesheets: Timesheet[] = [
  {
    id: 8010,
    tutorId: 401,
    courseId: 2101,
    weekStartDate: '2025-09-15',
    hours: 18.75,
    hourlyRate: 64.5,
    description: 'Led advanced capstone studio supervision, assessed iterative submissions, and provided detailed feedback on industry partner deliverables. Coordinated with lecturers for live client reviews and synthesized assessment notes for moderation.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-09-20T10:15:00Z',
    updatedAt: '2025-09-21T17:45:00Z',
    tutorName: 'Alexandria Montgomery-Watts',
    courseName: 'Human-Centered Product Design & Innovation Practicum',
    courseCode: 'DESN7045',
    submitterName: 'Alexandria Montgomery-Watts',
    lecturerName: 'Prof. Marina Delgado',
  },
  {
    id: 8011,
    tutorId: 402,
    courseId: 2102,
    weekStartDate: '2025-09-15',
    hours: 16.5,
    hourlyRate: 59,
    description: 'Delivered intensive data cleaning workshop, created supplemental screencasts, and resolved 28 analytics dashboard support tickets covering regression diagnostics and Monte Carlo simulation outcomes.',
    status: 'MODIFICATION_REQUESTED',
    createdAt: '2025-09-19T08:05:00Z',
    updatedAt: '2025-09-22T12:20:00Z',
    tutorName: 'Benjamin de la Cruz',
    courseName: 'Predictive Analytics in Institutional Planning',
    courseCode: 'STAT6802',
    submitterName: 'Benjamin de la Cruz',
    lecturerName: 'Dr. Priya Anand',
  },
  {
    id: 8012,
    tutorId: 403,
    courseId: 2103,
    weekStartDate: '2025-09-15',
    hours: 21.25,
    hourlyRate: 71,
    description: 'Facilitated weekend bootcamp, organized remote breakout rooms, reconciled 42 expense claims, and authored comprehensive progress report for accreditation audit.',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-09-18T14:30:00Z',
    updatedAt: '2025-09-23T09:55:00Z',
    tutorName: 'Charlotte Okafor',
    courseName: 'Executive Leadership Residency — Emerging Markets',
    courseCode: 'MGMT7950',
    submitterName: 'Charlotte Okafor',
    lecturerName: 'Associate Dean Rahul Varma',
  },
];

test('dense dataset keeps columns readable with enforced horizontal layout', async ({ mount, page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await mount(
    <div style={{ padding: '16px', maxWidth: '100vw' }}>
      <TimesheetTable
        timesheets={denseTimesheets}
        showActions
        showTutorInfo
        showCourseInfo
        showSelection
        approvalRole="LECTURER"
        actionMode="approval"
        onSelectionChange={() => {}}
      />
    </div>,
  );

  const table = page.getByTestId('timesheets-table');
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/min-w-\[60rem\]/);

  const headerExpectations: Array<[string, string]> = [
    ['.tutor-header', 'min-w-[14rem]'],
    ['.course-header', 'min-w-[12rem]'],
    ['.weekStartDate-header', 'min-w-[8rem]'],
    ['.hours-header', 'min-w-[5rem]'],
    ['.hourlyRate-header', 'min-w-[6.5rem]'],
    ['.totalPay-header', 'min-w-[7.5rem]'],
    ['.status-header', 'min-w-[9rem]'],
    ['.description-header', 'min-w-[18rem]'],
    ['.createdAt-header', 'min-w-[9rem]'],
    ['.updatedAt-header', 'min-w-[9rem]'],
    ['.actions-header', 'min-w-[12rem]'],
    ['.details-header', 'min-w-[6rem]'],
  ];

  for (const [selector, classFragment] of headerExpectations) {
    const header = table.locator(`thead ${selector}`);
    const escaped = classFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(header).toHaveClass(new RegExp(`.*${escaped}.*`));
  }

  const firstRow = table.locator('tbody tr').first();
  await expect(firstRow.locator('td.tutor-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.course-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.weekStartDate-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.hours-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.hourlyRate-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.totalPay-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.status-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.createdAt-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.updatedAt-cell')).toHaveCSS('white-space', 'nowrap');
  await expect(firstRow.locator('td.description-cell')).toHaveCSS('white-space', 'normal');

  await expect.poll(async () => {
    const hasHorizontalOverflow = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('[data-testid="timesheet-table"]');
      if (!container) {
        return 0;
      }
      return container.scrollWidth - container.clientWidth;
    });
    return hasHorizontalOverflow;
  }).toBeGreaterThan(0);

  const fullWidth = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>('[data-testid="timesheet-table"]');
    return container?.scrollWidth ?? 0;
  });

  if (fullWidth > 0) {
    await page.setViewportSize({
      width: Math.min(Math.max(Math.ceil(fullWidth) + 40, 390), 1920),
      height: 844,
    });
  }

  await expect(page).toHaveScreenshot('timesheet-table-full.png', { fullPage: true });
});
