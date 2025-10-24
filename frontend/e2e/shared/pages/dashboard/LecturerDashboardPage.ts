import { expect, type Locator, type Page } from '@playwright/test';
import { waitForEnabled, waitForVisible } from '../../utils/waits';

export class LecturerDashboardPage {
  constructor(private page: Page) {}

  get createButton(): Locator {
    return this.page.getByTestId('lecturer-create-open-btn').first();
  }

  get createModal(): Locator {
    return this.page.getByTestId('lecturer-create-modal');
  }

  get table(): Locator {
    return this.page.getByTestId('lecturer-table');
  }

  async openCreateModal(): Promise<void> {
    await waitForEnabled(this.createButton);
    await this.createButton.click();
    await waitForVisible(this.createModal);
  }

  async selectTutor(idOrName: string | number): Promise<void> {
    const tutorSelect = this.page.getByTestId('create-tutor-select');
    await waitForEnabled(tutorSelect);
    await tutorSelect.selectOption(String(idOrName));
  }

  async fillIntrinsicFields(payload: {
    tutorId?: number;
    courseId: number;
    weekStartDate?: string;
    sessionDate?: string;
    taskType: 'LECTURE'|'TUTORIAL'|'ORAA'|'DEMO'|'MARKING'|'OTHER';
    qualification?: 'STANDARD'|'COORDINATOR'|'PHD';
    repeat?: boolean;
    deliveryHours: number;
    description?: string;
  }): Promise<void> {
    if (payload.tutorId) {
      await this.selectTutor(payload.tutorId);
    }
    const course = this.page.getByTestId('create-course-select');
    await course.selectOption(String(payload.courseId));

    if (payload.weekStartDate) {
      // Week start uses a custom picker; expose wrapper testid
      const week = this.page.getByTestId('create-week-start-input');
      await waitForVisible(week);
      // Some apps implement custom pickers; fallback to formData if input exists
      const iso = payload.weekStartDate;
      const native = this.page.locator('input#weekStartDate');
      if (await native.count()) {
        await native.fill(iso);
      }
    }

    if (payload.sessionDate) {
      const session = this.page.getByTestId('create-session-date-input');
      if (await session.count()) {
        await session.fill(payload.sessionDate);
      }
    }

    const taskType = this.page.getByTestId('create-task-type-select');
    if (await taskType.count()) {
      await taskType.selectOption(payload.taskType);
    }

    const qualification = this.page.getByTestId('create-qualification-select');
    if (await qualification.count()) {
      // If read-only input, just assert present
      if (await qualification.getAttribute('readonly')) {
        await expect(qualification).toBeVisible();
      }
    }

    const repeat = this.page.getByTestId('create-repeat-checkbox');
    if (payload.repeat !== undefined && await repeat.count()) {
      if (payload.repeat) await repeat.check(); else await repeat.uncheck();
    }

    const hours = this.page.getByTestId('create-delivery-hours-input');
    await hours.fill(payload.deliveryHours.toString());

    if (payload.description) {
      const desc = this.page.getByTestId('create-description-input');
      await desc.fill(payload.description);
    }
  }

  async submitCreate(): Promise<void> {
    const submit = this.page.getByTestId('lecturer-create-submit-btn');
    await waitForEnabled(submit);
    await submit.click();
  }

  async findRowByTutor(idOrName: string | number): Promise<Locator> {
    await waitForVisible(this.table);
    const row = this.table.getByTestId('tutor-inbox-row').filter({ hasText: String(idOrName) }).first();
    return row;
  }

  statusChip(timesheetId: number): Locator {
    return this.page.getByTestId(`status-chip-${timesheetId}`);
  }
}

export default LecturerDashboardPage;

