package com.usyd.catams.controller;

import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.mapper.ApprovalMapper;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.policy.AuthenticationFacade;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.service.ApprovalService;
import com.usyd.catams.enums.ApprovalStatus;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for timesheet confirmation operations.
 */
@RestController
@RequestMapping({"/api/confirmations", "/api/approvals"})
public class ApprovalController {

    private final ApprovalService approvalService;
    private final AuthenticationFacade authenticationFacade;
    private final ApprovalMapper approvalMapper;
    private final TimesheetRepository timesheetRepository;
    private final CourseRepository courseRepository;
    private final TimesheetMapper timesheetMapper;
    private final TutorAssignmentRepository tutorAssignmentRepository;
    private static final Logger logger = LoggerFactory.getLogger(ApprovalController.class);

    @Autowired
    public ApprovalController(ApprovalService approvalService,
                              AuthenticationFacade authenticationFacade,
                              ApprovalMapper approvalMapper,
                              TimesheetRepository timesheetRepository,
                              CourseRepository courseRepository,
                              TimesheetMapper timesheetMapper,
                              TutorAssignmentRepository tutorAssignmentRepository) {
        this.approvalService = approvalService;
        this.authenticationFacade = authenticationFacade;
        this.approvalMapper = approvalMapper;
        this.timesheetRepository = timesheetRepository;
        this.courseRepository = courseRepository;
        this.timesheetMapper = timesheetMapper;
        this.tutorAssignmentRepository = tutorAssignmentRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<ApprovalActionResponse> performConfirmationAction(
            @Valid @RequestBody ApprovalActionRequest request) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        logger.info("HTTP approve: action={}, timesheetId={}, requesterId={}", request.getAction(), request.getTimesheetId(), requesterId);
        // If requester is LECTURER, ensure tutor is assigned to course for the target timesheet
        java.util.Collection<String> roles = authenticationFacade.getCurrentUserRoles();
        if (roles.contains("ROLE_LECTURER")) {
            var timesheet = timesheetRepository.findById(request.getTimesheetId())
                    .orElseThrow(() -> new com.usyd.catams.exception.ResourceNotFoundException("Timesheet", String.valueOf(request.getTimesheetId())));
            boolean assigned = tutorAssignmentRepository.existsByTutorIdAndCourseId(timesheet.getTutorId(), timesheet.getCourseId());
            if (!assigned) {
                throw new com.usyd.catams.exception.AuthorizationException("Tutor " + timesheet.getTutorId() + " is not assigned to course " + timesheet.getCourseId());
            }
        }
        var approval = approvalService.performApprovalAction(
                request.getTimesheetId(), request.getAction(), request.getComment(), requesterId);
        logger.info("HTTP approve OK: action={}, timesheetId={}, fromStatus={}, toStatus={}",
                request.getAction(), request.getTimesheetId(), approval.getPreviousStatus(), approval.getNewStatus());
        return ResponseEntity.ok(approvalMapper.toResponse(approval));
    }

    @GetMapping("/history/{timesheetId}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<java.util.List<ApprovalActionResponse>> getConfirmationHistory(
            @PathVariable("timesheetId") Long timesheetId) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        var approvals = approvalService.getApprovalHistory(timesheetId, requesterId);
        var responses = approvals.stream().map(approvalMapper::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER','TUTOR')")
    public ResponseEntity<List<TimesheetResponse>> getPendingConfirmations() {
        Long requesterId = authenticationFacade.getCurrentUserId();
        java.util.Collection<String> roles = authenticationFacade.getCurrentUserRoles();

        List<TimesheetResponse> responses;
        if (roles.contains("ROLE_ADMIN")) {
            responses = timesheetMapper.toResponseList(
                timesheetRepository.findByStatus(ApprovalStatus.LECTURER_CONFIRMED)
            );
        } else if (roles.contains("ROLE_LECTURER")) {
            List<Long> courseIds = courseRepository.findByLecturerId(requesterId).stream()
                .map(com.usyd.catams.entity.Course::getId)
                .toList();
            if (courseIds.isEmpty()) {
                responses = Collections.emptyList();
            } else {
                responses = timesheetMapper.toResponseList(
                    timesheetRepository.findByCourseIdInAndStatus(courseIds, ApprovalStatus.TUTOR_CONFIRMED)
                );
            }
        } else if (roles.contains("ROLE_TUTOR")) {
            responses = timesheetMapper.toResponseList(
                timesheetRepository.findByTutorIdAndStatus(requesterId, ApprovalStatus.PENDING_TUTOR_CONFIRMATION)
            );
        } else {
            responses = Collections.emptyList();
        }

        return ResponseEntity.ok(responses);
    }
}
