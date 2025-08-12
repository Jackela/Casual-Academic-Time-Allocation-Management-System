# 📋 API Documentation Update - Authorization & Dual Approval Workflow

## Authorization Framework Overview

### TimesheetPermissionPolicy Integration

All API endpoints now utilize the **Strategy Pattern** with `TimesheetPermissionPolicy` for consistent authorization:

```yaml
# Authorization Decision Flow
Request → Authentication → TimesheetPermissionPolicy → Business Logic → Response

# Policy-Based Authorization
TimesheetPermissionPolicy:
  interface: 14 permission methods covering all timesheet operations
  implementation: DefaultTimesheetPermissionPolicy (role-based)
  extensible: LDAP, OAuth, or custom authorization strategies
  principles: SOLID compliant (SRP, OCP, LSP, ISP, DIP)
```

### Authorization Coverage by Operation Type

| Operation Type | Permission Methods | Roles Supported | Status-Aware |
|---------------|-------------------|----------------|--------------|
| **Creation** | `canCreateTimesheet()`, `canCreateTimesheetFor()` | ADMIN, LECTURER | ✅ |
| **Read** | `canViewTimesheet()`, `canViewTimesheetsByFilters()` | ADMIN, LECTURER, TUTOR | ✅ |
| **Modification** | `canEditTimesheet()`, `canDeleteTimesheet()` | ADMIN, LECTURER, TUTOR | ✅ |
| **Approval Queue** | `canViewPendingApprovalQueue()`, `canViewLecturerFinalApprovalQueue()` | Role-specific | ✅ |

---

## New Approval Status Values

### Enhanced ApprovalStatus Enum

```yaml
# Updated ApprovalStatus schema
ApprovalStatus:
  type: string
  enum:
    - DRAFT
    - PENDING_TUTOR_REVIEW
    - TUTOR_APPROVED           # 🏷️ DEPRECATED - Legacy workflow
    - PENDING_HR_REVIEW        # 🏷️ DEPRECATED - Legacy workflow  
    - APPROVED_BY_TUTOR        # ✨ NEW - Enhanced workflow
    - APPROVED_BY_LECTURER_AND_TUTOR  # ✨ NEW - Enhanced workflow
    - HR_APPROVED
    - FINAL_APPROVED
    - REJECTED
    - MODIFICATION_REQUESTED
  description: |
    Timesheet approval status with dual workflow support:
    
    **Legacy Workflow** (Deprecated but functional):
    DRAFT → PENDING_TUTOR_REVIEW → TUTOR_APPROVED → PENDING_HR_REVIEW → HR_APPROVED
    
    **Enhanced Workflow** (Recommended):
    DRAFT → PENDING_TUTOR_REVIEW → APPROVED_BY_TUTOR → APPROVED_BY_LECTURER_AND_TUTOR → FINAL_APPROVED
    
  example: "APPROVED_BY_LECTURER_AND_TUTOR"
```

## Updated API Endpoints

### Authorization Headers Required

All endpoints require authentication and authorization validation:

```yaml
# Required Headers
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

# Authorization Validation Process
1. JWT token validation → User identification
2. TimesheetPermissionPolicy.canPerformOperation() → Authorization decision  
3. ApprovalStateMachine validation → Workflow compliance
4. Business logic execution → Response generation
```

### 1. Timesheet Approval Endpoint

```yaml
/api/timesheets/{id}/approve:
  post:
    summary: Approve or reject a timesheet
    description: |
      Performs approval actions on timesheets with dual workflow support.
      
      **Authorization Requirements**:
      - JWT token authentication required
      - TimesheetPermissionPolicy validation for modification rights
      - ApprovalStateMachine validation for workflow compliance
      - Role-based access control with hierarchical permissions
      
      **Authorization Matrix by Role**:
      
      **ADMIN**: Can perform all approval actions on any timesheet
      **LECTURER**: Can approve/reject timesheets for courses they teach (FINAL_APPROVAL action)
      **TUTOR**: Can approve/reject only their own timesheets (APPROVE action from PENDING_TUTOR_REVIEW)
      **HR**: Can perform HR-level approvals (HR_APPROVE/HR_REJECT actions)
      
      **Workflow Transitions**:
      
      **From PENDING_TUTOR_REVIEW**:
      - APPROVE → APPROVED_BY_TUTOR (new workflow) OR TUTOR_APPROVED (legacy)
      - REJECT → REJECTED
      - REQUEST_MODIFICATION → MODIFICATION_REQUESTED
      - *Authorization*: TUTOR (own timesheets) or ADMIN
      
      **From APPROVED_BY_TUTOR** (New):
      - FINAL_APPROVAL → APPROVED_BY_LECTURER_AND_TUTOR (lecturer action)
      - REJECT → REJECTED
      - *Authorization*: LECTURER (course authority) or ADMIN
      
      **From APPROVED_BY_LECTURER_AND_TUTOR** (New):
      - HR_APPROVE → FINAL_APPROVED (HR final approval)
      - HR_REJECT → REJECTED
      - *Authorization*: HR or ADMIN
      
      **From PENDING_HR_REVIEW** (Legacy):
      - APPROVE → HR_APPROVED
      - REJECT → REJECTED
      - *Authorization*: HR or ADMIN
      
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
        description: Timesheet ID
        
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApprovalActionRequest'
          examples:
            tutor_approval:
              summary: Tutor approves timesheet (new workflow)
              value:
                action: "APPROVE"
                comment: "Hours and details look accurate"
            lecturer_final_approval:
              summary: Lecturer gives final approval
              value:
                action: "FINAL_APPROVAL" 
                comment: "Course requirements met, approved for payment"
            hr_final_approval:
              summary: HR gives final approval
              value:
                action: "HR_APPROVE"
                comment: "Budget verified, approved for payroll processing"
                
    responses:
      200:
        description: Approval action completed successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApprovalActionResponse'
            examples:
              new_workflow_approval:
                summary: Successful new workflow approval
                value:
                  success: true
                  message: "Timesheet approved by tutor"
                  newStatus: "APPROVED_BY_TUTOR"
                  nextActions: ["FINAL_APPROVAL", "REJECT", "REQUEST_MODIFICATION"]
                  nextApprovers: ["LECTURER"]
      400:
        description: Invalid approval action for current status
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              error: "INVALID_TRANSITION"
              message: "Cannot perform APPROVE action from FINAL_APPROVED status"
      401:
        description: Authentication required
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              error: "AUTHENTICATION_REQUIRED"
              message: "Valid JWT token required for authorization"
      403:
        description: Authorization failed - insufficient permissions
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            examples:
              role_authorization_failed:
                summary: User role lacks permission
                value:
                  error: "AUTHORIZATION_FAILED"
                  message: "User role TUTOR cannot perform FINAL_APPROVAL action"
                  details: "Only LECTURER or ADMIN roles can perform this action"
              ownership_authorization_failed:
                summary: User lacks ownership/authority
                value:
                  error: "AUTHORIZATION_FAILED"  
                  message: "User cannot approve timesheet for different tutor"
                  details: "TUTOR users can only approve their own timesheets"
              course_authority_failed:
                summary: User lacks course authority
                value:
                  error: "AUTHORIZATION_FAILED"
                  message: "LECTURER does not have authority over this course"
                  details: "LECTURER can only approve timesheets for courses they teach"
```

### 2. Pending Timesheets Endpoint Enhancement

```yaml
/api/timesheets/pending-approval:
  get:
    summary: Get timesheets pending approval for current user
    description: |
      Returns timesheets requiring approval based on user role and workflow status.
      Uses TimesheetPermissionPolicy for authorization filtering.
      
      **Authorization Logic**:
      - ADMIN: Can view all pending timesheets across all workflows
      - HR: Limited to HR-level approvals (PENDING_HR_REVIEW, APPROVED_BY_LECTURER_AND_TUTOR)
      - LECTURER: Limited to lecturer approvals for courses they teach (APPROVED_BY_TUTOR status)
      - TUTOR: Limited to their own timesheets requiring review (PENDING_TUTOR_REVIEW)
      
      **Authorization Method**: `canViewPendingApprovalQueue(User requester)` and `canViewLecturerFinalApprovalQueue(User requester)`
      
      **Role-Specific Results**:
      
      **For HR Users** (canViewPendingApprovalQueue = true):
      - PENDING_HR_REVIEW (legacy workflow)
      - APPROVED_BY_LECTURER_AND_TUTOR (new workflow)
      
      **For LECTURER Users** (canViewLecturerFinalApprovalQueue = true):
      - APPROVED_BY_TUTOR (waiting for lecturer final approval)
      - Filtered by course authority: only timesheets for courses they teach
      
      **For TUTOR Users** (canViewPendingApprovalQueue = true):
      - PENDING_TUTOR_REVIEW (waiting for tutor review)
      - Filtered by ownership: only their own timesheets
      
    parameters:
      - name: workflow
        in: query
        required: false
        schema:
          type: string
          enum: ["legacy", "enhanced", "all"]
          default: "all"
        description: Filter by workflow type
        
    responses:
      200:
        description: List of pending timesheets
        content:
          application/json:
            schema:
              type: object
              properties:
                timesheets:
                  type: array
                  items:
                    $ref: '#/components/schemas/TimesheetResponse'
                workflowStats:
                  type: object
                  properties:
                    legacyWorkflow:
                      type: integer
                      description: Count of timesheets in legacy workflow
                    enhancedWorkflow:
                      type: integer  
                      description: Count of timesheets in enhanced workflow
                    total:
                      type: integer
            example:
              timesheets:
                - id: 123
                  status: "APPROVED_BY_TUTOR"
                  workflowType: "enhanced"
                  nextActions: ["FINAL_APPROVAL", "REJECT"]
                - id: 124
                  status: "PENDING_HR_REVIEW" 
                  workflowType: "legacy"
                  nextActions: ["APPROVE", "REJECT"]
              workflowStats:
                legacyWorkflow: 15
                enhancedWorkflow: 8
                total: 23
```

## Updated Response Schemas

### Enhanced ApprovalActionResponse

```yaml
ApprovalActionResponse:
  type: object
  properties:
    success:
      type: boolean
      description: Whether the approval action was successful
    message:
      type: string
      description: Human-readable result message
    newStatus:
      $ref: '#/components/schemas/ApprovalStatus'
      description: Updated approval status after action
    workflowType:
      type: string
      enum: ["legacy", "enhanced"]
      description: Which workflow path this timesheet is following
    nextActions:
      type: array
      items:
        $ref: '#/components/schemas/ApprovalAction'
      description: Available actions for next step
    nextApprovers:
      type: array
      items:
        type: string
        enum: ["TUTOR", "LECTURER", "HR", "ADMIN"]
      description: Roles that can perform next approval actions
    estimatedCompletionTime:
      type: string
      format: date-time
      description: Estimated workflow completion (based on historical data)
  required:
    - success
    - message
    - newStatus
    - workflowType
  example:
    success: true
    message: "Timesheet approved by tutor, awaiting lecturer final approval"
    newStatus: "APPROVED_BY_TUTOR"
    workflowType: "enhanced"
    nextActions: ["FINAL_APPROVAL", "REJECT", "REQUEST_MODIFICATION"]
    nextApprovers: ["LECTURER", "ADMIN"]
    estimatedCompletionTime: "2024-01-15T14:30:00Z"
```

## Migration Guide for Frontend Teams

### 1. Status Display Updates

```javascript
// Updated status display mapping
const STATUS_DISPLAY = {
  'DRAFT': 'Draft',
  'PENDING_TUTOR_REVIEW': 'Pending Tutor Review',
  'TUTOR_APPROVED': 'Tutor Approved (Legacy)', // Show legacy indicator
  'PENDING_HR_REVIEW': 'Pending HR Review (Legacy)', // Show legacy indicator
  'APPROVED_BY_TUTOR': 'Approved by Tutor',
  'APPROVED_BY_LECTURER_AND_TUTOR': 'Approved by Lecturer & Tutor',
  'HR_APPROVED': 'HR Approved',
  'FINAL_APPROVED': 'Final Approved',
  'REJECTED': 'Rejected',
  'MODIFICATION_REQUESTED': 'Modification Requested'
};

// Workflow type detection
function getWorkflowType(status) {
  const LEGACY_STATUSES = ['TUTOR_APPROVED', 'PENDING_HR_REVIEW'];
  const ENHANCED_STATUSES = ['APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR'];
  
  if (LEGACY_STATUSES.includes(status)) return 'legacy';
  if (ENHANCED_STATUSES.includes(status)) return 'enhanced';
  return 'common';
}
```

### 2. Action Button Updates

```javascript
// Updated action availability logic
function getAvailableActions(timesheet, userRole) {
  const { status } = timesheet;
  const workflowType = getWorkflowType(status);
  
  switch (status) {
    case 'PENDING_TUTOR_REVIEW':
      if (userRole === 'TUTOR' || userRole === 'ADMIN') {
        return ['APPROVE', 'REJECT', 'REQUEST_MODIFICATION'];
      }
      break;
      
    case 'APPROVED_BY_TUTOR': // New workflow
      if (userRole === 'LECTURER' || userRole === 'ADMIN') {
        return ['FINAL_APPROVAL', 'REJECT', 'REQUEST_MODIFICATION'];
      }
      break;
      
    case 'APPROVED_BY_LECTURER_AND_TUTOR': // New workflow
      if (userRole === 'HR' || userRole === 'ADMIN') {
        return ['HR_APPROVE', 'HR_REJECT', 'REQUEST_MODIFICATION'];
      }
      break;
      
    case 'PENDING_HR_REVIEW': // Legacy workflow
      if (userRole === 'HR' || userRole === 'ADMIN') {
        return ['APPROVE', 'REJECT', 'REQUEST_MODIFICATION'];
      }
      break;
  }
  
  return [];
}
```

### 3. Dashboard Updates

```javascript
// Enhanced dashboard queries
const DASHBOARD_QUERIES = {
  // Count by workflow type
  workflowStats: `
    SELECT 
      workflow_type,
      status,
      COUNT(*) as count
    FROM timesheets 
    WHERE status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR', 
                     'TUTOR_APPROVED', 'PENDING_HR_REVIEW')
    GROUP BY workflow_type, status
  `,
  
  // Pending items with workflow context
  pendingItems: `
    SELECT t.*, 
      CASE 
        WHEN t.status IN ('TUTOR_APPROVED', 'PENDING_HR_REVIEW') THEN 'legacy'
        WHEN t.status IN ('APPROVED_BY_TUTOR', 'APPROVED_BY_LECTURER_AND_TUTOR') THEN 'enhanced'
        ELSE 'common'
      END as workflow_type
    FROM timesheets t 
    WHERE t.status IN (${PENDING_STATUSES.join(',')})
  `
};
```

## Backward Compatibility Guarantees

### 1. **API Compatibility**: ✅ Guaranteed
- All existing API endpoints continue to work
- Legacy enum values remain functional
- No breaking changes to request/response schemas

### 2. **Database Compatibility**: ✅ Guaranteed  
- Existing database records unchanged
- Legacy enum string values still valid
- No migration required for existing data

### 3. **Client Integration**: ✅ Graceful Migration
- Frontend can migrate gradually
- Both workflows supported simultaneously  
- Clear indicators for workflow type

## Authorization Framework Integration

### TimesheetPermissionPolicy Implementation

All API endpoints now use the **TimesheetPermissionPolicy** for consistent authorization enforcement:

```java
// Example: Approval endpoint authorization flow
@PostMapping("/api/timesheets/{id}/approve")
public ResponseEntity<ApprovalActionResponse> approveTimesheet(
    @PathVariable Long id, 
    @RequestBody ApprovalActionRequest request,
    Authentication authentication) {
    
    User user = getCurrentUser(authentication);
    Timesheet timesheet = timesheetService.getById(id);
    Course course = courseService.getById(timesheet.getCourseId());
    
    // Authorization via TimesheetPermissionPolicy
    if (!permissionPolicy.canModifyTimesheet(user, timesheet, course)) {
        throw new SecurityException("User not authorized to approve this timesheet");
    }
    
    // Workflow validation via ApprovalStateMachine
    if (!approvalStateMachine.canPerformAction(request.getAction(), user.getRole(), timesheet.getStatus())) {
        throw new IllegalStateException("Invalid workflow transition");
    }
    
    // Business logic execution
    return timesheetService.approveTimesheet(id, request, user);
}
```

### Authorization Policy Methods by Endpoint

| API Endpoint | Primary Authorization Method | Secondary Validation |
|--------------|----------------------------|---------------------|
| `POST /api/timesheets/{id}/approve` | `canModifyTimesheet()` | ApprovalStateMachine |
| `GET /api/timesheets/pending-approval` | `canViewPendingApprovalQueue()` | Role-specific filtering |
| `GET /api/timesheets/lecturer-final-approval` | `canViewLecturerFinalApprovalQueue()` | Course authority check |
| `POST /api/timesheets` | `canCreateTimesheetFor()` | Business rule validation |
| `PUT /api/timesheets/{id}` | `canEditTimesheet()` | Status-based validation |
| `DELETE /api/timesheets/{id}` | `canDeleteTimesheet()` | Status-based validation |
| `GET /api/timesheets/{id}` | `canViewTimesheet()` | Ownership/authority check |
| `GET /api/timesheets` | `canViewTimesheetsByFilters()` | Multi-criteria filtering |

### Authorization Error Handling

All endpoints return consistent error responses for authorization failures:

```yaml
# Standard Authorization Error Response
AuthorizationError:
  type: object
  properties:
    error:
      type: string
      enum: ["AUTHENTICATION_REQUIRED", "AUTHORIZATION_FAILED", "INVALID_TRANSITION"]
    message:
      type: string
      description: Human-readable error message
    details:
      type: string
      description: Specific authorization failure reason
    timestamp:
      type: string
      format: date-time
    path:
      type: string
      description: API endpoint path
  example:
    error: "AUTHORIZATION_FAILED"
    message: "User role TUTOR cannot perform FINAL_APPROVAL action"
    details: "Only LECTURER or ADMIN roles can perform lecturer-level approvals"
    timestamp: "2025-08-12T10:30:00Z"
    path: "/api/timesheets/123/approve"
```

### Security Features

#### Multi-Layer Authorization
1. **JWT Authentication**: Token validation and user identification
2. **Role-Based Access Control**: User role verification (ADMIN, LECTURER, TUTOR, HR)
3. **Resource Ownership**: Ownership and authority validation
4. **Status-Based Permissions**: Workflow state-aware authorization
5. **Business Rule Integration**: Domain-specific authorization logic

#### Authorization Patterns Implemented
- **Hierarchical Permissions**: ADMIN > LECTURER > TUTOR
- **Ownership-Based Access**: Users can modify their own resources
- **Resource-Based Authority**: Authority over specific courses
- **Status-Dependent Permissions**: Different permissions based on timesheet status

#### Extensibility
The Strategy Pattern implementation allows for future authorization enhancements:

```java
// Example: Future LDAP integration
@Component
@ConditionalOnProperty("auth.provider=ldap")
public class LdapTimesheetPermissionPolicy implements TimesheetPermissionPolicy {
    
    @Override
    public boolean canCreateTimesheetFor(User creator, User tutor, Course course) {
        return ldapService.hasPermission(creator.getEmail(), "timesheet:create") &&
               ldapService.hasAuthorityOver(creator.getEmail(), course.getCourseCode());
    }
    
    // ... other methods
}
```

---

**This API update provides complete dual-workflow support with comprehensive authorization framework integration while maintaining 100% backward compatibility for existing integrations.**