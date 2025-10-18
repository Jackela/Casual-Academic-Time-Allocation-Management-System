import { secureApiClient } from './api-secure';
import type { User, CreateUserRequest } from '../types/api';
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
