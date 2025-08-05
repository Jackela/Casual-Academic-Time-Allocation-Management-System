package com.usyd.catams.service;

import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.enums.UserRole;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Dashboard service interface responsible for generating role-based dashboard summaries
 * 
 * Provides aggregated metrics and insights based on user role:
 * - TUTOR: Personal timesheet summary
 * - LECTURER: Course-level summaries for managed courses  
 * - ADMIN: System-wide administrative summary
 * 
 * @author Development Team
 * @since 1.0
 */
public interface DashboardService {

    /**
     * Get dashboard summary based on user role and optional filters
     * 
     * Returns role-appropriate aggregated data including timesheet metrics,
     * pending approvals, budget information, and workload analysis
     * 
     * @param userId ID of the authenticated user
     * @param role User role (TUTOR, LECTURER, ADMIN)
     * @param courseId Optional course filter (LECTURER/ADMIN only)
     * @param startDate Optional start date for metrics calculation
     * @param endDate Optional end date for metrics calculation
     * @return Role-specific dashboard summary
     * @throws com.usyd.catams.exception.BusinessException when user lacks permission for courseId filter
     * @throws com.usyd.catams.exception.AuthenticationException when role is invalid
     */
    DashboardSummaryResponse getDashboardSummary(Long userId, UserRole role, 
                                                Optional<Long> courseId, 
                                                LocalDate startDate, LocalDate endDate);
}