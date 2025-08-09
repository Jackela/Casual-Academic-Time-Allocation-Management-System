package com.usyd.catams.application;

import com.usyd.catams.domain.service.ApprovalDomainService;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
=======
import com.usyd.catams.enums.UserRole;
>>>>>>> c8486ccc9d77ad3c5893d5e2f8def3f49db6132a
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
<<<<<<< HEAD
                approval = timesheet.submitForApproval(requesterId, comment);                break;
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
                break;        // Create response DTO
        ApprovalActionResponse response = new ApprovalActionResponse(
            approval.getTimesheetId(),
            approval.getAction(),
            approval.getNewStatus(),
            approval.getApproverId(),
            approverName,
            responseComment,
            approval.getTimestamp() == null ? java.time.LocalDateTime.now() : approval.getTimestamp()        );

        // Add workflow guidance
        response.setNextSteps(ApprovalActionResponse.generateNextStepsForStatus(approval.getNewStatus()));

        return response;
    }
}