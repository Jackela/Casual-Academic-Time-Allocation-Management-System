import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach, expect } from 'vitest';

vi.mock('../../services/users', () => ({
  fetchUsers: vi.fn(async () => ([
    { id: 9, email: 'tutor@example.com', name: 'Tutor One', role: 'TUTOR', isActive: true },
  ])),
  updateUser: vi.fn(async () => ({ id: 9 })),
  setTutorAssignments: vi.fn(async () => undefined),
  setTutorDefaultQualification: vi.fn(async () => undefined),
  getTutorAssignments: vi.fn(async () => [1]),
  getTutorDefaults: vi.fn(async () => ({ defaultQualification: 'STANDARD' })),
  createUser: vi.fn(),
}));

vi.mock('../../services/courses', () => ({
  fetchAllCourses: vi.fn(async () => ([
    { id: 1, code: 'COMP1001', name: 'Intro', lecturerId: 2, active: true },
    { id: 2, code: 'COMP2001', name: 'DSA', lecturerId: 2, active: true },
  ])),
  fetchLecturerCourses: vi.fn(),
}));

// Silence secure logger
vi.mock('../../utils/secure-logger', () => ({
  secureLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), api: vi.fn(), debug: vi.fn() },
}));

import AdminUsersPage from './AdminUsersPage';
import * as UsersSvc from '../../services/users';

describe('AdminUsersPage – edit tutor assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens Edit User modal and persists course assignments via admin endpoint', async () => {
    render(<AdminUsersPage />);
    // Wait for list to render
    await screen.findByTestId('admin-users-ready');

    // Find first Edit button and click
    const editButtons = await screen.findAllByRole('button', { name: /Edit/i });
    expect(editButtons.length).toBeGreaterThan(0);
    await userEvent.click(editButtons[0]);

    // Multiselect should render with options after fetch
    const select = await screen.findByLabelText(/Visible Courses \(assignments\)/i) as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBeGreaterThan(1));

    // Select both courses
    await userEvent.selectOptions(select, ['1', '2']);

    // Save changes
    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect((UsersSvc.setTutorAssignments as any)).toHaveBeenCalledWith({ tutorId: 9, courseIds: [1, 2] });
    });
  });
});

