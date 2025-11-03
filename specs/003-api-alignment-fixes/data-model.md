# Data Model: API Alignment Fixes (003)

## Entities

### CourseTutorsResponse
- Description: Minimal client-facing representation of tutors for a course.
- Fields:
  - tutorIds: number[] (array of tutor user IDs)
- Invariants:
  - tutorIds contains unique numeric IDs
  - tutorIds may be empty but not null

## Relationships
- Course (courseId: number) → CourseTutorsResponse (tutorIds: number[])
- Derived from TutorAssignment records in the system of record.

