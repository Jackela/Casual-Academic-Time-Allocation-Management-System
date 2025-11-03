import { secureApiClient } from './api-secure';
import type { Course } from '../types/api';
import { API_ENDPOINTS } from '../types/api';

export interface CourseWithContext extends Course {
  tutorCount?: number;
}

export async function fetchLecturerCourses(lecturerId: number): Promise<CourseWithContext[]> {
  const query = secureApiClient.createQueryString({
    lecturerId,
    active: true,
    includeTutors: true,
  });

  const endpoint = `${API_ENDPOINTS.COURSES.BASE}?${query}`;
  const response = await secureApiClient.get<CourseWithContext[]>(endpoint);
  return response.data;
}

export async function fetchCourseTutors(courseId: number): Promise<number[]> {
  const endpoint = `${API_ENDPOINTS.COURSES.BASE}/${courseId}/tutors`;
  const response = await secureApiClient.get<{ tutorIds: number[] }>(endpoint);
  return response.data.tutorIds ?? [];
}

// Admin: fetch all courses (active or otherwise depending on backend configuration)
export async function fetchAllCourses(): Promise<CourseWithContext[]> {
  const response = await secureApiClient.get<CourseWithContext[]>(API_ENDPOINTS.COURSES.BASE, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  return response.data;
}
