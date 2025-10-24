import type { APIRequestContext } from '@playwright/test';

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  constructor(private request: APIRequestContext, private opts: ApiClientOptions) {}

  private headers(extra?: Record<string, string>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra ?? {}) };
    if (this.opts.token) headers['Authorization'] = `Bearer ${this.opts.token}`;
    return headers;
  }

  async get<T = Json>(path: string): Promise<T> {
    const res = await this.request.get(`${this.opts.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async post<T = Json>(path: string, data: Json): Promise<T> {
    const res = await this.request.post(`${this.opts.baseUrl}${path}`, { headers: this.headers(), data });
    if (!res.ok()) throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
    return (await res.json()) as T;
  }
}

// SSOT-aware helpers (shape per docs/openapi/**)
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'LECTURER' | 'TUTOR';
}

export async function createUser(api: ApiClient, input: CreateUserInput) {
  return api.post('/api/users', input);
}

export interface CreateTimesheetInput {
  tutorId: number;
  courseId: number;
  weekStartDate?: string; // ISO date (Monday)
  sessionDate?: string;   // ISO date
  taskType: 'LECTURE' | 'TUTORIAL' | 'ORAA' | 'DEMO' | 'MARKING' | 'OTHER';
  qualification: 'STANDARD' | 'COORDINATOR' | 'PHD';
  repeat: boolean;
  deliveryHours: number;
  description?: string;
}

export async function createTimesheet(api: ApiClient, input: CreateTimesheetInput) {
  // Ensure no calculated fields leak into payload
  const { tutorId, courseId, weekStartDate, sessionDate, taskType, qualification, repeat, deliveryHours, description } = input;
  const payload: Record<string, unknown> = { tutorId, courseId, taskType, qualification, repeat, deliveryHours };
  if (weekStartDate) payload['weekStartDate'] = weekStartDate;
  if (sessionDate) payload['sessionDate'] = sessionDate;
  if (description) payload['description'] = description;
  return api.post('/api/timesheets', payload);
}

