package com.usyd.catams.controller;

import com.usyd.catams.service.TimesheetApplicationFacade;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.dto.request.TimesheetQuoteRequest;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.dto.response.TimesheetQuoteResponse;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.mapper.ApprovalMapper;
import com.usyd.catams.policy.AuthenticationFacade;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.service.ApprovalService;
import com.usyd.catams.service.Schedule1CalculationResult;
import com.usyd.catams.service.Schedule1Calculator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;

/**
 * REST Controller for timesheet management operations.
 */
@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

    private final TimesheetApplicationFacade timesheetService;
    private final AuthenticationFacade authenticationFacade;
    private final Schedule1Calculator schedule1Calculator;
    private final TimesheetValidationService timesheetValidationService;
    private final ApprovalService approvalService;
    private final ApprovalMapper approvalMapper;

    @Autowired
    public TimesheetController(TimesheetApplicationFacade timesheetService,
                               AuthenticationFacade authenticationFacade,
                               Schedule1Calculator schedule1Calculator,
                               TimesheetValidationService timesheetValidationService,
                               ApprovalService approvalService,
                               ApprovalMapper approvalMapper) {
        this.timesheetService = timesheetService;
        this.authenticationFacade = authenticationFacade;
        this.schedule1Calculator = schedule1Calculator;
        this.timesheetValidationService = timesheetValidationService;
        this.approvalService = approvalService;
        this.approvalMapper = approvalMapper;
    }

    @PostMapping("/quote")
    @PreAuthorize("hasAnyRole('LECTURER','TUTOR','ADMIN')")
    public ResponseEntity<TimesheetQuoteResponse> quoteTimesheet(
            @Valid @RequestBody TimesheetQuoteRequest request) {
        timesheetValidationService.validateMonday(request.getSessionDate(), "sessionDate");
        boolean effectiveRepeat = request.isRepeat();
        if (request.getTaskType() == TimesheetTaskType.TUTORIAL && request.isRepeat()) {
            effectiveRepeat = timesheetService.isTutorialRepeatEligible(
                    request.getCourseId(),
                    request.getSessionDate()
            );
        }
        Schedule1CalculationResult calculation = calculateSchedule1(
                request.getTaskType(),
                request.getSessionDate(),
                request.getDeliveryHours(),
                effectiveRepeat,
                request.getQualification()
        );
        return ResponseEntity.ok(TimesheetQuoteResponse.from(request.getTaskType(), calculation));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','LECTURER')")
    public ResponseEntity<TimesheetResponse> createTimesheet(
            @Valid @RequestBody TimesheetCreateRequest request) {
        Long creatorId = authenticationFacade.getCurrentUserId();
        Schedule1CalculationResult calculation = calculateSchedule1(
                request.getTaskType(),
                request.resolveSessionDate(),
                request.getDeliveryHours(),
                request.isRepeat(),
                request.getQualification()
        );
        TimesheetResponse responseBody = timesheetService.createTimesheetAndReturnDto(
                request.getTutorId(),
                request.getCourseId(),
                request.getWeekStartDate(),
                calculation,
                request.getTaskType(),
                request.getDescription(),
                creatorId
        );
        return new ResponseEntity<>(responseBody, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getTimesheets(
            @RequestParam(value = "tutorId", required = false) Long tutorId,
            @RequestParam(value = "courseId", required = false) Long courseId,
            @RequestParam(value = "status", required = false) ApprovalStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort) {

        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);

        Long requesterId = authenticationFacade.getCurrentUserId();
        PagedTimesheetResponse response = timesheetService.getTimesheetsAsDto(
                tutorId, courseId, status, requesterId, pageable
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve timesheets pending first-level approval.
     * Access control: allowed for TUTOR (own pending) and ADMIN (all), forbidden for LECTURER.
     */
    @GetMapping("/pending-approval")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @PreAuthorize("hasRole('TUTOR') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);
        Long requesterId = authenticationFacade.getCurrentUserId();
        PagedTimesheetResponse response =
                timesheetService.getPendingApprovalTimesheetsAsDto(requesterId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<TimesheetResponse> getTimesheetById(
            @PathVariable("id") Long id) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        Optional<TimesheetResponse> opt = timesheetService.getTimesheetByIdAsDto(id, requesterId);
        if (opt.isEmpty()) throw new ResourceNotFoundException("Timesheet", id.toString());
        return ResponseEntity.ok(opt.get());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN') or hasRole('TUTOR')")
    public ResponseEntity<TimesheetResponse> updateTimesheet(
            @PathVariable("id") Long id,
            @Valid @RequestBody TimesheetUpdateRequest request) {
        Long requesterId = authenticationFacade.getCurrentUserId();

        Schedule1CalculationResult calculation = calculateSchedule1(
                request.getTaskType(),
                request.getSessionDate(),
                request.getDeliveryHours(),
                request.isRepeat(),
                request.getQualification()
        );
        // Let the service handle both authorization and business rule validation with proper exceptions
        TimesheetResponse response = timesheetService.updateTimesheetAndReturnDto(
                id,
                calculation,
                request.getTaskType(),
                request.getDescription(),
                requesterId
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN') or hasRole('TUTOR')")
    public ResponseEntity<Void> deleteTimesheet(
            @PathVariable("id") Long id) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        // Let the service handle both authorization and business rule validation with proper exceptions
        timesheetService.deleteTimesheet(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<ApprovalActionResponse> confirmTimesheet(
            @PathVariable("id") Long id) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        var approval = approvalService.performApprovalAction(
                id, ApprovalAction.TUTOR_CONFIRM, null, requesterId);
        return ResponseEntity.ok(approvalMapper.toResponse(approval));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('TUTOR') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getMyTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort,
            @RequestParam(value = "status", required = false) ApprovalStatus status) {

        Long requesterId = authenticationFacade.getCurrentUserId();
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);

        PagedTimesheetResponse response = (status != null)
                ? timesheetService.getTimesheetsAsDto(requesterId, null, status, requesterId, pageable)
                : timesheetService.getTimesheetsByTutorAsDto(requesterId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending-final-approval")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingFinalApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);
        Long requesterId = authenticationFacade.getCurrentUserId();
        PagedTimesheetResponse response =
                timesheetService.getLecturerFinalApprovalQueueAsDto(requesterId, pageable);
        return ResponseEntity.ok(response);
    }

    private Schedule1CalculationResult calculateSchedule1(TimesheetTaskType taskType,
                                                          LocalDate sessionDate,
                                                          BigDecimal deliveryHours,
                                                          boolean repeat,
                                                          TutorQualification qualification) {
        Objects.requireNonNull(taskType, "taskType");
        Objects.requireNonNull(sessionDate, "sessionDate");
        Objects.requireNonNull(deliveryHours, "deliveryHours");
        TutorQualification resolvedQualification = qualification != null ? qualification : TutorQualification.STANDARD;

        if (taskType == TimesheetTaskType.TUTORIAL) {
            BigDecimal normalised = deliveryHours.setScale(1, java.math.RoundingMode.HALF_UP);
            if (normalised.compareTo(BigDecimal.ONE.setScale(1)) != 0) {
                throw new IllegalArgumentException("Delivery hours for Tutorial must be exactly 1.0");
            }
        }
        return schedule1Calculator.calculate(
                new Schedule1Calculator.CalculationInput(
                        taskType,
                        sessionDate,
                        deliveryHours,
                        repeat,
                        resolvedQualification
                )
        );
    }

    private Pageable createPageable(int page, int size, String sort) {
        try {
            if (sort == null || sort.trim().isEmpty()) {
                return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            }
            String[] sortParts = sort.split(",");
            String field = sortParts[0].trim();
            Sort.Direction direction = Sort.Direction.DESC;
            if (sortParts.length > 1) {
                String directionStr = sortParts[1].trim().toLowerCase();
                if ("asc".equals(directionStr)) direction = Sort.Direction.ASC;
            }
            if (!isValidSortField(field)) field = "createdAt";
            return PageRequest.of(page, size, Sort.by(direction, field));
        } catch (Exception e) {
            return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        }
    }

    private boolean isValidSortField(String field) {
        return field != null && (
                "id".equals(field) ||
                "tutorId".equals(field) ||
                "courseId".equals(field) ||
                "weekStartDate".equals(field) ||
                "hours".equals(field) ||
                "hourlyRate".equals(field) ||
                "status".equals(field) ||
                "createdAt".equals(field) ||
                "updatedAt".equals(field)
        );
    }
}
