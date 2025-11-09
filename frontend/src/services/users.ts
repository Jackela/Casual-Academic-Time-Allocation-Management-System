import { secureApiClient } from './api-secure';
import type { User, CreateUserRequest, UpdateUserRequest, TutorAssignmentPayload, TutorDefaultsPayload, TutorQualification } from '../types/api';
import { API_ENDPOINTS } from '../types/api';

export interface AdminCreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
  password: string;
}

const normalizeName = (firstName: string, lastName: string) => {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.join(' ').trim();
};

export async function fetchUsers(): Promise<User[]> {
  const response = await secureApiClient.get<User[]>(API_ENDPOINTS.USERS.BASE);
  return response.data;
}

export async function createUser(payload: AdminCreateUserForm): Promise<User> {
  const request: CreateUserRequest = {
    email: payload.email.trim(),
    name: normalizeName(payload.firstName, payload.lastName),
    role: payload.role,
    password: payload.password,
  };

  const response = await secureApiClient.post<User>(API_ENDPOINTS.USERS.BASE, request);
  return response.data;
}

export async function updateUser(id: number, payload: UpdateUserRequest): Promise<User> {
  const response = await secureApiClient.patch<User>(`${API_ENDPOINTS.USERS.BASE}/${id}`, payload);
  return response.data;
}

export async function fetchTutorsForLecturer(lecturerId: number): Promise<User[]> {
  const query = secureApiClient.createQueryString({
    role: 'TUTOR',
    lecturerId,
    active: true,
  });

  const endpoint = `${API_ENDPOINTS.USERS.BASE}?${query}`;
  const response = await secureApiClient.get<User[]>(endpoint);
  return response.data;
}

// Admin: set tutor-course assignments
export async function setTutorAssignments(payload: TutorAssignmentPayload): Promise<void> {
  await secureApiClient.post(API_ENDPOINTS.USERS.ADMIN.TUTOR_ASSIGNMENTS, payload);
}

// Admin: set tutor default qualification
export async function setTutorDefaultQualification(payload: TutorDefaultsPayload): Promise<void> {
  await secureApiClient.put(API_ENDPOINTS.USERS.ADMIN.TUTOR_DEFAULTS, payload);
}

export async function getTutorAssignments(tutorId: number): Promise<number[]> {
  const response = await secureApiClient.get<{ courseIds: number[] }>(`/api/admin/tutors/${tutorId}/assignments`);
  return response.data.courseIds ?? [];
}

export async function getTutorDefaults(tutorId: number): Promise<{ defaultQualification: TutorQualification | null }> {
  try {
    const response = await secureApiClient.get<{ defaultQualification: TutorQualification | null }>(
      `${API_ENDPOINTS.USERS.ADMIN.TUTOR_DEFAULTS.replace('/defaults', '')}/${tutorId}/defaults`
    );
    return response.data ?? { defaultQualification: null };
  } catch {
    // Treat missing/errored defaults as non-fatal: return null qualification
    return { defaultQualification: null };
  }
}

export async function getAssignmentsForCourses(courseIds: number[]): Promise<Record<number, number[]>> {
  const query = secureApiClient.createQueryString({ courseIds: courseIds.join(',') });
  const url = `/api/admin/tutors/courses/assignments?${query}`;
  const response = await secureApiClient.get<{ assignments: Record<string, number[]> }>(url);
  const out: Record<number, number[]> = {};
  const src = response.data?.assignments ?? {};
  for (const [k, v] of Object.entries(src)) {
    out[Number(k)] = Array.isArray(v) ? v.map(Number) : [];
  }
  return out;
}

// Lecturer assignments API
export async function setLecturerAssignments(payload: { lecturerId: number; courseIds: number[] }): Promise<void> {
  await secureApiClient.post('/api/admin/lecturers/assignments', payload);
}

export async function getLecturerAssignments(lecturerId: number): Promise<number[]> {
  const response = await secureApiClient.get<{ courseIds: number[] }>(`/api/admin/lecturers/${lecturerId}/assignments`);
  return response.data.courseIds ?? [];
}
