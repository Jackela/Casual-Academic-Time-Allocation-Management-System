import { type Page, type Locator } from '@playwright/test';
import { waitForEnabled, waitForVisible } from '../../utils/waits';

export class TimesheetCreatePage {
  constructor(private page: Page) {}

  get modal(): Locator { return this.page.getByTestId('lecturer-create-modal'); }

  async fill(input: {
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
    await waitForVisible(this.modal);
    if (input.tutorId) {
      const tutor = this.page.getByTestId('create-tutor-select');
      await waitForEnabled(tutor);
      await tutor.selectOption(String(input.tutorId));
    }
    const course = this.page.getByTestId('create-course-select');
    await course.selectOption(String(input.courseId));
    if (input.weekStartDate) {
      const week = this.page.getByTestId('create-week-start-input');
      await waitForVisible(week);
    }
    if (input.sessionDate) {
      const session = this.page.getByTestId('create-session-date-input');
      if (await session.count()) await session.fill(input.sessionDate);
    }
    const task = this.page.getByTestId('create-task-type-select');
    if (await task.count()) await task.selectOption(input.taskType);
    const repeat = this.page.getByTestId('create-repeat-checkbox');
    if (input.repeat !== undefined && await repeat.count()) {
      if (input.repeat) await repeat.check(); else await repeat.uncheck();
    }
    const hours = this.page.getByTestId('create-delivery-hours-input');
    await hours.fill(String(input.deliveryHours));
    if (input.description) {
      const desc = this.page.getByTestId('create-description-input');
      await desc.fill(input.description);
    }
  }

  async submit(): Promise<void> {
    const submit = this.page.getByTestId('lecturer-create-submit-btn');
    await waitForEnabled(submit);
    await submit.click();
  }
}

export default TimesheetCreatePage;

