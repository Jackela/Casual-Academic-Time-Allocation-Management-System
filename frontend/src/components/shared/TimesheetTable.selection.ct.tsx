import { test } from '@playwright/experimental-ct-react';
import React from 'react';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import TimesheetTable from './TimesheetTable/TimesheetTable';
import type { Timesheet } from '../../../types/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.resolve(__dirname, '../../screenshots');

const sampleTimesheets: Timesheet[] = [
  {
    id: 501,
    tutorId: 201,
    courseId: 10,
    courseCode: 'COMP3001',
    courseName: 'Advanced Programming',
    tutorName: 'Jordan Blake',
    hours: 9,
    hourlyRate: 48,
    description: 'Week 7 labs and mentoring',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-10-01T09:00:00Z',
    updatedAt: '2025-10-08T09:00:00Z',
    lecturerName: 'Dr. Jane Smith',
    submitterName: 'Jordan Blake',
    weekStartDate: '2025-09-29',
  },
  {
    id: 502,
    tutorId: 205,
    courseId: 11,
    courseCode: 'DATA2100',
    courseName: 'Data Modelling',
    tutorName: 'Riley Morgan',
    hours: 8,
    hourlyRate: 46,
    description: 'Assignment marking support',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-10-02T11:15:00Z',
    updatedAt: '2025-10-08T14:45:00Z',
    lecturerName: 'Dr. Jane Smith',
    submitterName: 'Riley Morgan',
    weekStartDate: '2025-09-29',
  },
];

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test('Figure A5: Lecturer approval selection', async ({ mount, page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });

  await mount(
    <div style={{ padding: '24px', background: '#f4f4f5' }}>
      <TimesheetTable
        timesheets={sampleTimesheets}
        showActions
        showTutorInfo
        showCourseInfo
        showSelection
        selectedIds={[501]}
        onSelectionChange={() => {}}
        onApprovalAction={() => {}}
        approvalRole="LECTURER"
        actionMode="approval"
        className="demo-lecturer-table"
      />
    </div>,
  );

  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, 'fig-a5-lecturer-batch-approve.png'),
    fullPage: true,
  });
});
