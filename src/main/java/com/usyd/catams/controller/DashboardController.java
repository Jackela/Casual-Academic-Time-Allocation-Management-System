package com.usyd.catams.controller;

import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.BusinessException;
import com.usyd.catams.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Dashboard controller providing role-based dashboard summaries
 * 
 * Handles GET /api/dashboard/summary endpoint with role-based authorization
 * and parameter validation. Supports optional filtering by course, semester,
 * and custom date ranges.
 * 
 * @author Development Team
 * @since 1.0
 */
@RestController
@RequestMapping("/api/dashboard")
@PreAuthorize("hasRole('TUTOR') or hasRole('LECTURER') or hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;
    private static final Pattern SEMESTER_PATTERN = Pattern.compile("^\\d{4}-[12]$");

    @Autowired
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Get dashboard summary based on authenticated user's role
     * 
     * Returns role-appropriate aggregated data including timesheet metrics,
     * pending approvals, budget information (LECTURER/ADMIN only), and workload analysis.
     * 
     * Access Rules:
     * - TUTOR: Personal timesheet summary only (courseId filter forbidden)
     * - LECTURER: Course-level summaries for managed courses only
     * - ADMIN: System-wide summary with optional course filtering
     * 
     * @param courseId Optional course filter (LECTURER/ADMIN only)
     * @param semester Optional semester filter (YYYY-S format, e.g., "2025-1")
     * @param startDate Optional start date for metrics calculation (YYYY-MM-DD)
     * @param endDate Optional end date for metrics calculation (YYYY-MM-DD)
     * @param authentication Current user authentication context
     * @return Role-appropriate dashboard summary
     * @throws BusinessException when TUTOR attempts course filtering or invalid parameters
     */
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary(
            @RequestParam(value = "courseId", required = false) Long courseId,
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "startDate", required = false) 
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) 
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication) {

        // Extract user details from authentication
        Long userId = extractUserId(authentication);
        UserRole userRole = extractUserRole(authentication);
        
        // Validate and build date range
        LocalDate[] dateRange = buildDateRange(startDate, endDate, semester);
        LocalDate effectiveStartDate = dateRange[0];
        LocalDate effectiveEndDate = dateRange[1];

        // Get role-appropriate dashboard summary
        DashboardSummaryResponse summary = dashboardService.getDashboardSummary(
            userId, 
            userRole, 
            Optional.ofNullable(courseId),
            effectiveStartDate,
            effectiveEndDate
        );

        return ResponseEntity.ok(summary);
    }

    /**
     * Extract user ID from Spring Security authentication
     */
    private Long extractUserId(Authentication authentication) {
        // For this implementation, we'll use a simple approach
        // In a real system, this would extract from JWT token or UserDetails
        String username = authentication.getName();
        try {
            return Long.parseLong(username);
        } catch (NumberFormatException e) {
            // Fallback for non-numeric usernames - in real system would query user by username
            return 1L; // Default for testing
        }
    }

    /**
     * Extract user role from Spring Security authentication
     */
    private UserRole extractUserRole(Authentication authentication) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String role = authority.getAuthority();
            if (role.startsWith("ROLE_")) {
                String roleName = role.substring(5); // Remove "ROLE_" prefix
                try {
                    return UserRole.valueOf(roleName);
                } catch (IllegalArgumentException e) {
                    // Continue checking other authorities
                }
            }
        }
        throw new BusinessException("AUTH_FAILED", "No valid role found in authentication");
    }

    /**
     * Validate and build date range for dashboard queries
     * 
     * Supports three input modes:
     * 1. Semester format (YYYY-S): Converts to semester date range
     * 2. Custom date range: Uses provided startDate and endDate
     * 3. Default: Current semester if no parameters provided
     * 
     * @param startDate Optional start date
     * @param endDate Optional end date  
     * @param semester Optional semester (YYYY-S format)
     * @return Array with [startDate, endDate]
     * @throws BusinessException for invalid parameters
     */
    private LocalDate[] buildDateRange(LocalDate startDate, LocalDate endDate, String semester) {
        if (semester != null) {
            // Validate semester format: YYYY-S
            if (!SEMESTER_PATTERN.matcher(semester).matches()) {
                throw new BusinessException("VALIDATION_FAILED", 
                    "Invalid semester format. Use YYYY-S (e.g., 2025-1)");
            }
            return buildSemesterDateRange(semester);
        }
        
        if (startDate != null && endDate != null) {
            if (startDate.isAfter(endDate)) {
                throw new BusinessException("VALIDATION_FAILED", 
                    "Start date cannot be after end date");
            }
            return new LocalDate[]{startDate, endDate};
        }
        
        if (startDate != null || endDate != null) {
            throw new BusinessException("VALIDATION_FAILED", 
                "Both startDate and endDate must be provided when using custom date range");
        }
        
        // Default to current semester
        return buildCurrentSemesterDateRange();
    }

    /**
     * Build date range for a specific semester
     * 
     * @param semester Semester in YYYY-S format (e.g., "2025-1")
     * @return Array with [startDate, endDate] for the semester
     */
    private LocalDate[] buildSemesterDateRange(String semester) {
        String[] parts = semester.split("-");
        int year = Integer.parseInt(parts[0]);
        int semesterNumber = Integer.parseInt(parts[1]);
        
        LocalDate startDate;
        LocalDate endDate;
        
        if (semesterNumber == 1) {
            // Semester 1: February to June
            startDate = LocalDate.of(year, 2, 1);
            endDate = LocalDate.of(year, 6, 30);
        } else {
            // Semester 2: July to November  
            startDate = LocalDate.of(year, 7, 1);
            endDate = LocalDate.of(year, 11, 30);
        }
        
        return new LocalDate[]{startDate, endDate};
    }

    /**
     * Build date range for current semester
     * 
     * Determines current semester based on current date:
     * - January-June: Semester 1
     * - July-December: Semester 2
     * 
     * @return Array with [startDate, endDate] for current semester
     */
    private LocalDate[] buildCurrentSemesterDateRange() {
        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();
        
        if (currentMonth <= 6) {
            // Currently in Semester 1 (Feb-Jun)
            return new LocalDate[]{
                LocalDate.of(currentYear, 2, 1),
                LocalDate.of(currentYear, 6, 30)
            };
        } else {
            // Currently in Semester 2 (Jul-Nov)
            return new LocalDate[]{
                LocalDate.of(currentYear, 7, 1),
                LocalDate.of(currentYear, 11, 30)
            };
        }
    }
}