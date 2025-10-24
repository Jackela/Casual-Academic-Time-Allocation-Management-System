import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsersPage from './AdminUsersPage';

const fetchUsersMock = vi.fn();
const createUserMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock('../../services/users', () => ({
  fetchUsers: (...args: unknown[]) => fetchUsersMock(...(args as [])),
  createUser: (...args: unknown[]) => createUserMock(...(args as [])),
  updateUser: (...args: unknown[]) => updateUserMock(...(args as [])),
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchUsersMock.mockResolvedValue([]);
    createUserMock.mockResolvedValue({
      id: 99,
      email: 'new.user@example.edu',
      name: 'New User',
      role: 'TUTOR',
      isActive: true,
    });
    updateUserMock.mockResolvedValue({
      id: 1,
      email: 'alice@example.com',
      name: 'Alice Example',
      role: 'TUTOR',
      isActive: true,
    });
  });

  it('renders secure password field in create modal', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => expect(fetchUsersMock).toHaveBeenCalled());

    const addButton = screen.getByRole('button', { name: /Add User/i });
    await userEvent.click(addButton);

    const passwordField = (await screen.findByLabelText(/Temporary Password/i)) as HTMLInputElement;
    expect(passwordField).toHaveAttribute('type', 'password');
    expect(passwordField).toHaveValue('');

    const generateButton = screen.getByRole('button', { name: /Generate Secure Password/i });
    await userEvent.click(generateButton);

    await waitFor(() => expect(passwordField.value).not.toBe(''));

    const generatedHint = await screen.findByTestId('generated-password-hint');
    expect(generatedHint).toHaveTextContent(passwordField.value);
  });

  it('shows user status and action buttons', async () => {
    fetchUsersMock.mockResolvedValueOnce([
      {
        id: 1,
        email: 'alice@example.com',
        name: 'Alice Example',
        role: 'TUTOR',
        isActive: true,
      },
    ]);

    render(<AdminUsersPage />);

    const nameCell = await screen.findByText('Alice Example');
    const row = nameCell.closest('tr');
    expect(row).not.toBeNull();

    expect(within(row as HTMLTableRowElement).getByText('Active')).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(within(row as HTMLTableRowElement).getByRole('button', { name: /Deactivate/i })).toBeInTheDocument();
  });

  it('sends deactivate request with correct payload', async () => {
    const activeUser = {
      id: 1,
      email: 'alice@example.com',
      name: 'Alice Example',
      role: 'TUTOR' as const,
      isActive: true,
    };
    const inactiveUser = { ...activeUser, isActive: false };

    fetchUsersMock
      .mockResolvedValueOnce([activeUser])
      .mockResolvedValueOnce([inactiveUser])
      .mockResolvedValue([inactiveUser]);
    updateUserMock.mockResolvedValue(inactiveUser);

    render(<AdminUsersPage />);

    const nameCell = await screen.findByText('Alice Example');
    const row = nameCell.closest('tr');
    expect(row).not.toBeNull();

    const toggleButton = within(row as HTMLTableRowElement).getByRole('button', { name: /Deactivate/i });
    await userEvent.click(toggleButton);

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith(1, { isActive: false }));
    await waitFor(() => expect(fetchUsersMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(row as HTMLTableRowElement).getByText('Inactive')).toBeInTheDocument());
  });
});
