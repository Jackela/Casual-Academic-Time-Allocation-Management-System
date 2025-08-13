# CATAMS API Documentation

## Overview

The CATAMS API provides comprehensive endpoints for managing academic time allocation and approval workflows. This REST API supports three primary user roles (ADMIN, LECTURER, TUTOR) with role-based access control and JWT authentication.

**Base URL**: `http://localhost:8084/api/v1` (Development)  
**API Version**: 1.0.0  
**Authentication**: Bearer Token (JWT)

## Quick Start

### Authentication

All API endpoints (except `/auth/login`) require a valid JWT token in the Authorization header:

```bash
# 1. Login to get JWT token
curl -X POST http://localhost:8084/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lecturer@university.edu",
    "password": "password123"
  }'

# Response includes JWT token
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "lecturer@university.edu",
    "role": "LECTURER"
  }
}

# 2. Use token in subsequent requests
curl -X GET http://localhost:8084/api/v1/timesheets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## API Endpoints Reference

### Authentication Endpoints

#### POST `/auth/login`
Authenticate user and retrieve JWT token.

**Request:**
```json
{
  "email": "user@university.edu",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@university.edu",
    "role": "LECTURER",
    "name": "Dr. Jane Smith"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing or invalid request data

#### POST `/auth/logout`
Logout user (invalidate JWT token on client side).

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### User Management Endpoints

#### GET `/users`
Retrieve list of users (ADMIN only).

**Query Parameters:**
- `role` (optional): Filter by user role (ADMIN, LECTURER, TUTOR)
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 1,
      "email": "lecturer@university.edu",
      "name": "Dr. Jane Smith",
      "role": "LECTURER",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### POST `/users`
Create new user (ADMIN only).

**Request:**
```json
{
  "email": "newtutor@university.edu",
  "name": "John Doe",
  "role": "TUTOR",
  "password": "temporaryPassword123"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "email": "newtutor@university.edu",
  "name": "John Doe",
  "role": "TUTOR",
  "createdAt": "2025-08-12T15:30:00Z",
  "updatedAt": "2025-08-12T15:30:00Z"
}
```

#### GET `/users/{id}`
Retrieve specific user details.

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "lecturer@university.edu",
  "name": "Dr. Jane Smith",
  "role": "LECTURER",
  "courses": [
    {
      "id": 101,
      "code": "COMP3888",
      "name": "Computer Science Capstone"
    }
  ]
}
```

### Timesheet Endpoints

#### GET `/timesheets`
Retrieve timesheets based on user role and permissions.

**Query Parameters:**
- `status` (optional): Filter by approval status
- `courseId` (optional): Filter by course ID
- `tutorId` (optional): Filter by tutor ID (ADMIN/LECTURER only)
- `weekStart` (optional): Filter by week start date (YYYY-MM-DD)
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": 1,
      "tutor": {
        "id": 2,
        "name": "John Doe",
        "email": "tutor@university.edu"
      },
      "course": {
        "id": 101,
        "code": "COMP3888",
        "name": "Computer Science Capstone"
      },
      "weekPeriod": {
        "startDate": "2025-08-11"
      },
      "hours": 10.5,
      "hourlyRate": 45.00,
      "description": "Tutorial preparation and delivery",
      "status": "PENDING_TUTOR_REVIEW",
      "createdAt": "2025-08-11T09:00:00Z",
      "updatedAt": "2025-08-11T09:00:00Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 5,
    "totalPages": 1
  }
}
```

#### POST `/timesheets`
Create new timesheet (TUTOR role or ADMIN on behalf of tutor).

**Request:**
```json
{
  "courseId": 101,
  "weekStart": "2025-08-11",
  "hours": 8.5,
  "hourlyRate": 45.00,
  "description": "Lab supervision and student consultations"
}
```

**Response (201 Created):**
```json
{
  "id": 5,
  "tutor": {
    "id": 2,
    "name": "John Doe",
    "email": "tutor@university.edu"
  },
  "course": {
    "id": 101,
    "code": "COMP3888",
    "name": "Computer Science Capstone"
  },
  "weekPeriod": {
    "startDate": "2025-08-11"
  },
  "hours": 8.5,
  "hourlyRate": 45.00,
  "description": "Lab supervision and student consultations",
  "status": "DRAFT",
  "createdAt": "2025-08-12T15:45:00Z",
  "updatedAt": "2025-08-12T15:45:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid timesheet data, validation errors
- `403 Forbidden`: User not authorized to create timesheet for specified course
- `409 Conflict`: Timesheet already exists for this tutor/course/week combination

#### GET `/timesheets/{id}`
Retrieve specific timesheet details.

**Response (200 OK):**
```json
{
  "id": 1,
  "tutor": {
    "id": 2,
    "name": "John Doe",
    "email": "tutor@university.edu"
  },
  "course": {
    "id": 101,
    "code": "COMP3888",
    "name": "Computer Science Capstone"
  },
  "weekPeriod": {
    "startDate": "2025-08-11"
  },
  "hours": 10.5,
  "hourlyRate": 45.00,
  "description": "Tutorial preparation and delivery",
  "status": "APPROVED_BY_LECTURER_AND_TUTOR",
  "approvalHistory": [
    {
      "id": 1,
      "approver": {
        "id": 1,
        "name": "Dr. Jane Smith",
        "role": "LECTURER"
      },
      "action": "APPROVE",
      "comments": "Hours look reasonable for tutorial work",
      "createdAt": "2025-08-11T14:30:00Z"
    }
  ],
  "createdAt": "2025-08-11T09:00:00Z",
  "updatedAt": "2025-08-11T14:30:00Z"
}
```

#### PUT `/timesheets/{id}`
Update existing timesheet (only in DRAFT or MODIFICATION_REQUESTED status).

**Request:**
```json
{
  "hours": 9.0,
  "description": "Updated: Tutorial preparation, delivery, and student consultation"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "hours": 9.0,
  "description": "Updated: Tutorial preparation, delivery, and student consultation",
  "status": "DRAFT",
  "updatedAt": "2025-08-12T16:00:00Z"
}
```

#### DELETE `/timesheets/{id}`
Delete timesheet (only in DRAFT status).

**Response (204 No Content)**

### Approval Workflow Endpoints

#### POST `/approvals/{timesheetId}/submit`
Submit timesheet for approval (TUTOR only).

**Response (200 OK):**
```json
{
  "timesheetId": 1,
  "status": "PENDING_TUTOR_REVIEW",
  "message": "Timesheet submitted for approval"
}
```

#### POST `/approvals/{timesheetId}/approve`
Approve timesheet (role-appropriate approval).

**Request (optional):**
```json
{
  "comments": "Hours are appropriate for the work described"
}
```

**Response (200 OK):**
```json
{
  "timesheetId": 1,
  "previousStatus": "PENDING_TUTOR_REVIEW",
  "newStatus": "APPROVED_BY_LECTURER_AND_TUTOR",
  "approver": {
    "id": 1,
    "name": "Dr. Jane Smith",
    "role": "LECTURER"
  },
  "comments": "Hours are appropriate for the work described",
  "approvedAt": "2025-08-12T16:15:00Z"
}
```

#### POST `/approvals/{timesheetId}/reject`
Reject timesheet with required comments.

**Request:**
```json
{
  "comments": "Hours seem excessive for tutorial work. Please review and resubmit."
}
```

**Response (200 OK):**
```json
{
  "timesheetId": 1,
  "previousStatus": "PENDING_TUTOR_REVIEW",
  "newStatus": "REJECTED",
  "approver": {
    "id": 1,
    "name": "Dr. Jane Smith",
    "role": "LECTURER"
  },
  "comments": "Hours seem excessive for tutorial work. Please review and resubmit.",
  "rejectedAt": "2025-08-12T16:20:00Z"
}
```

#### POST `/approvals/{timesheetId}/request-modification`
Request modifications to timesheet.

**Request:**
```json
{
  "comments": "Please provide more detail in the description and break down the hours by activity"
}
```

**Response (200 OK):**
```json
{
  "timesheetId": 1,
  "previousStatus": "PENDING_TUTOR_REVIEW",
  "newStatus": "MODIFICATION_REQUESTED",
  "message": "Modification request sent to tutor"
}
```

### Dashboard Endpoints

#### GET `/dashboard/summary`
Get dashboard summary for current user.

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "Dr. Jane Smith",
    "role": "LECTURER"
  },
  "summary": {
    "totalTimesheets": 15,
    "pendingApprovals": 3,
    "approvedThisMonth": 8,
    "rejectedThisMonth": 1
  },
  "budgetUsage": {
    "totalBudget": 50000.00,
    "usedBudget": 32500.00,
    "remainingBudget": 17500.00,
    "percentageUsed": 65.0
  },
  "recentActivity": [
    {
      "id": 1,
      "type": "TIMESHEET_APPROVED",
      "description": "Approved timesheet for John Doe - COMP3888",
      "timestamp": "2025-08-12T15:30:00Z"
    }
  ],
  "pendingItems": [
    {
      "id": 2,
      "type": "TIMESHEET_PENDING",
      "description": "Timesheet awaiting approval - Mary Johnson",
      "priority": "MEDIUM",
      "dueDate": "2025-08-15T23:59:59Z"
    }
  ]
}
```

## API Response Formats

### Success Responses

All successful API responses follow consistent patterns:

**Single Resource:**
```json
{
  "id": 1,
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2025-08-12T15:00:00Z",
  "updatedAt": "2025-08-12T15:00:00Z"
}
```

**Collection with Pagination:**
```json
{
  "content": [...],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 100,
    "totalPages": 5
  }
}
```

### Error Responses

All error responses follow the same structure:

```json
{
  "timestamp": "2025-08-12T15:30:00Z",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Hours must be between 0.1 and 60",
  "path": "/api/v1/timesheets",
  "details": {
    "field": "hours",
    "rejectedValue": -5,
    "constraint": "min=0.1,max=60"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT requests |
| `201` | Created | Successful POST requests |
| `204` | No Content | Successful DELETE requests |
| `400` | Bad Request | Invalid request data, validation errors |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | User lacks permissions for requested operation |
| `404` | Not Found | Requested resource doesn't exist |
| `409` | Conflict | Resource conflict (duplicate timesheet, etc.) |
| `422` | Unprocessable Entity | Business rule violation |
| `500` | Internal Server Error | Unexpected server error |

## Business Rules and Constraints

### Timesheet Validation Rules

| Field | Constraint | Error Message |
|-------|------------|---------------|
| `hours` | 0.1 ≤ hours ≤ 60 | "Hours must be between 0.1 and 60" |
| `hourlyRate` | > 0, ≤ 200 | "Hourly rate must be positive and not exceed $200" |
| `description` | 10-500 characters | "Description must be between 10 and 500 characters" |
| `weekStart` | Monday date, not future | "Week start must be a Monday and not in the future" |

### Approval Workflow Rules

| Current Status | Allowed Transitions | Required Role |
|----------------|-------------------|---------------|
| `DRAFT` | → `PENDING_TUTOR_REVIEW` | TUTOR (owner) |
| `PENDING_TUTOR_REVIEW` | → `APPROVED_BY_TUTOR` | TUTOR (owner) |
| `PENDING_TUTOR_REVIEW` | → `REJECTED` | LECTURER, ADMIN |
| `APPROVED_BY_TUTOR` | → `APPROVED_BY_LECTURER_AND_TUTOR` | LECTURER (course owner) |
| `APPROVED_BY_LECTURER_AND_TUTOR` | → `FINAL_APPROVED` | AUTO (system) |
| Any approval status | → `MODIFICATION_REQUESTED` | LECTURER, ADMIN |
| `MODIFICATION_REQUESTED` | → `DRAFT` | TUTOR (owner) |

### Permission Matrix

| Action | TUTOR | LECTURER | ADMIN |
|--------|-------|----------|-------|
| Create timesheet | Own only | Any tutor | Any tutor |
| View timesheet | Own only | Course tutors | All |
| Edit timesheet | Own (if DRAFT/MOD_REQ) | No | Any (if DRAFT/MOD_REQ) |
| Submit for approval | Own only | No | Any |
| Approve timesheet | Own (tutor-level) | Course tutors | All |
| Reject timesheet | No | Course tutors | All |
| View users | No | Course tutors | All |
| Create users | No | No | Yes |

## Integration Examples

### JavaScript/TypeScript Example

```typescript
interface TimesheetService {
  login(email: string, password: string): Promise<AuthResponse>;
  getTimesheets(filters?: TimesheetFilters): Promise<TimesheetPage>;
  createTimesheet(data: TimesheetCreateRequest): Promise<TimesheetResponse>;
  approveTimesheet(id: number, comments?: string): Promise<ApprovalResponse>;
}

class CatamsApiClient implements TimesheetService {
  private baseUrl = 'http://localhost:8084/api/v1';
  private token?: string;

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  async getTimesheets(filters?: TimesheetFilters): Promise<TimesheetPage> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.baseUrl}/timesheets?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch timesheets: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createTimesheet(data: TimesheetCreateRequest): Promise<TimesheetResponse> {
    const response = await fetch(`${this.baseUrl}/timesheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Timesheet creation failed: ${error.message}`);
    }
    
    return response.json();
  }
}
```

### cURL Examples

```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:8084/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lecturer@university.edu","password":"password123"}' \
  | jq -r '.token')

# Get all timesheets for current user
curl -X GET http://localhost:8084/api/v1/timesheets \
  -H "Authorization: Bearer $TOKEN"

# Create new timesheet
curl -X POST http://localhost:8084/api/v1/timesheets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": 101,
    "weekStart": "2025-08-11",
    "hours": 8.5,
    "hourlyRate": 45.00,
    "description": "Lab supervision and consultations"
  }'

# Approve timesheet
curl -X POST http://localhost:8084/api/v1/approvals/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"comments": "Approved - appropriate hours for described work"}'
```

## Rate Limiting and Usage Guidelines

### Rate Limits
- **Authentication**: 10 requests per minute per IP
- **API Endpoints**: 100 requests per minute per user
- **Bulk Operations**: 20 requests per minute per user

### Best Practices
- Cache authentication tokens (they're valid for 24 hours)
- Use pagination for large datasets
- Include appropriate error handling for all API calls
- Validate data client-side before sending to API
- Use appropriate HTTP methods (GET for reads, POST for creates, etc.)

## OpenAPI Specification

The complete OpenAPI specification is available at:
- **Development**: http://localhost:8084/v3/api-docs
- **Swagger UI**: http://localhost:8084/swagger-ui.html
- **YAML File**: [docs/openapi.yaml](openapi.yaml)

---

**API Version**: 1.0.0  
**Last Updated**: 2025-08-12  
**Maintainers**: Development Team  
**Support**: dev@catams.edu.au