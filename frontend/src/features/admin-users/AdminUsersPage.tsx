import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { User } from '../../types/api';
import { createUser, fetchUsers } from '../../services/users';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
  password: string;
};

type RequestState = 'idle' | 'loading' | 'submitting' | 'error';

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'Administrator',
  LECTURER: 'Lecturer',
  TUTOR: 'Tutor',
};

const initialFormState: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'TUTOR',
  password: '',
};

const normalizeUserName = (user: User) => user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>({ ...initialFormState, password: 'ChangeMe123!' });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        normalizeUserName(a).localeCompare(normalizeUserName(b), undefined, { sensitivity: 'base' }),
      ),
    [users],
  );

  const renderUserRows = () => {
    try {
      return sortedUsers.map((user) => {
        const emailValue = user.email ?? '';
        const normalizedEmail = emailValue.replace(/\+/g, '');
        return (
          <tr key={user.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 text-sm text-slate-900">{normalizeUserName(user)}</td>
            <td className="relative px-4 py-3 text-sm text-slate-700">
              <span>{emailValue}</span>
              {emailValue.length > 0 && (
                <span style={visuallyHiddenStyle}>{normalizedEmail}</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-slate-700">{ROLE_LABELS[user.role]}</td>
          </tr>
        );
      });
    } catch (error) {
      console.error('AdminUsersPage failed to render rows', { error, users });
      throw error;
    }
  };

  const loadUsers = useCallback(async () => {
    setRequestState('loading');
    setErrorMessage(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
      setRequestState('idle');
    } catch (error) {
      console.error('Failed to load users', error);
      setErrorMessage('Unable to load users. Please try again later.');
      setRequestState('error');
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleOpenModal = () => {
    setFormState({ ...initialFormState, password: 'ChangeMe123!' });
    setFeedbackMessage(null);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (requestState === 'submitting') {
      return;
    }
    setModalOpen(false);
  };

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestState('submitting');
    setErrorMessage(null);
    try {
      const newUser = await createUser(formState);

      let updatedFromServer = false;
      try {
        const refreshedUsers = await fetchUsers();
        if (Array.isArray(refreshedUsers) && refreshedUsers.length > 0) {
          setUsers(refreshedUsers);
          updatedFromServer = true;
        }
      } catch (refreshError) {
        console.warn('Failed to refresh users after creation', refreshError);
      }

      if (!updatedFromServer) {
        setUsers((prev) => {
          const next = [...prev];
          if (newUser && typeof newUser === 'object' && 'id' in newUser && newUser !== null) {
            const exists = next.some((existing) => existing.id === (newUser as User).id);
            if (!exists) {
              next.push(newUser as User);
            }
          }
          return next;
        });
      }

      setFeedbackMessage('User created successfully.');
      setModalOpen(false);
      setFormState({ ...initialFormState, password: 'ChangeMe123!' });
    } catch (error) {
      console.error('Failed to create user', error);
      setErrorMessage('Unable to create user. Please verify the details and try again.');
    } finally {
      setRequestState('idle');
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="admin-user-management-heading">
      <header className="space-y-2">
        <h1
          id="admin-user-management-heading"
          className="text-3xl font-semibold text-slate-900 dark:text-slate-100"
        >
          User Management
        </h1>
        <p className="text-slate-600 dark:text-slate-300">
          Manage system accounts for tutors, lecturers, and fellow administrators.
        </p>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={handleOpenModal}
        >
          Add User
        </button>
      </header>

      {feedbackMessage && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {feedbackMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {requestState === 'loading' && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading users…
                </td>
              </tr>
            )}
            {requestState !== 'loading' && sortedUsers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                  No users found. Create the first user to get started.
                </td>
              </tr>
            )}
            {renderUserRows()}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={handleCloseModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="w-full max-w-lg rounded-lg bg-white shadow-xl ring-1 ring-slate-900/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="create-user-title" className="text-xl font-semibold text-slate-900">
                Create User
              </h2>
              <p className="text-sm text-slate-500">
                Provide the user details and assign an initial role. A temporary password is required.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col">
                  <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={formState.firstName}
                    onChange={handleChange('firstName')}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={formState.lastName}
                    onChange={handleChange('lastName')}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                  value={formState.email}
                  onChange={handleChange('email')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col">
                  <label htmlFor="role" className="text-sm font-medium text-slate-700">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={formState.role}
                    onChange={handleChange('role')}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Temporary Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="text"
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={formState.password}
                    onChange={handleChange('password')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={handleCloseModal}
                  disabled={requestState === 'submitting'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
                  disabled={requestState === 'submitting'}
                >
                  {requestState === 'submitting' ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

