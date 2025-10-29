import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

// Mock child form to synchronously invoke onSubmit
const TimesheetFormMock = vi.hoisted(() =>
  vi.fn((props: any) => (
    <div data-testid="timesheet-form-mock">
      <button
        onClick={() =>
          props.onSubmit({
            tutorId: 34,
            courseId: 12,
            weekStartDate: '2025-01-06',
            sessionDate: '2025-01-06',
            deliveryHours: 2,
            description: 'Guest tutorial',
            taskType: 'TUTORIAL',
            qualification: 'STANDARD',
            repeat: false,
          })
        }
      >
        submit form
      </button>
    </div>
  )),
);

vi.mock('../../TutorDashboard/components/TimesheetForm', () => ({
  __esModule: true,
  default: TimesheetFormMock,
}));

// Mock create hook
const createTimesheetMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/timesheets', () => ({
  useTimesheetCreate: () => ({
    createTimesheet: (...args: unknown[]) => createTimesheetMock(...args),
    loading: false,
    error: null,
    data: null,
    reset: resetMock,
  }),
}));

// Spy on notifications
const dispatcherMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../lib/routing/notificationRouter', () => ({
  dispatchNotification: (...args: unknown[]) => dispatcherMock(...args),
}));

// Mock TimesheetService.approveTimesheet
const approveMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/timesheets', () => ({
  TimesheetService: {
    approveTimesheet: (...args: unknown[]) => approveMock(...args),
  },
}));

describe('LecturerTimesheetCreateModal - auto submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Successful creation returns an id for follow-up submission
    createTimesheetMock.mockResolvedValue({ id: 123 });
  });

  it('auto-submits after creation and dispatches submit success notification', async () => {
    approveMock.mockResolvedValue({});

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByText('submit form'));

    // Create should be called with instructional fields only
    await waitFor(() => {
      expect(createTimesheetMock).toHaveBeenCalled();
    });

    // Approvals API called with SUBMIT_FOR_APPROVAL
    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith({
        timesheetId: 123,
        action: 'SUBMIT_FOR_APPROVAL',
      });
    });

    // Notifications: created then submitted
    await waitFor(() => {
      const types = dispatcherMock.mock.calls.map((c: any[]) => c[0]?.type);
      expect(types).toContain('TIMESHEET_CREATE_SUCCESS');
      expect(types).toContain('TIMESHEET_SUBMIT_SUCCESS');
    });
  });

  it('falls back to draft warning if auto-submit fails', async () => {
    approveMock.mockRejectedValue(new Error('network'));

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByText('submit form'));

    await waitFor(() => {
      expect(createTimesheetMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      const types = dispatcherMock.mock.calls.map((c: any[]) => c[0]?.type);
      expect(types).toContain('TIMESHEET_CREATE_SUCCESS');
      expect(types).toContain('DRAFTS_PENDING');
    });
  });
});

