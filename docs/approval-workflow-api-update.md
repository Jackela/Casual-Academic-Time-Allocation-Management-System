# 📋 API Documentation Update - Dual Approval Workflow

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

### 1. Timesheet Approval Endpoint

```yaml
/api/timesheets/{id}/approve:
  post:
    summary: Approve or reject a timesheet
    description: |
      Performs approval actions on timesheets with dual workflow support.
      
      **Workflow Transitions**:
      
      **From PENDING_TUTOR_REVIEW**:
      - APPROVE → APPROVED_BY_TUTOR (new workflow) OR TUTOR_APPROVED (legacy)
      - REJECT → REJECTED
      - REQUEST_MODIFICATION → MODIFICATION_REQUESTED
      
      **From APPROVED_BY_TUTOR** (New):
      - FINAL_APPROVAL → APPROVED_BY_LECTURER_AND_TUTOR (lecturer action)
      - REJECT → REJECTED
      
      **From APPROVED_BY_LECTURER_AND_TUTOR** (New):
      - HR_APPROVE → FINAL_APPROVED (HR final approval)
      - HR_REJECT → REJECTED
      
      **From PENDING_HR_REVIEW** (Legacy):
      - APPROVE → HR_APPROVED
      - REJECT → REJECTED
      
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
```

### 2. Pending Timesheets Endpoint Enhancement

```yaml
/api/timesheets/pending-approval:
  get:
    summary: Get timesheets pending approval for current user
    description: |
      Returns timesheets requiring approval based on user role and workflow status.
      
      **For HR Users**: Returns timesheets with status:
      - PENDING_HR_REVIEW (legacy workflow)
      - APPROVED_BY_LECTURER_AND_TUTOR (new workflow)
      
      **For LECTURER Users**: Returns timesheets with status:
      - APPROVED_BY_TUTOR (waiting for lecturer final approval)
      
      **For TUTOR Users**: Returns timesheets with status:
      - PENDING_TUTOR_REVIEW (waiting for tutor review)
      
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

---

**This API update provides complete dual-workflow support while maintaining 100% backward compatibility for existing integrations.**