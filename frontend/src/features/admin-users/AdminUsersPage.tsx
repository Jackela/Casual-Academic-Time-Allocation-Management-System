import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { User } from '../../types/api';
import { createUser, fetchUsers, updateUser, setTutorAssignments, setTutorDefaultQualification, getTutorAssignments, getTutorDefaults, setLecturerAssignments, getLecturerAssignments } from '../../services/users';
import { fetchAllCourses } from '../../services/courses';
import type { TutorQualification } from '../../types/api';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
  password: string;
  // New admin fields when role=TUTOR
  assignedCourseIds?: number[];
  defaultQualification?: TutorQualification;
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
  assignedCourseIds: [],
  defaultQualification: 'STANDARD',
};

const PASSWORD_LENGTH = 16;
// Align password generator with backend validation policy
// Backend regex allows only letters, digits, and the following specials: @$!%*?&
const PASSWORD_CHARSETS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '@$!%*?&',
] as const;

const PASSWORD_HINT =
  'Use at least 12 characters with a mix of uppercase, lowercase, numbers, and symbols.';

const generateSecurePassword = (): string => {
  const getRandomValues = (count: number) => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint32Array(count);
      crypto.getRandomValues(buffer);
      return Array.from(buffer);
    }
    return Array.from({ length: count }, () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  };

  const baseCharacters = PASSWORD_CHARSETS.join('');
  const requiredCharacters = PASSWORD_CHARSETS.map((charset, _index) => {
    const randomIndex = getRandomValues(1)[0] % charset.length;
    return charset.charAt(randomIndex);
  });

  const remainingLength = Math.max(PASSWORD_LENGTH - requiredCharacters.length, 0);
  const additionalCharacters = Array.from({ length: remainingLength }, (_, idx) => {
    const randomIndex = getRandomValues(remainingLength)[idx] % baseCharacters.length;
    return baseCharacters.charAt(randomIndex);
  });

  const combined = [...requiredCharacters, ...additionalCharacters];
  const shuffleValues = getRandomValues(combined.length);

  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = shuffleValues[i] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
};

// Minimal mirror of backend password policy to avoid 400s during create.
// Back-end requires 8-255 chars with upper, lower, digit and one of @$!%*?&.
const isCompliantPassword = (pwd: string): boolean => {
  if (!pwd || pwd.length < 8 || pwd.length > 255) return false;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[@$!%*?&]/.test(pwd);
  // Backend typically restricts to these safe characters; loosely enforce composition here.
  return hasUpper && hasLower && hasDigit && hasSpecial;
};

const resolveIsActive = (user: User): boolean => {
  if (typeof user.isActive === 'boolean') {
    return user.isActive;
  }
  if (typeof (user as { active?: boolean }).active === 'boolean') {
    return (user as { active?: boolean }).active ?? true;
  }
  return true;
};

const extractNameParts = (user: User) => {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first || last) {
    return {
      firstName: first ?? '',
      lastName: last ?? '',
    };
  }

  if (typeof user.name === 'string' && user.name.trim().length > 0) {
    const parts = user.name.trim().split(/\s+/);
    const [firstName, ...rest] = parts;
    return {
      firstName: firstName ?? '',
      lastName: rest.join(' '),
    };
  }

  return { firstName: '', lastName: '' };
};

const buildDisplayName = (firstName: string, lastName: string) =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

const normalizeUserName = (user: User) => {
  const trimmedName = typeof user.name === 'string' ? user.name.trim() : '';
  if (trimmedName.length > 0) {
    return trimmedName;
  }
  const { firstName, lastName } = extractNameParts(user);
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

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
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: number; label: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editAssignedCourseIds, setEditAssignedCourseIds] = useState<number[]>([]);
  const [editCourseOptions, setEditCourseOptions] = useState<{ id: number; label: string }[]>([]);
  const [editDefaultQualification, setEditDefaultQualification] = useState<TutorQualification | null>(null);
  const [editFormState, setEditFormState] = useState<{ firstName: string; lastName: string }>({
    firstName: '',
    lastName: '',
  });
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const fetchAndSetUsers = useCallback(async () => {
    const data = await fetchUsers();
    setUsers(data);
    return data;
  }, []);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        normalizeUserName(a).localeCompare(normalizeUserName(b), undefined, { sensitivity: 'base' }),
      ),
    [users],
  );

  const loadUsers = useCallback(async () => {
    setRequestState('loading');
    setErrorMessage(null);
    try {
      await fetchAndSetUsers();
      setRequestState('idle');
    } catch (error) {
      console.error('Failed to load users', error);
      setErrorMessage('Unable to load users. Please try again later.');
      setRequestState('error');
    }
  }, [fetchAndSetUsers]);

  // Load courses for assignment when opening modal or when role is TUTOR
  useEffect(() => {
    if (!modalOpen && !editingUser) return;
    const loadCourses = async () => {
      try {
        // In create-user modal, we need the full course set so admins can assign visibility immediately.
        // Use fetchAllCourses() instead of fetching by lecturerId=0.
        const list = await fetchAllCourses().catch(() => []);
        const mapped = (list || []).map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name }));
        setAvailableCourses(mapped);
      } catch (e) {
        setAvailableCourses([]);
      }
    };
    void loadCourses();
  }, [modalOpen, editingUser]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleOpenModal = () => {
    setFormState(initialFormState);
    setGeneratedPassword(null);
    setFeedbackMessage(null);
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (requestState === 'submitting') {
      return;
    }
    setGeneratedPassword(null);
    setModalOpen(false);
  };

  const handleChange =
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
      if (field === 'password') {
        setGeneratedPassword(null);
      }
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestState('submitting');
    setErrorMessage(null);
    try {
      // Enforce password policy client-side for deterministic UX in tests and UI
      const candidate = formState.password?.trim?.() ?? '';
      if (!isCompliantPassword(candidate)) {
        setErrorMessage('Password does not meet policy. Use at least 12 chars with upper, lower, digit and symbol.');
        setRequestState('idle');
        return;
      }

      const createPayload = { ...formState, password: candidate } as typeof formState;
      const newUser = await createUser(createPayload);

      // If user is TUTOR/LECTURER and assignments/defaults were selected, push them
      if (newUser.role === 'TUTOR') {
        try {
          if (Array.isArray(formState.assignedCourseIds) && formState.assignedCourseIds.length > 0) {
            await setTutorAssignments({ tutorId: newUser.id, courseIds: formState.assignedCourseIds });
          }
          if (formState.defaultQualification) {
            await setTutorDefaultQualification({ tutorId: newUser.id, defaultQualification: formState.defaultQualification });
          }
        } catch (err) {
          console.warn('Post-create tutor config failed', err);
        }
      } else if (newUser.role === 'LECTURER') {
        try {
          if (Array.isArray(formState.assignedCourseIds) && formState.assignedCourseIds.length > 0) {
            await setLecturerAssignments({ lecturerId: newUser.id, courseIds: formState.assignedCourseIds });
          }
        } catch (err) {
          console.warn('Post-create lecturer assignments failed', err);
        }
      }

      let updatedFromServer = false;
      try {
        const refreshedUsers = await fetchAndSetUsers();
        if (Array.isArray(refreshedUsers) && refreshedUsers.length > 0) {
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
      setFormState(initialFormState);
      setGeneratedPassword(null);
    } catch (error) {
      console.error('Failed to create user', error);
      setErrorMessage('Unable to create user. Please verify the details and try again.');
    } finally {
      setRequestState('idle');
    }
  };

  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    setFormState((prev) => ({ ...prev, password }));
    setGeneratedPassword(password);
  };

  const handleToggleActive = async (user: User) => {
    const nextStatus = !resolveIsActive(user);
    setUpdatingUserId(user.id);
    setErrorMessage(null);
    try {
      await updateUser(user.id, { isActive: nextStatus });
      await fetchAndSetUsers();
      setFeedbackMessage(nextStatus ? 'User reactivated successfully.' : 'User deactivated successfully.');
    } catch (error) {
      console.error('Failed to toggle user activation', error);
      setErrorMessage('Unable to update user status. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenEditModal = (user: User) => {
    const parts = extractNameParts(user);
    setEditFormState(parts);
    setEditingUser(user);
    setFeedbackMessage(null);
    setErrorMessage(null);
  };

  const handleCloseEditModal = () => {
    if (editingUser && updatingUserId === editingUser.id) {
      return;
    }
    setEditingUser(null);
    setEditAssignedCourseIds([]);
    setEditCourseOptions([]);
    setEditDefaultQualification(null);
  };

  const handleEditChange =
    (field: 'firstName' | 'lastName') => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setEditFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    const trimmedFirstName = editFormState.firstName.trim();
    const trimmedLastName = editFormState.lastName.trim();

    const payload: Record<string, string> = {};
    if (trimmedFirstName.length > 0) {
      payload.firstName = trimmedFirstName;
    }
    if (trimmedLastName.length > 0) {
      payload.lastName = trimmedLastName;
    }

    const displayName = buildDisplayName(trimmedFirstName, trimmedLastName);
    if (displayName.length > 0) {
      payload.name = displayName;
    }

    setUpdatingUserId(editingUser.id);
    setErrorMessage(null);

    try {
      await updateUser(editingUser.id, payload);
      // Persist role-specific associations
      if (editingUser.role === 'TUTOR') {
        if (Array.isArray(editAssignedCourseIds)) {
          await setTutorAssignments({ tutorId: editingUser.id, courseIds: editAssignedCourseIds });
        }
        if (editDefaultQualification) {
          await setTutorDefaultQualification({ tutorId: editingUser.id, defaultQualification: editDefaultQualification });
        }
      } else if (editingUser.role === 'LECTURER') {
        if (Array.isArray(editAssignedCourseIds)) {
          await setLecturerAssignments({ lecturerId: editingUser.id, courseIds: editAssignedCourseIds });
        }
      }
      await fetchAndSetUsers();
      setFeedbackMessage('User details updated.');
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user details', error);
      setErrorMessage('Unable to update user details. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Load edit modal data for assignments when opening modal
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!editingUser) return;
      try {
        if (editingUser.role === 'TUTOR') {
          const [courses, current, defaults] = await Promise.all([
            fetchAllCourses(),
            getTutorAssignments(editingUser.id),
            getTutorDefaults(editingUser.id),
          ]);
          if (cancelled) return;
          setEditCourseOptions((courses || []).map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name })));
          setEditAssignedCourseIds(Array.isArray(current) ? current : (current as any)?.courseIds ?? []);
          setEditDefaultQualification((defaults as any)?.defaultQualification ?? null);
        } else if (editingUser.role === 'LECTURER') {
          const [courses, current] = await Promise.all([
            fetchAllCourses(),
            getLecturerAssignments(editingUser.id),
          ]);
          if (cancelled) return;
          setEditCourseOptions((courses || []).map((c) => ({ id: c.id, label: c.code ? `${c.code} - ${c.name}` : c.name })));
          setEditAssignedCourseIds(Array.isArray(current) ? current : (current as any)?.courseIds ?? []);
          setEditDefaultQualification(null);
        }
      } catch (e) {
        if (cancelled) return;
        // Leave options empty on failure; the rest of the modal still works
        setEditCourseOptions([]);
        setEditAssignedCourseIds([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [editingUser]);

  return (
    <section className="space-y-6" aria-labelledby="admin-user-management-heading" data-testid="admin-users-ready">
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
          data-testid="admin-user-create-btn"
          aria-label="Add user"
          // Aliases for E2E tests
          data-e2e="btn-create-user"
        >
          Add User
        </button>
      </header>

      {feedbackMessage && (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700"
          data-testid="toast-success"
        >
          {feedbackMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200" data-testid="admin-users-table">
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
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {requestState === 'loading' && (
              <tr key="loading-row">
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading users…
                </td>
              </tr>
            )}
            {requestState !== 'loading' && sortedUsers.length === 0 && (
              <tr key="empty-row">
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No users found. Create the first user to get started.
                </td>
              </tr>
            )}
            {sortedUsers.map((user, idx) => {
              const emailValue = user.email ?? '';
              const normalizedEmail = emailValue.replace(/\+/g, '');
              const isActive = resolveIsActive(user);
              const toggleLabel = isActive ? 'Deactivate' : 'Reactivate';
              const actionDisabled = updatingUserId === user.id;
              const statusClasses = isActive
                ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'
                : 'inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700';

              const rowKey = typeof user.id === 'number' && Number.isFinite(user.id)
                ? `id:${user.id}`
                : (normalizedEmail ? `email:${normalizedEmail}` : `idx:${idx}`);

              return (
                <tr
                  key={rowKey}
                  className="hover:bg-slate-50"
                  data-testid={`row-${normalizedEmail}`}
                >
                  <td className="px-4 py-3 text-sm text-slate-900">{normalizeUserName(user)}</td>
                  <td className="relative px-4 py-3 text-sm text-slate-700">
                    <span>{emailValue}</span>
                    {emailValue.length > 0 && <span style={visuallyHiddenStyle}>{normalizedEmail}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span className={statusClasses}>{isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        onClick={() => handleOpenEditModal(user)}
                        disabled={actionDisabled}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-3 py-1 text-xs font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isActive
                            ? 'bg-rose-600 hover:bg-rose-500 focus-visible:outline-rose-600'
                            : 'bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600'
                          } disabled:opacity-60`}
                        onClick={() => handleToggleActive(user)}
                        disabled={actionDisabled}
                        data-testid="admin-user-activate-toggle"
                        // Aliases for stable E2E selectors
                        data-e2e={isActive ? 'btn-deactivate' : 'btn-activate'}
                      >
                        {actionDisabled ? 'Updating…' : toggleLabel}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
                    data-testid="admin-user-email"
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
                    data-testid="admin-user-role"
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
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={formState.password}
                    onChange={handleChange('password')}
                    aria-describedby="password-hint"
                    data-testid="admin-user-password"
                  />
                  <p id="password-hint" className="mt-1 text-xs text-slate-500">
                    {PASSWORD_HINT}
                  </p>
                  {generatedPassword && (
                    <p
                      data-testid="generated-password-hint"
                      className="mt-1 text-xs text-emerald-600"
                    >
                      Generated password:{' '}
                      <code className="font-mono">{generatedPassword}</code>
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-2 w-fit rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    onClick={handleGeneratePassword}
                    disabled={requestState === 'submitting'}
                  >
                    Generate Secure Password
                  </button>
                </div>
              </div>

              {(formState.role === 'TUTOR' || formState.role === 'LECTURER') && (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-2">
                      Visible Courses (assignments)
                    </label>
                    <div className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm min-h-[6rem] max-h-[12rem] overflow-y-auto space-y-2" data-testid="admin-user-assigned-courses">
                      {availableCourses.map((c) => (
                        <label key={c.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(formState.assignedCourseIds ?? []).includes(c.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormState((prev) => {
                                const current = prev.assignedCourseIds ?? [];
                                const updated = isChecked
                                  ? [...current, c.id]
                                  : current.filter((id) => id !== c.id);
                                return { ...prev, assignedCourseIds: updated };
                              });
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span className="text-sm text-slate-700">{c.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Lecturers see tutors/records in assigned courses；Tutors只能看到被分配的课程。</p>
                  </div>
                  {formState.role === 'TUTOR' && (<div className="flex flex-col">
                    <label htmlFor="default-qualification" className="text-sm font-medium text-slate-700">
                      Default Tutor Qualification
                    </label>
                    <select
                      id="default-qualification"
                      className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                      value={formState.defaultQualification ?? 'STANDARD'}
                      onChange={(e) => setFormState((prev) => ({ ...prev, defaultQualification: e.target.value as TutorQualification }))}
                      data-testid="admin-user-default-qualification"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="COORDINATOR">Coordinator</option>
                      <option value="PHD">PhD</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">This default is applied in new timesheets; tutors can override per entry.</p>
                  </div>)}
                </div>
              )}

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
                  data-testid="admin-user-submit"
                >
                  {requestState === 'submitting' ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={handleCloseEditModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="w-full max-w-lg rounded-lg bg-white shadow-xl ring-1 ring-slate-900/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="edit-user-title" className="text-xl font-semibold text-slate-900">
                Edit User
              </h2>
              <p className="text-sm text-slate-500">
                Update profile details for{' '}
                <span className="font-medium text-slate-700">
                  {normalizeUserName(editingUser)}
                </span>
                .
              </p>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 px-6 py-5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </span>
                <span className="text-sm text-slate-700">{editingUser.email ?? 'Not supplied'}</span>
              </div>

              {(editingUser.role === 'TUTOR' || editingUser.role === 'LECTURER') && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-2">
                      Visible Courses (assignments)
                    </label>
                    <div className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm min-h-[6rem] max-h-[12rem] overflow-y-auto space-y-2" data-testid="admin-edit-user-assigned-courses">
                      {editCourseOptions.map((co) => (
                        <label key={co.id} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={editAssignedCourseIds.includes(co.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setEditAssignedCourseIds((prev) => {
                                const updated = isChecked
                                  ? [...prev, co.id]
                                  : prev.filter((id) => id !== co.id);
                                return updated;
                              });
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span className="text-sm text-slate-700">{co.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Lecturers see tutors in assigned courses; tutors see only assigned courses.
                    </p>
                  </div>

                  {editingUser.role === 'TUTOR' && (<div className="flex flex-col">
                    <label htmlFor="edit-default-qualification" className="text-sm font-medium text-slate-700">
                      Default Tutor Qualification
                    </label>
                    <select
                      id="edit-default-qualification"
                      className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                      value={editDefaultQualification ?? 'STANDARD'}
                      onChange={(e) => setEditDefaultQualification(e.target.value as TutorQualification)}
                      data-testid="admin-edit-user-default-qualification"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="COORDINATOR">Coordinator</option>
                      <option value="PHD">PhD</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">This default is applied in new timesheets; tutors can override per entry.</p>
                  </div>)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col">
                  <label htmlFor="edit-first-name" className="text-sm font-medium text-slate-700">
                    First Name
                  </label>
                  <input
                    id="edit-first-name"
                    name="edit-first-name"
                    type="text"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={editFormState.firstName}
                    onChange={handleEditChange('firstName')}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="edit-last-name" className="text-sm font-medium text-slate-700">
                    Last Name
                  </label>
                  <input
                    id="edit-last-name"
                    name="edit-last-name"
                    type="text"
                    className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring focus:ring-primary/20"
                    value={editFormState.lastName}
                    onChange={handleEditChange('lastName')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  onClick={handleCloseEditModal}
                  disabled={updatingUserId === editingUser.id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
                  disabled={updatingUserId === editingUser.id}
                >
                  {updatingUserId === editingUser.id ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
