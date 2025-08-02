package com.usyd.catams.controller;

import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.dto.request.TimesheetUpdateRequest;
import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.dto.response.ErrorResponse;
import com.usyd.catams.mapper.TimesheetMapper;
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
import org.springframework.security.core.context.SecurityContextHolder;
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

    private final TimesheetService timesheetService;
    private final TimesheetMapper timesheetMapper;

    @Autowired
    public TimesheetController(TimesheetService timesheetService, TimesheetMapper timesheetMapper) {
        this.timesheetService = timesheetService;
        this.timesheetMapper = timesheetMapper;
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
        Long creatorId = getCurrentUserId(authentication);

        // Create timesheet using service layer
        Timesheet createdTimesheet = timesheetService.createTimesheet(
            request.getTutorId(),
            request.getCourseId(),
            request.getWeekStartDate(),
            request.getHours(),
            request.getHourlyRate(),
            request.getDescription(),
            creatorId
        );

        // Convert to response DTO
        TimesheetResponse response = timesheetMapper.toResponse(createdTimesheet);

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
        Long requesterId = getCurrentUserId(authentication);

        // Get timesheets using service layer (with access control)
        Page<Timesheet> timesheetsPage = timesheetService.getTimesheets(
            tutorId, courseId, status, requesterId, pageable
        );

        // Convert to response DTO
        PagedTimesheetResponse response = timesheetMapper.toPagedResponse(timesheetsPage);

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
        Long requesterId = getCurrentUserId(authentication);

        // Get timesheet using service layer (with access control)
        Optional<Timesheet> timesheetOpt = timesheetService.getTimesheetById(id, requesterId);

        if (timesheetOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Convert to response DTO
        TimesheetResponse response = timesheetMapper.toResponse(timesheetOpt.get());

        return ResponseEntity.ok(response);
    }

    /**
     * Update an existing timesheet.
     * 
     * Only LECTURER and ADMIN users can update timesheets.
     * Business rules:
     * - Only DRAFT status timesheets can be updated
     * - LECTURER can update timesheets for courses they teach
     * - ADMIN can update any timesheet
     * - Updated timesheet status remains DRAFT
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<TimesheetResponse> updateTimesheet(
            @PathVariable("id") Long id,
            @Valid @RequestBody TimesheetUpdateRequest request,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = getCurrentUserId(authentication);

        // Update timesheet using service layer
        Timesheet updatedTimesheet = timesheetService.updateTimesheet(
            id,
            request.getHours(),
            request.getHourlyRate(),
            request.getDescription(),
            requesterId
        );

        // Convert to response DTO
        TimesheetResponse response = timesheetMapper.toResponse(updatedTimesheet);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete an existing timesheet.
     * 
     * Only LECTURER and ADMIN users can delete timesheets.
     * Business rules:
     * - Only DRAFT status timesheets can be deleted
     * - LECTURER can delete timesheets for courses they teach
     * - ADMIN can delete any timesheet
     * - Deletion is permanent
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTimesheet(
            @PathVariable("id") Long id,
            Authentication authentication) {

        // Get current user ID from authentication context
        Long requesterId = getCurrentUserId(authentication);

        // Delete timesheet using service layer
        timesheetService.deleteTimesheet(id, requesterId);

        // Return 204 No Content as per OpenAPI specification
        return ResponseEntity.noContent().build();
    }

    // Helper methods

    /**
     * Extract user ID from authentication context.
     * 
     * @param authentication the authentication object
     * @return the user ID
     */
    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new SecurityException("Authentication required");
        }

        // Extract user ID from authentication principal
        // The principal is a User object as set by JwtAuthenticationFilter
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof com.usyd.catams.entity.User) {
            return ((com.usyd.catams.entity.User) principal).getId();
        } else if (principal instanceof Long) {
            return (Long) principal;
        } else if (principal instanceof String) {
            try {
                return Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                throw new SecurityException("Invalid user ID in authentication context");
            }
        } else {
            throw new SecurityException("Invalid authentication principal type: " + principal.getClass().getName());
        }
    }

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
    @PreAuthorize("hasRole('LECTURER') or hasRole('ADMIN')")
    public ResponseEntity<PagedTimesheetResponse> getPendingApprovalTimesheets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,asc") String sort,
            @RequestParam(value = "courseId", required = false) Long courseId) {
        
        try {
            // Get current user ID from security context
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            Long requesterId = getCurrentUserId(authentication);
            
            // Validate and create pageable with default sort
            Pageable pageable = createPageable(page, size, sort);
            
            // Get pending approval timesheets
            Page<Timesheet> timesheetPage = timesheetService.getPendingApprovalTimesheets(requesterId, pageable);
            
            // Convert to response DTO
            PagedTimesheetResponse response = timesheetMapper.toPagedResponse(timesheetPage);
            
            return ResponseEntity.ok(response);
            
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}