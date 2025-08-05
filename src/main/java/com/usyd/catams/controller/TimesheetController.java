package com.usyd.catams.controller;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.exception.ResourceNotFoundException;
import com.usyd.catams.security.AuthenticationUtils;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * REST Controller for timesheet management operations.
 * 
 * This controller implements the OpenAPI specification for timesheet endpoints
 * including creation, retrieval, and filtering with proper RBAC security.
 * 
 * Endpoints:
 * - POST /api/timesheets - Create new timesheet (LECTURER only)
 * - GET /api/timesheets - Retrieve timesheets with filtering (role-based access)
 * - GET /api/timesheets/{id} - Get specific timesheet by ID
 * - PUT /api/timesheets/{id} - Update existing timesheet (LECTURER/ADMIN)
 * - DELETE /api/timesheets/{id} - Delete existing timesheet (LECTURER/ADMIN)
 */
@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {

    private final TimesheetApplicationService timesheetApplicationService;
    private final AuthenticationUtils authenticationUtils;

    @Autowired
    public TimesheetController(TimesheetApplicationService timesheetApplicationService, 
                              AuthenticationUtils authenticationUtils) {
        this.timesheetApplicationService = timesheetApplicationService;
        this.authenticationUtils = authenticationUtils;
    }

    /**
     * Create a new timesheet.
     * 
     * Only LECTURER users can create timesheets for TUTOR users.
     * Business rules are enforced in the service layer.
     */
    @PostMapping
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<TimesheetResponse> createTimesheet(
            @Valid @RequestBody TimesheetCreateRequest request,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long creatorId = authenticationUtils.getCurrentUserId(authentication);

        // Create timesheet using application service (returns DTO directly)
        TimesheetResponse response = timesheetApplicationService.createTimesheetAndReturnDto(
            request.getTutorId(),
            request.getCourseId(),
            request.getWeekStartDate(),
            request.getHours(),
            request.getHourlyRate(),
            request.getDescription(),
            creatorId
        );

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Retrieve timesheets with filtering and pagination.
     * 
     * Access control:
     * - TUTOR: Can only view their own timesheets
     * - LECTURER: Can view timesheets for courses they teach
     * - ADMIN: Can view all timesheets
     */
    @GetMapping
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getTimesheets(
            @RequestParam(value = "tutorId", required = false) Long tutorId,
            @RequestParam(value = "courseId", required = false) Long courseId,
            @RequestParam(value = "status", required = false) ApprovalStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort,
            
            Authentication authentication) {

        // Validate pagination parameters
        if (page < 0) {
            page = 0;
        }
        if (size <= 0 || size > 100) {
            size = 20; // Default size with maximum limit
        }

        // Parse sort parameter
        Pageable pageable = createPageable(page, size, sort);

        // Get current user ID from authentication context
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Get timesheets using application service (returns DTO directly)
        PagedTimesheetResponse response = timesheetApplicationService.getTimesheetsAsDto(
            tutorId, courseId, status, requesterId, pageable
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific timesheet by ID.
     * 
     * Access control is enforced based on user role and ownership.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<TimesheetResponse> getTimesheetById(
            @PathVariable("id") Long id,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Get timesheet using application service (returns DTO directly)
        Optional<TimesheetResponse> timesheetResponseOpt = timesheetApplicationService.getTimesheetByIdAsDto(id, requesterId);

        if (timesheetResponseOpt.isEmpty()) {
            throw new ResourceNotFoundException("Timesheet", id.toString());
        }

        // Return the DTO response
        TimesheetResponse response = timesheetResponseOpt.get();

        return ResponseEntity.ok(response);
    }

    /**
     * Update an existing timesheet.
     * 
     * Access control:
     * - LECTURER and ADMIN users can update timesheets (existing functionality)
     * - TUTOR can update their own REJECTED timesheets (Story 2.2 addition)
     * 
     * Business rules:
     * - LECTURER/ADMIN: Only DRAFT status timesheets can be updated
     * - TUTOR: Only REJECTED status timesheets that they own can be updated
     * - TUTOR updates reset status from REJECTED → DRAFT
     * - LECTURER can update timesheets for courses they teach
     * - ADMIN can update any timesheet
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN') or hasRole('TUTOR')")
    public ResponseEntity<TimesheetResponse> updateTimesheet(
            @PathVariable("id") Long id,
            @Valid @RequestBody TimesheetUpdateRequest request,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Check if user can edit this timesheet (includes TUTOR-specific logic)
        if (!timesheetApplicationService.canUserEditTimesheet(id, requesterId)) {
            // This will be caught by the GlobalExceptionHandler and return proper error response
            throw new SecurityException("User does not have permission to modify this timesheet");
        }

        // Update timesheet using application service (returns DTO directly)
        TimesheetResponse response = timesheetApplicationService.updateTimesheetAndReturnDto(
            id,
            request.getHours(),
            request.getHourlyRate(),
            request.getDescription(),
            requesterId
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Delete an existing timesheet.
     * 
     * Access control:
     * - LECTURER and ADMIN users can delete timesheets (existing functionality)
     * - TUTOR can delete their own REJECTED timesheets (Story 2.2 addition)
     * 
     * Business rules:
     * - LECTURER/ADMIN: Only DRAFT status timesheets can be deleted
     * - TUTOR: Only REJECTED status timesheets that they own can be deleted
     * - LECTURER can delete timesheets for courses they teach
     * - ADMIN can delete any timesheet
     * - Deletion is permanent
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN') or hasRole('TUTOR')")
    public ResponseEntity<Void> deleteTimesheet(
            @PathVariable("id") Long id,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = authenticationUtils.getCurrentUserId(authentication);

        // Check if user can edit this timesheet (includes TUTOR-specific logic)
        if (!timesheetApplicationService.canUserEditTimesheet(id, requesterId)) {
            // This will be caught by the GlobalExceptionHandler and return proper error response
            throw new SecurityException("User does not have permission to modify this timesheet");
        }

        // Delete timesheet using application service
        timesheetApplicationService.deleteTimesheet(id, requesterId);

        // Return 204 No Content as per OpenAPI specification
        return ResponseEntity.noContent().build();
    }

    // Helper methods


    /**
     * Create Pageable object from request parameters.
     * 
     * @param page the page number
     * @param size the page size
     * @param sort the sort specification
     * @return the Pageable object
     */
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
                if ("asc".equals(directionStr)) {
                    direction = Sort.Direction.ASC;
                }
            }

            // Validate sort field (security measure to prevent SQL injection)
            if (!isValidSortField(field)) {
                field = "createdAt"; // Default to safe field
            }

            return PageRequest.of(page, size, Sort.by(direction, field));
        } catch (Exception e) {
            // Fallback to default sorting if parsing fails
            return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        }
    }

    /**
     * Validate that the sort field is allowed.
     * 
     * @param field the field name
     * @return true if field is valid for sorting
     */
    private boolean isValidSortField(String field) {
        // Define allowed sort fields to prevent SQL injection
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

    /**
     * Get all timesheets for the authenticated tutor.
     * 
     * Access control:
     * - TUTOR: Can only view their own timesheets across all statuses
     * - ADMIN: Can view any user's timesheets
     * 
     * Business rules:
     * - Returns ALL timesheet statuses for complete workflow visibility
     * - Supports pagination and sorting
     * - Default sort is by creation date (newest first)
     * 
     * @param page page number (0-based)
     * @param size page size (max 100)
     * @param sort sort criteria (e.g., "createdAt,desc" or "weekStartDate,asc")
     * @param status optional status filter
     * @param authentication current user authentication
     * @return paginated list of tutor's timesheets
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('TUTOR') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getMyTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort,
            @RequestParam(value = "status", required = false) ApprovalStatus status,
            Authentication authentication) {
        
        try {
            // Get current user ID from authentication context
            Long requesterId = authenticationUtils.getCurrentUserId(authentication);
            
            // Validate pagination parameters
            if (page < 0) {
                page = 0;
            }
            if (size <= 0 || size > 100) {
                size = 20; // Default size with maximum limit
            }

            // Parse sort parameter
            Pageable pageable = createPageable(page, size, sort);
            
            // Get timesheets for the tutor using application service (returns DTO directly)
            PagedTimesheetResponse response;
            if (status != null) {
                // Filter in service layer for better performance
                response = timesheetApplicationService.getTimesheetsAsDto(requesterId, null, status, requesterId, pageable);
            } else {
                response = timesheetApplicationService.getTimesheetsByTutorAsDto(requesterId, pageable);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get timesheets pending lecturer approval with pagination.
     * 
     * Access control:
     * - LECTURER: Can view timesheets pending approval for their courses only
     * - ADMIN: Can view all timesheets pending approval system-wide
     * - TUTOR: Cannot access this endpoint (403 Forbidden)
     * 
     * Business rules:
     * - Only returns timesheets with status PENDING_LECTURER_APPROVAL
     * - Results are filtered by lecturer's assigned courses (unless ADMIN)
     * - Default sort is by submission date (oldest first for priority)
     * 
     * @param page page number (0-based)
     * @param size page size (max 100)
     * @param sort sort criteria (e.g., "createdAt,asc" or "weekStartDate,desc")
     * @param courseId optional course ID filter (ADMIN only, ignored for LECTURER)
     * @return paginated list of timesheets pending lecturer approval
     */
    @GetMapping("/pending-approval")
    @PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort,
            @RequestParam(value = "courseId", required = false) Long courseId) {
        
        try {
            // Get current user ID from security context
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // ADR CATAMS-ADR-001: Lecturers are creators, not approvers → forbid access
            boolean isLecturer = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_LECTURER"::equals);
            if (isLecturer) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            Long requesterId = authenticationUtils.getCurrentUserId(authentication);
            
            // Validate pagination parameters
            if (page < 0) page = 0;
            if (size <= 0 || size > 100) size = 20;
            
            // Validate and create pageable with default sort
            Pageable pageable = createPageable(page, size, sort);
            
            // Get pending approval timesheets using application service (returns DTO directly)
            PagedTimesheetResponse response = timesheetApplicationService.getPendingApprovalTimesheetsAsDto(requesterId, pageable);
            
            return ResponseEntity.ok(response);
            
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            // Log the error for debugging in E2E environment
            System.err.println("Error in getPendingApprovalTimesheets: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}