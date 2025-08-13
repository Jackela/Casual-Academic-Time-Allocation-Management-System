# CATAMS User Guides

## Overview

CATAMS (Casual Academic Time Allocation Management System) supports three distinct user roles, each with specific workflows and responsibilities. This guide provides comprehensive instructions for all user types.

---

# 👨‍🎓 TUTOR Guide

## Getting Started as a Tutor

### Logging In
1. Navigate to the CATAMS application (provided by your administrator)
2. Enter your university email address and password
3. Click "Login" - you'll be redirected to your dashboard

### Your Dashboard Overview
The tutor dashboard displays:
- **My Timesheets**: Current week and recent submissions
- **Pending Actions**: Timesheets requiring your attention
- **Quick Stats**: Total hours this month, approval status
- **Recent Activity**: Latest updates on your submissions

## Managing Your Timesheets

### Creating a New Timesheet

1. **Navigate to Timesheets**
   - Click "Timesheets" in the main navigation
   - Click "Create New Timesheet" button

2. **Fill in Timesheet Details**
   ```
   Course: [Select from your assigned courses]
   Week Starting: [Select Monday of the work week]
   Hours Worked: [Enter between 0.1 and 60 hours]
   Hourly Rate: [Usually pre-filled, verify amount]
   Description: [Detailed description of work performed]
   ```

3. **Description Best Practices**
   - Be specific about activities (e.g., "Tutorial preparation: 2 hours, Tutorial delivery: 3 hours, Student consultations: 1.5 hours")
   - Include any special circumstances or additional responsibilities
   - Minimum 10 characters, maximum 500 characters

4. **Save as Draft**
   - Click "Save Draft" to save your progress
   - Drafts can be edited multiple times before submission

### Submitting a Timesheet for Approval

1. **Review Your Draft**
   - Ensure all information is accurate
   - Double-check hours and description
   - Verify the correct course and week

2. **Submit for Approval**
   - Click "Submit for Approval"
   - Status changes to "Pending Tutor Review"
   - You can still self-approve at this stage

3. **Self-Approval Process**
   - Click "Approve" on your submitted timesheet
   - Add optional comments about your work
   - Status changes to "Approved by Tutor"
   - Timesheet is now sent to lecturer for final approval

### Editing Timesheets

**When You Can Edit:**
- ✅ Status: "Draft" - Full editing capability
- ✅ Status: "Modification Requested" - Edit and resubmit
- ❌ Status: "Pending Review" or "Approved" - No editing allowed

**How to Edit:**
1. Find the timesheet in your list
2. Click "Edit" button (only visible when allowed)
3. Make necessary changes
4. Save draft or resubmit for approval

### Understanding Timesheet Status

| Status | What It Means | Your Next Action |
|--------|---------------|-----------------|
| **Draft** | Timesheet saved but not submitted | Submit for approval when ready |
| **Pending Tutor Review** | Submitted, awaiting your approval | Self-approve or edit if needed |
| **Approved by Tutor** | You've approved, sent to lecturer | Wait for lecturer approval |
| **Approved by Lecturer and Tutor** | Lecturer approved | Automatically moves to Final Approved |
| **Final Approved** | Fully approved, processed for payment | No action needed ✅ |
| **Modification Requested** | Changes requested | Edit timesheet and resubmit |
| **Rejected** | Not approved | Create new timesheet if appropriate |

### Common Tutor Tasks

**Weekly Routine:**
1. ✅ Create timesheet for completed work week
2. ✅ Review and submit previous week's draft
3. ✅ Self-approve submitted timesheets
4. ✅ Check for any modification requests

**Monthly Review:**
1. ✅ Review all approved timesheets for accuracy
2. ✅ Check payment processing status
3. ✅ Update any recurring course information

---

# 👩‍🏫 LECTURER Guide

## Getting Started as a Lecturer

### Your Role and Responsibilities
As a lecturer, you're responsible for:
- Approving timesheets for tutors in your courses
- Monitoring budget usage for your courses
- Ensuring appropriate work allocation
- Managing tutor permissions for your courses

### Dashboard Overview
The lecturer dashboard shows:
- **Pending Approvals**: Timesheets requiring your approval
- **Course Overview**: Budget usage and tutor assignments
- **Recent Activity**: Latest approvals and submissions
- **Budget Monitoring**: Spending vs. allocated budget

## Managing Timesheet Approvals

### Reviewing Timesheets

1. **Access Pending Approvals**
   - Dashboard shows count of pending items
   - Click "Pending Approvals" or navigate to "Timesheets"
   - Filter by "Pending My Approval"

2. **Review Timesheet Details**
   ```
   Information to Verify:
   ✓ Hours are reasonable for described work
   ✓ Hourly rate matches course allocation
   ✓ Work description is detailed and appropriate
   ✓ Week corresponds to actual teaching period
   ✓ Tutor is authorized for this course
   ```

3. **Check Work Description**
   - Look for specific activities (tutorials, consultations, preparation)
   - Verify hours align with expected workload
   - Check for any unusual or excessive hours

### Approval Actions

#### Approving a Timesheet
1. Click "Approve" on the timesheet
2. **Optional**: Add comments explaining approval
   - Example: "Approved - hours appropriate for tutorial delivery and preparation"
3. Click "Confirm Approval"
4. Status updates to "Approved by Lecturer and Tutor"

#### Requesting Modifications
1. Click "Request Modifications" 
2. **Required**: Provide specific feedback
   - Example: "Please break down the 8 hours into specific activities (preparation, delivery, consultation)"
3. Click "Send Modification Request"
4. Tutor receives notification and can edit the timesheet

#### Rejecting a Timesheet
1. Click "Reject" (use sparingly)
2. **Required**: Provide detailed explanation
   - Example: "Hours exceed what was discussed for this tutorial slot. Please review and create new timesheet with accurate hours."
3. Click "Confirm Rejection"
4. Tutor must create a new timesheet if work was actually performed

### Managing Your Courses

#### Viewing Course Budget
1. Navigate to "Courses" or "Budget Management"
2. Select your course
3. View budget allocation and spending:
   ```
   Budget Overview:
   - Total Allocated: $50,000
   - Currently Used: $32,500 (65%)
   - Remaining: $17,500
   - Projected to End of Semester: $48,000
   ```

#### Monitoring Tutor Activity
1. Go to course details
2. View "Assigned Tutors" section
3. See each tutor's:
   - Hours worked this month
   - Average weekly hours
   - Pending submissions
   - Payment status

### Best Practices for Lecturers

**Regular Review Schedule:**
- ✅ **Daily**: Check for urgent pending approvals
- ✅ **Weekly**: Review all submitted timesheets
- ✅ **Monthly**: Monitor budget usage and projections
- ✅ **Semester**: Review tutor allocations and performance

**Quality Assurance:**
- ✅ Compare tutor hours across similar tutorial slots
- ✅ Verify work descriptions match actual course activities  
- ✅ Monitor for any unusual patterns in submissions
- ✅ Ensure timesheets align with semester schedule

**Communication Guidelines:**
- ✅ Provide constructive feedback in comments
- ✅ Respond to tutor questions promptly
- ✅ Use modification requests rather than rejection when possible
- ✅ Keep detailed records of any concerns or issues

---

# 👨‍💼 ADMIN Guide

## Getting Started as an Administrator

### Administrative Responsibilities
As an admin, you have complete system access including:
- Managing all users (tutors, lecturers, admins)
- Overseeing all timesheets and approvals across the system
- Configuring system settings and business rules
- Final approval authority for complex cases
- Generating reports and analytics
- Managing courses and assignments

### Admin Dashboard
Your dashboard provides system-wide visibility:
- **System Overview**: Total users, active timesheets, pending approvals
- **Budget Analytics**: University-wide budget usage and projections  
- **User Activity**: Recent logins, submissions, and issues
- **System Health**: Performance metrics and alerts

## User Management

### Creating New Users

1. **Navigate to User Management**
   - Click "Users" in admin navigation
   - Click "Create New User" button

2. **Enter User Details**
   ```
   Required Information:
   - Full Name: [Dr. Jane Smith]
   - Email: [jane.smith@university.edu] 
   - Role: [TUTOR/LECTURER/ADMIN]
   - Initial Password: [Auto-generated or custom]
   ```

3. **Set Role Permissions**
   - **TUTOR**: Can manage own timesheets only
   - **LECTURER**: Can approve timesheets for assigned courses
   - **ADMIN**: Full system access

4. **Course Assignments** (for Tutors/Lecturers)
   - Select courses from available list
   - Set hourly rates if different from default
   - Configure access periods

### Managing Existing Users

#### Updating User Information
1. Find user in the user list
2. Click "Edit" next to their name
3. Update necessary fields:
   - Contact information
   - Role (with caution - affects permissions)
   - Course assignments
   - Active/inactive status

#### Resetting Passwords
1. Go to user's profile
2. Click "Reset Password"
3. Choose method:
   - Generate temporary password (email to user)
   - Set specific password manually
   - Send password reset link

#### Deactivating Users
1. Edit user profile
2. Change status to "Inactive"
3. User loses access but historical data is preserved
4. Can be reactivated at any time

## System-Wide Timesheet Management

### Monitoring All Timesheets

1. **Access Global Timesheet View**
   - Navigate to "All Timesheets"
   - Use advanced filters:
     ```
     Filter Options:
     - Status: [Any/Pending/Approved/Rejected]
     - Course: [Specific course or all]
     - Date Range: [Custom date range]
     - Tutor: [Specific tutor or all]
     - Lecturer: [Specific lecturer or all]
     ```

### Handling Complex Approval Cases

#### Escalated Approvals
- Some timesheets may require admin approval after lecturer approval
- Look for status "Pending Admin Approval"
- Review carefully for policy compliance and unusual circumstances

#### Resolving Disputes
1. **Investigation Process**:
   - Review complete approval history
   - Check comments from all parties
   - Examine similar timesheets for consistency
   - Contact involved parties if needed

2. **Resolution Actions**:
   - Override previous decisions if justified
   - Add detailed admin comments explaining resolution
   - Update policies if systematic issue identified

### Course and System Configuration

#### Managing Courses

1. **Create New Course**
   ```
   Course Setup:
   - Course Code: [COMP3888]
   - Course Name: [Computer Science Capstone]
   - Budget Allocation: [$50,000]
   - Semester: [2025 Semester 2]
   - Assigned Lecturer: [Dr. Jane Smith]
   ```

2. **Configure Course Settings**
   - Default hourly rates by activity type
   - Maximum hours per week per tutor
   - Approval workflow (standard or custom)
   - Budget alerts and thresholds

#### System Configuration

1. **Business Rules Settings**
   ```
   Validation Rules:
   - Maximum hours per timesheet: [60]
   - Maximum hourly rate: [$200]
   - Future timesheet restriction: [Disabled/Enabled]
   - Duplicate timesheet prevention: [Enabled]
   ```

2. **Approval Workflow Configuration**
   - Standard workflow: Tutor → Lecturer → Final
   - Custom workflows for specific courses
   - Escalation rules and thresholds

## Reporting and Analytics

### Standard Reports

#### Financial Reports
1. **Budget Usage Report**
   - University-wide spending
   - By college/department/course
   - Projected vs. actual spending
   - Export to Excel/PDF

2. **Payment Processing Report**
   - Approved timesheets ready for payroll
   - Payment amounts by tutor
   - Historical payment data

#### Operational Reports
1. **User Activity Report**
   - Login patterns and frequency
   - Timesheet submission patterns
   - System usage statistics

2. **Performance Metrics**
   - Average approval times
   - Rejection rates by lecturer/course
   - System response times and uptime

### Custom Analytics

#### Creating Custom Reports
1. Navigate to "Reports & Analytics"
2. Click "Create Custom Report"
3. Select data sources and metrics
4. Configure filters and groupings
5. Set up automated email delivery if needed

#### Dashboard Widgets
- Configure admin dashboard with relevant metrics
- Add system health monitoring widgets
- Set up alerts for critical issues

## Advanced Administration

### System Maintenance

#### Database Management
- Monitor system performance
- Review and archive old data
- Manage backup and recovery procedures
- Optimize database queries and indexes

#### Security Management
1. **User Access Reviews**
   - Quarterly review of user permissions
   - Remove inactive users
   - Audit admin access logs

2. **System Security**
   - Monitor failed login attempts
   - Review API access patterns
   - Update security configurations

### Integration Management

#### External System Integration
- HR/Payroll system synchronization
- Student Information System integration
- Financial system data exchange
- Academic calendar synchronization

#### API and Service Management
- Monitor API usage and performance
- Manage service integrations
- Review and approve API access requests

### Emergency Procedures

#### System Issues
1. **Immediate Response**:
   - Assess impact and affected users
   - Communicate with stakeholders
   - Implement temporary workarounds if possible

2. **Resolution Process**:
   - Work with IT support for system issues
   - Document incidents and resolutions
   - Update procedures based on lessons learned

#### Data Issues
1. **Data Correction Process**:
   - Verify data integrity issues
   - Create backup before making changes
   - Implement corrections with audit trail
   - Notify affected users of changes

---

# 📞 Support and Help

## Getting Help

### Contact Information
- **Technical Support**: it-support@university.edu
- **System Administration**: catams-admin@university.edu  
- **User Training**: training@university.edu

### Self-Help Resources
1. **In-Application Help**: Click "?" icon in any screen
2. **Video Tutorials**: Available in Help section
3. **FAQ Section**: Common questions and answers
4. **User Forums**: Community-driven support

## Common Issues and Solutions

### Login Problems
**Problem**: Cannot log in with correct credentials
**Solutions**:
1. Clear browser cache and cookies
2. Try different browser or incognito mode
3. Reset password using "Forgot Password" link
4. Contact IT support if issue persists

### Timesheet Issues
**Problem**: Cannot submit timesheet
**Solutions**:
1. Check all required fields are completed
2. Verify hours are within allowed range (0.1-60)
3. Ensure description meets minimum length (10 characters)
4. Contact your lecturer if course assignment is missing

### Approval Issues  
**Problem**: Timesheet stuck in approval process
**Solutions**:
1. Check with appropriate approver (lecturer or admin)
2. Verify timesheet contains sufficient detail
3. Contact system admin if approver is unavailable
4. Use "Request Status Update" feature

### Performance Issues
**Problem**: System running slowly
**Solutions**:
1. Check internet connection
2. Close other browser tabs/applications
3. Try different browser
4. Contact IT support during peak usage times

---

**User Guide Version**: 1.0  
**Last Updated**: 2025-08-12  
**Next Review**: 2025-09-12  
**Feedback**: Send suggestions to catams-admin@university.edu