package com.usyd.catams.controller;

import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.dto.request.TimesheetQuoteRequest;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.dto.response.TimesheetQuoteResponse;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.policy.AuthenticationFacade;
import com.usyd.catams.service.Schedule1CalculationResult;
import com.usyd.catams.service.Schedule1Calculator;
import com.usyd.catams.service.TimesheetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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

    private final TimesheetService timesheetService;
    private final TimesheetMapper timesheetMapper;
    private final AuthenticationFacade authenticationFacade;
    private final Schedule1Calculator schedule1Calculator;

    @Autowired
    public TimesheetController(TimesheetService timesheetService,
                               TimesheetMapper timesheetMapper,
                               AuthenticationFacade authenticationFacade,
                               Schedule1Calculator schedule1Calculator) {
        this.timesheetService = timesheetService;
        this.timesheetMapper = timesheetMapper;
        this.authenticationFacade = authenticationFacade;
        this.schedule1Calculator = schedule1Calculator;
    }

    @PostMapping("/quote")
    @PreAuthorize("hasAnyRole('LECTURER','TUTOR','ADMIN')")
    public ResponseEntity<TimesheetQuoteResponse> quoteTimesheet(
            @Valid @RequestBody TimesheetQuoteRequest request) {
        Schedule1CalculationResult calculation = calculateSchedule1(
                request.getTaskType(),
                request.getSessionDate(),
                request.getDeliveryHours(),
                request.isRepeat(),
                request.getQualification()
        );
        return ResponseEntity.ok(TimesheetQuoteResponse.from(request.getTaskType(), calculation));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('LECTURER','TUTOR','ADMIN')")
    public ResponseEntity<TimesheetResponse> createTimesheet(
            @Valid @RequestBody TimesheetCreateRequest request,
            Authentication authentication) {
        Long creatorId = authenticationFacade.getCurrentUserId();
        Schedule1CalculationResult calculation = calculateSchedule1(
                request.getTaskType(),
                request.resolveSessionDate(),
                request.getDeliveryHours(),
                request.isRepeat(),
                request.getQualification()
        );
        var entity = timesheetService.createTimesheet(
                request.getTutorId(),
                request.getCourseId(),
                request.getWeekStartDate(),
                calculation,
                request.getTaskType(),
                request.getDescription(),
                creatorId
        );
        return new ResponseEntity<>(timesheetMapper.toResponse(entity), HttpStatus.CREATED);
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
        Page<com.usyd.catams.entity.Timesheet> pageEntities = timesheetService.getTimesheets(
                tutorId, courseId, status, requesterId, pageable
        );
        PagedTimesheetResponse response = timesheetMapper.toPagedResponse(pageEntities);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve timesheets pending first-level approval.
     * Access control: allowed for TUTOR (own pending) and ADMIN (all), forbidden for LECTURER.
     */
    @GetMapping("/pending-approval")
    @PreAuthorize("hasRole('TUTOR') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);
        Long requesterId = authenticationFacade.getCurrentUserId();
        Page<com.usyd.catams.entity.Timesheet> pageEntities =
                timesheetService.getPendingApprovalTimesheets(requesterId, pageable);
        return ResponseEntity.ok(timesheetMapper.toPagedResponse(pageEntities));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<TimesheetResponse> getTimesheetById(
            @PathVariable("id") Long id) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        Optional<com.usyd.catams.entity.Timesheet> opt = timesheetService.getTimesheetById(id, requesterId);
        if (opt.isEmpty()) throw new ResourceNotFoundException("Timesheet", id.toString());
        return ResponseEntity.ok(timesheetMapper.toResponse(opt.get()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN') or hasRole('TUTOR')")
    public ResponseEntity<TimesheetResponse> updateTimesheet(
            @PathVariable("id") Long id,
            @Valid @RequestBody TimesheetUpdateRequest request) {
        Long requesterId = authenticationFacade.getCurrentUserId();
        com.usyd.catams.entity.Timesheet existing = timesheetService.getTimesheetById(id, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Timesheet", id.toString()));
        TimesheetTaskType taskType = request.getTaskType() != null ? request.getTaskType() : existing.getTaskType();
        TutorQualification qualification = request.getQualification() != null ? request.getQualification() : existing.getQualification();
        BigDecimal deliveryHours = request.getDeliveryHours() != null ? request.getDeliveryHours() : existing.getDeliveryHours();
        LocalDate sessionDate = request.getSessionDate() != null ? request.getSessionDate() : existing.getSessionDate();

        Schedule1CalculationResult calculation = calculateSchedule1(
                taskType,
                sessionDate,
                deliveryHours,
                request.isRepeat(),
                qualification
        );
        // Let the service handle both authorization and business rule validation with proper exceptions
        var entity = timesheetService.updateTimesheet(
                id,
                calculation,
                taskType,
                request.getDescription(),
                requesterId
        );
        return ResponseEntity.ok(timesheetMapper.toResponse(entity));
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
                ? timesheetMapper.toPagedResponse(timesheetService.getTimesheets(requesterId, null, status, requesterId, pageable))
                : timesheetMapper.toPagedResponse(timesheetService.getTimesheetsByTutor(requesterId, pageable));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending-final-approval")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingFinalApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort) {
        if (page < 0) page = 0;
        if (size <= 0 || size > 100) size = 20;
        Pageable pageable = createPageable(page, size, sort);
        Long requesterId = authenticationFacade.getCurrentUserId();
        Page<com.usyd.catams.entity.Timesheet> pageEntities =
                timesheetService.getLecturerFinalApprovalQueue(requesterId, pageable);
        return ResponseEntity.ok(timesheetMapper.toPagedResponse(pageEntities));
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

