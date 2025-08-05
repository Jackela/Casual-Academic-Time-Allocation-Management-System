package com.usyd.catams.service.impl;

import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.repository.ApprovalRepository;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.ApprovalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of ApprovalService with comprehensive business rule validation.
 * 
 * This service enforces all CATAMS business rules for timesheet approval workflow
 * including role-based access control, status transition validation, and audit trail management.
 */
@Service
@Transactional
public class ApprovalServiceImpl implements ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;

    @Autowired
    public ApprovalServiceImpl(ApprovalRepository approvalRepository,
                              TimesheetRepository timesheetRepository,
                              UserRepository userRepository,
                              CourseRepository courseRepository) {
        this.approvalRepository = approvalRepository;
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @Override
    public Approval submitForApproval(Long timesheetId, String comment, Long requesterId) {
        return performApprovalAction(timesheetId, ApprovalAction.SUBMIT_FOR_APPROVAL, comment, requesterId);
    }

    @Override
    public Approval performApprovalAction(Long timesheetId, ApprovalAction action, String comment, Long requesterId) {
        
        // 1. Validate timesheet exists
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        // 2. Validate user can perform this action
        validateApprovalAction(timesheet, action, requesterId);

        // 3. Get current status and calculate target status
        ApprovalStatus currentStatus = timesheet.getStatus();
        ApprovalStatus targetStatus = action.getTargetStatus(currentStatus);

        // 4. Create approval record for the primary action
        Approval approval = new Approval(timesheetId, requesterId, action, currentStatus, targetStatus, comment);
        
        // Validate the approval record
        approval.validateBusinessRules();

        // 5. Update timesheet status to the target status
        timesheet.setStatus(targetStatus);
        timesheetRepository.save(timesheet);

        // 6. Save the primary approval record
        Approval savedApproval = approvalRepository.save(approval);

        // 7. Handle auto-transition from APPROVED to PENDING_HR_REVIEW (Story 2.1 requirement)
        if (targetStatus == ApprovalStatus.APPROVED) {
            // Auto-transition to PENDING_HR_REVIEW within the same transaction
            ApprovalStatus hrReviewStatus = ApprovalStatus.PENDING_HR_REVIEW;
            
            // Create auto-transition approval record
            Approval autoTransitionApproval = new Approval(
                timesheetId, 
                requesterId, // Same user who approved triggers the auto-transition
                ApprovalAction.APPROVE, // Internal system action
                ApprovalStatus.APPROVED,
                hrReviewStatus,
                "Auto-transition to HR review after lecturer approval"
            );
            
            // Update timesheet to HR review status
            timesheet.setStatus(hrReviewStatus);
            timesheetRepository.save(timesheet);
            
            // Save auto-transition approval record
            approvalRepository.save(autoTransitionApproval);
        }

        return savedApproval;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Approval> getApprovalHistory(Long timesheetId, Long requesterId) {
        
        // Validate timesheet exists and user has access
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + timesheetId));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Apply access control - similar to timesheet viewing permissions
        if (!canUserViewTimesheet(timesheet, requester)) {
            throw new SecurityException("User does not have permission to view approval history for this timesheet");
        }

        return approvalRepository.findByTimesheetIdOrderByTimestampAsc(timesheetId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Timesheet> getPendingApprovalsForUser(Long approverId) {
        
        User approver = userRepository.findById(approverId)
            .orElseThrow(() -> new IllegalArgumentException("Approver user not found with ID: " + approverId));

        // Define which statuses this user can act on based on their role
        List<ApprovalStatus> relevantStatuses;
        
        switch (approver.getRole()) {
            case LECTURER:
                // LECTURERs act on submissions (PENDING_LECTURER_APPROVAL)
                relevantStatuses = List.of(ApprovalStatus.PENDING_LECTURER_APPROVAL);
                break;
                
            case TUTOR:
                // TUTORs don't typically act on pending approvals in this workflow
                // But they might need to see timesheets pending their review
                relevantStatuses = List.of(ApprovalStatus.PENDING_TUTOR_REVIEW);
                break;
                
            case ADMIN:
                // ADMINs can act on HR-level approvals
                relevantStatuses = List.of(ApprovalStatus.PENDING_HR_REVIEW, ApprovalStatus.PENDING_LECTURER_APPROVAL);
                break;
                
            default:
                return List.of(); // No pending approvals for unknown roles
        }

        // Get timesheets that are in relevant pending states and that this user can act on
        List<Approval> pendingApprovals = approvalRepository.findPendingApprovalsForStatuses(relevantStatuses);
        
        return pendingApprovals.stream()
            .map(approval -> timesheetRepository.findById(approval.getTimesheetId()))
            .filter(opt -> opt.isPresent())
            .map(opt -> opt.get())
            .filter(timesheet -> canUserActOnTimesheet(timesheet, approver))
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserPerformAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        
        try {
            validateApprovalAction(timesheet, action, requesterId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApprovalStatus getCurrentApprovalStatus(Long timesheetId) {
        
        // First check the timesheet's status field
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + timesheetId));

        return timesheet.getStatus();
    }

    @Override
    public void validateApprovalAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        
        // 1. Validate user exists
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // 2. Validate user role can perform this type of action
        if (!canRolePerformAction(requester.getRole(), action)) {
            throw new SecurityException("User role " + requester.getRole() + " cannot perform action " + action);
        }

        // 3. Validate user has permission for this specific timesheet
        if (!hasPermissionForTimesheet(timesheet, requester, action)) {
            throw new SecurityException("User does not have permission to perform " + action + " on this timesheet");
        }

        // 4. Validate current status allows this action
        ApprovalStatus currentStatus = timesheet.getStatus();
        
        try {
            // This will throw an exception if the transition is invalid
            action.getTargetStatus(currentStatus);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Cannot perform " + action + " on timesheet with status " + currentStatus.name() + ": " + e.getMessage());
        }

        // 5. Additional business rule validation
        validateBusinessRulesForAction(timesheet, action, requester);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object[]> getApprovalStatistics(Long approverId, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Only ADMIN users or the approver themselves can view statistics
        if (!requester.getRole().equals(UserRole.ADMIN) && !requesterId.equals(approverId)) {
            throw new SecurityException("User does not have permission to view approval statistics");
        }

        return approvalRepository.getApprovalStatisticsByApprover(approverId);
    }

    // Private helper methods

    /**
     * Check if a user role can perform a specific approval action.
     */
    private boolean canRolePerformAction(UserRole role, ApprovalAction action) {
        switch (role) {
            case TUTOR:
                return action.canBePerformedByTutor();
            case LECTURER:
                return action.canBePerformedByLecturer();
            case ADMIN:
                return action.canBePerformedByAdmin();
            default:
                return false;
        }
    }

    /**
     * Check if a user has permission to perform a specific action on a timesheet.
     */
    private boolean hasPermissionForTimesheet(Timesheet timesheet, User user, ApprovalAction action) {
        
        switch (user.getRole()) {
            case ADMIN:
                // ADMIN can perform any action on any timesheet
                return true;
                
            case LECTURER:
                // LECTURER can act on timesheets for courses they teach
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTOR can only submit their own timesheets
                if (action == ApprovalAction.SUBMIT_FOR_APPROVAL) {
                    return user.getId().equals(timesheet.getTutorId());
                }
                return false;
                
            default:
                return false;
        }
    }

    /**
     * Check if a user can view a timesheet (for approval history access control).
     */
    private boolean canUserViewTimesheet(Timesheet timesheet, User user) {
        
        switch (user.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                return user.getId().equals(timesheet.getTutorId());
                
            default:
                return false;
        }
    }

    /**
     * Check if a user can act on a timesheet (for pending approvals filtering).
     */
    private boolean canUserActOnTimesheet(Timesheet timesheet, User user) {
        
        switch (user.getRole()) {
            case ADMIN:
                return true;
                
            case LECTURER:
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                return user.getId().equals(course.getLecturerId());
                
            case TUTOR:
                // TUTORs typically don't act on pending approvals, but if needed:
                return user.getId().equals(timesheet.getTutorId());
                
            default:
                return false;
        }
    }

    /**
     * Validate additional business rules for specific actions.
     */
    private void validateBusinessRulesForAction(Timesheet timesheet, ApprovalAction action, User requester) {
        
        // Additional validation can be added here as business rules evolve
        
        // For example, we could validate:
        // - Time limits for approval actions
        // - Required comments for certain actions
        // - Budget constraints before final approval
        // - etc.
        
        // For now, basic validation is sufficient for the story requirements
    }
}