import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach, expect } from 'vitest';

vi.mock('../../services/users', () => ({
  fetchUsers: vi.fn(async () => ([
    { id: 2, email: 'lecturer@example.com', name: 'Lecturer One', role: 'LECTURER', isActive: true },
  ])),
  updateUser: vi.fn(async () => ({ id: 2 })),
  setLecturerAssignments: vi.fn(async () => undefined),
  getLecturerAssignments: vi.fn(async () => [1]),
  createUser: vi.fn(),
}));

vi.mock('../../services/courses', () => ({
  fetchAllCourses: vi.fn(async () => ([
    { id: 1, code: 'COMP1001', name: 'Intro', lecturerId: 2, active: true },
    { id: 2, code: 'COMP2001', name: 'DSA', lecturerId: 2, active: true },
  ])),
  fetchLecturerCourses: vi.fn(),
}));

vi.mock('../../utils/secure-logger', () => ({
  secureLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), api: vi.fn(), debug: vi.fn() },
}));

import AdminUsersPage from './AdminUsersPage';
import * as UsersSvc from '../../services/users';

describe('AdminUsersPage – edit lecturer assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists lecturer course assignments via admin endpoint', async () => {
    render(<AdminUsersPage />);
    await screen.findByTestId('admin-users-ready');
    const editButtons = await screen.findAllByRole('button', { name: /Edit/i });
    await userEvent.click(editButtons[0]);

    const select = await screen.findByLabelText(/Visible Courses \(assignments\)/i) as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBeGreaterThan(1));
    await userEvent.selectOptions(select, ['1', '2']);
    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect((UsersSvc.setLecturerAssignments as any)).toHaveBeenCalledWith({ lecturerId: 2, courseIds: [1, 2] });
    });
  });
});

