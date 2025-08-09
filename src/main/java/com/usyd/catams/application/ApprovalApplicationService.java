package com.usyd.catams.application;

import com.usyd.catams.domain.service.ApprovalDomainService;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.ApprovalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Application Service for Approval operations following DDD principles.
 * 
 * This service handles application-level concerns including:
 * - Transaction management
 * - Security enforcement
 * - Repository orchestration
 * - Entity loading and persistence
 * 
 * Domain logic is delegated to ApprovalDomainService.
 */
@Service
@Transactional
public class ApprovalApplicationService implements ApprovalService {

    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ApprovalDomainService approvalDomainService;

    @Autowired
    public ApprovalApplicationService(TimesheetRepository timesheetRepository,
                                    UserRepository userRepository,
                                    CourseRepository courseRepository,
                                    ApprovalDomainService approvalDomainService) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.approvalDomainService = approvalDomainService;
    }

    @Override
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public Approval submitForApproval(Long timesheetId, String comment, Long requesterId) {
        return performApprovalAction(timesheetId, ApprovalAction.SUBMIT_FOR_APPROVAL, comment, requesterId);
    }

    @Override
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public Approval performApprovalAction(Long timesheetId, ApprovalAction action, String comment, Long requesterId) {
        
        // 1. Load the timesheet aggregate from repository
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new ResourceNotFoundException("Timesheet", timesheetId.toString()));

        // 2. Load related entities for validation
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));
        
        Course course = courseRepository.findById(timesheet.getCourseId())
            .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));

        // 3. Validate action using domain service
        approvalDomainService.validateApprovalActionBusinessRules(timesheet, action, requester, course);

        // 4. Perform the action through the aggregate
        Approval approval;
        switch (action) {
            case SUBMIT_FOR_APPROVAL:
                approval = timesheet.submitForApproval(requesterId, comment);
                break;
            case APPROVE:
                approval = timesheet.approve(requesterId, comment);
                break;
            case REJECT:
                approval = timesheet.reject(requesterId, comment);
                break;
            case REQUEST_MODIFICATION:
                approval = timesheet.requestModification(requesterId, comment);
                break;
            case FINAL_APPROVAL:
                approval = timesheet.finalApprove(requesterId, comment);
                break;
            default:
                throw new IllegalArgumentException("Unsupported approval action: " + action);
        }

        // 5. Save the timesheet aggregate (which cascades to save approvals)
        timesheetRepository.save(timesheet);

        return approval;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Approval> getApprovalHistory(Long timesheetId, Long requesterId) {
        
        // Load entities from repositories
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + timesheetId));

        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        Course course = courseRepository.findById(timesheet.getCourseId())
            .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));

        // Apply access control using domain service
        if (!approvalDomainService.canUserViewTimesheet(timesheet, requester, course)) {
            throw new SecurityException("User does not have permission to view approval history for this timesheet");
        }

        return timesheet.getApprovalHistory();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Timesheet> getPendingApprovalsForUser(Long approverId) {
        
        User approver = userRepository.findById(approverId)
            .orElseThrow(() -> new IllegalArgumentException("Approver user not found with ID: " + approverId));

        // Get relevant statuses from domain service
        List<ApprovalStatus> relevantStatuses = approvalDomainService.getRelevantStatusesForRole(approver.getRole());

        // Get timesheets that are in relevant pending states and that this user can act on
        return timesheetRepository.findByStatusIn(relevantStatuses).stream()
            .filter(timesheet -> {
                try {
                    Course course = courseRepository.findById(timesheet.getCourseId()).orElse(null);
                    return course != null && approvalDomainService.canUserActOnTimesheet(timesheet, approver, course);
                } catch (Exception e) {
                    return false; // Skip timesheets with missing courses
                }
            })
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserPerformAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        
        try {
            // Load entities
            User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));
            
            Course course = courseRepository.findById(timesheet.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));

            // Use domain service for validation
            approvalDomainService.validateApprovalActionBusinessRules(timesheet, action, requester, course);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApprovalStatus getCurrentApprovalStatus(Long timesheetId) {
        
        // Load timesheet from repository
        Timesheet timesheet = timesheetRepository.findById(timesheetId)
            .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + timesheetId));

        return timesheet.getStatus();
    }

    @Override
    public void validateApprovalAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        
        // Load entities from repositories
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        Course course = courseRepository.findById(timesheet.getCourseId())
            .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));

        // Delegate to domain service
        approvalDomainService.validateApprovalActionBusinessRules(timesheet, action, requester, course);
    }

    @Override
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN') or #requesterId == #approverId")
    public List<Object[]> getApprovalStatistics(Long approverId, Long requesterId) {
        
        User requester = userRepository.findById(requesterId)
            .orElseThrow(() -> new IllegalArgumentException("Requester user not found with ID: " + requesterId));

        // Validate permission using domain service
        if (!approvalDomainService.canViewApprovalStatistics(requester, approverId)) {
            throw new SecurityException("User does not have permission to view approval statistics");
        }

        // Statistics need to be calculated from timesheet aggregates
        // For now, return empty list - this could be implemented as a custom query
        // or calculated from timesheet approval histories
        return List.of();
    }

    // DTO-based methods for controller layer

    /**
     * Perform approval action and return DTO response.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ApprovalActionResponse performApprovalActionAndReturnDto(Long timesheetId, ApprovalAction action, String comment, Long requesterId) {
        
        // Perform the approval action (existing logic)
        Approval approval = performApprovalAction(timesheetId, action, comment, requesterId);
        
        // Convert to DTO
        return buildApprovalActionResponseDto(approval);
    }

    /**
     * Get approval history and return DTO responses.
     * This method encapsulates entity-to-DTO conversion within the application layer.
     */
    @Transactional(readOnly = true)
    public List<ApprovalActionResponse> getApprovalHistoryAsDto(Long timesheetId, Long requesterId) {
        
        // Get approval history (existing logic)
        List<Approval> approvals = getApprovalHistory(timesheetId, requesterId);
        
        // Convert to DTOs
        return approvals.stream()
            .map(this::buildApprovalActionResponseDto)
            .collect(Collectors.toList());
    }

    /**
     * Build ApprovalActionResponse DTO from Approval entity.
     * This encapsulates the DTO conversion logic within the application layer.
     */
    private ApprovalActionResponse buildApprovalActionResponseDto(Approval approval) {
        
        // Get approver information from repository
        User approver = userRepository.findById(approval.getApproverId())
            .orElse(null);
        
        String approverName = approver != null ? 
            approver.getName() : 
            "Unknown User";

        // Determine comment per action expectations (submission returns null comment)
        String responseComment = approval.getAction() == ApprovalAction.SUBMIT_FOR_APPROVAL
            ? null
            : approval.getComment();

        // Create response DTO
        ApprovalActionResponse response = new ApprovalActionResponse(
            approval.getTimesheetId(),
            approval.getAction(),
            approval.getNewStatus(),
            approval.getApproverId(),
            approverName,
            responseComment,
            approval.getTimestamp() == null ? java.time.LocalDateTime.now() : approval.getTimestamp()
        );

        // Add workflow guidance
        response.setNextSteps(ApprovalActionResponse.generateNextStepsForStatus(approval.getNewStatus()));

        return response;
    }
}