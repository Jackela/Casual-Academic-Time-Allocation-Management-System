package com.usyd.catams.repository;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
    
    @EntityGraph(attributePaths = {"approvals"})
    @Query("SELECT t FROM Timesheet t WHERE t.id = :id")
    Optional<Timesheet> findByIdWithApprovals(@Param("id") Long id);
    
    /**
     * Find all timesheets for a specific tutor.
     *
     * @param tutorId the tutor's ID
     * @return list of timesheets
     */
    List<Timesheet> findByTutorId(Long tutorId);
    
    /**
     * Find all timesheets for a specific tutor with paging.
     *
     * @param tutorId the tutor's ID
     * @param pageable the paging information
     * @return page of timesheets
     */
    Page<Timesheet> findByTutorId(Long tutorId, Pageable pageable);
    
    /**
     * Find all timesheets for a specific tutor ordered by creation date (newest first).
     * Used by GET /api/timesheets/me endpoint.
     *
     * @param tutorId the tutor's ID
     * @param pageable the paging information
     * @return page of timesheets ordered by creation date descending
     */
    @EntityGraph(attributePaths = {"approvals"})
    Page<Timesheet> findByTutorIdOrderByCreatedAtDesc(Long tutorId, Pageable pageable);
    
    /**
     * Find all timesheets for a specific course.
     *
     * @param courseId the course ID
     * @return list of timesheets
     */
    List<Timesheet> findByCourseId(Long courseId);
    
    /**
     * Find all timesheets for a specific course with paging.
     *
     * @param courseId the course ID
     * @param pageable the paging information
     * @return page of timesheets
     */
    Page<Timesheet> findByCourseId(Long courseId, Pageable pageable);
    
    /**
     * Find timesheets by tutor and course.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @return list of timesheets
     */
    List<Timesheet> findByTutorIdAndCourseId(Long tutorId, Long courseId);
    
    /**
     * Find timesheets by tutor and course with paging.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param pageable the paging information
     * @return page of timesheets
     */
    Page<Timesheet> findByTutorIdAndCourseId(Long tutorId, Long courseId, Pageable pageable);
    
    /**
     * Find timesheets by status.
     *
     * @param status the approval status
     * @return list of timesheets
     */
    List<Timesheet> findByStatus(ApprovalStatus status);
    
    /**
     * Find timesheets by status with paging.
     *
     * @param status the approval status
     * @param pageable the paging information
     * @return page of timesheets
     */
    Page<Timesheet> findByStatus(ApprovalStatus status, Pageable pageable);
    
    /**
     * Find timesheets by status and tutor with paging ordered by creation time ascending.
     */
    @EntityGraph(attributePaths = {"approvals"})
    Page<Timesheet> findByStatusAndTutorIdOrderByCreatedAtAsc(ApprovalStatus status, Long tutorId, Pageable pageable);
    
    /**
     * Find timesheets by multiple status values.
     *
     * @param statuses the approval statuses to match
     * @return list of timesheets
     */
    List<Timesheet> findByStatusIn(List<ApprovalStatus> statuses);
    
    /**
     * Find timesheets by tutor and status.
     *
     * @param tutorId the tutor's ID
     * @param status the approval status
     * @return list of timesheets
     */
    List<Timesheet> findByTutorIdAndStatus(Long tutorId, ApprovalStatus status);
    
    /**
     * Find timesheets by course and status.
     *
     * @param courseId the course ID
     * @param status the approval status
     * @return list of timesheets
     */
    List<Timesheet> findByCourseIdAndStatus(Long courseId, ApprovalStatus status);
    
    /**
     * Find timesheets by multiple courses and status.
     *
     * @param courseIds list of course IDs
     * @param status approval status
     * @return matching timesheets
     */
    List<Timesheet> findByCourseIdInAndStatus(List<Long> courseIds, ApprovalStatus status);
    
    /**
     * Find timesheets within a date range.
     *
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @return list of timesheets
     */
    List<Timesheet> findByWeekPeriod_WeekStartDateBetween(LocalDate startDate, LocalDate endDate);

    /**
     * Find timesheets for a tutor within a date range.
     *
     * @param tutorId the tutor's ID
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @return list of timesheets
     */
    List<Timesheet> findByTutorIdAndWeekPeriod_WeekStartDateBetween(Long tutorId, LocalDate startDate, LocalDate endDate);

    /**
     * Check if a timesheet exists for the unique combination of tutor, course, and week.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @return true if timesheet exists
     */
    boolean existsByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(Long tutorId, Long courseId, LocalDate weekStartDate);

    /**
     * Find existing timesheet for the unique combination (used for duplicate checking).
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @return the existing timesheet if found
     */
    Optional<Timesheet> findByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(Long tutorId, Long courseId, LocalDate weekStartDate);

    /**
     * Get all timesheets with optional filtering and paging.
     * Used for admin queries with flexible filtering.
     * Eagerly fetches approvals collection to prevent LazyInitializationException in mapper.
     *
     * @param tutorId optional tutor ID filter
     * @param courseId optional course ID filter
     * @param status optional status filter
     * @param pageable paging information
     * @return page of timesheets
     */
    @EntityGraph(attributePaths = {"approvals"})
    @Query("SELECT t FROM Timesheet t WHERE " +
           "(:tutorId IS NULL OR t.tutorId = :tutorId) AND " +
           "(:courseId IS NULL OR t.courseId = :courseId) AND " +
           "(:status IS NULL OR t.status = :status)")
    Page<Timesheet> findWithFilters(@Param("tutorId") Long tutorId,
                                   @Param("courseId") Long courseId,
                                   @Param("status") ApprovalStatus status,
                                   Pageable pageable);

    /**
     * Lecturer-scoped listing with optional status filter, restricted to lecturer's courses and
     * tutors assigned to those courses.
     */
    @EntityGraph(attributePaths = {"approvals"})
    @Query("SELECT t FROM Timesheet t WHERE " +
           "t.courseId IN (SELECT c.id FROM Course c WHERE c.lecturerId = :lecturerId) AND " +
           "EXISTS (SELECT 1 FROM TutorAssignment a WHERE a.tutorId = t.tutorId AND a.courseId = t.courseId) AND " +
           "(:status IS NULL OR t.status = :status)")
    Page<Timesheet> findWithLecturerScope(@Param("lecturerId") Long lecturerId,
                                          @Param("status") ApprovalStatus status,
                                          Pageable pageable);

    /**
     * Lecturer-scoped listing for a specific course with optional status filter and assignment check.
     */
    @EntityGraph(attributePaths = {"approvals"})
    @Query("SELECT t FROM Timesheet t WHERE " +
           "t.courseId = :courseId AND EXISTS (SELECT 1 FROM TutorAssignment a WHERE a.tutorId = t.tutorId AND a.courseId = t.courseId) AND " +
           "t.courseId IN (SELECT c.id FROM Course c WHERE c.lecturerId = :lecturerId) AND " +
           "(:status IS NULL OR t.status = :status)")
    Page<Timesheet> findWithLecturerScopeByCourse(@Param("lecturerId") Long lecturerId,
                                                  @Param("courseId") Long courseId,
                                                  @Param("status") ApprovalStatus status,
                                                  Pageable pageable);

    /**
     * Get total hours worked by a tutor for a specific course.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @return total hours
     */
    @Query("SELECT COALESCE(SUM(t.hours), 0) FROM Timesheet t WHERE t.tutorId = :tutorId AND t.courseId = :courseId")
    BigDecimal getTotalHoursByTutorAndCourse(@Param("tutorId") Long tutorId, @Param("courseId") Long courseId);

    /**
     * Get total pay for approved timesheets by tutor and course.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @return total pay amount
     */
    @Query("SELECT COALESCE(SUM(t.hours * t.hourlyRate.amount), 0) FROM Timesheet t WHERE " +
           "t.tutorId = :tutorId AND t.courseId = :courseId AND t.status = 'FINAL_CONFIRMED'")
    BigDecimal getTotalApprovedPayByTutorAndCourse(@Param("tutorId") Long tutorId, @Param("courseId") Long courseId);

    /**
     * Get total budget used (approved timesheets) for a course.
     *
     * @param courseId the course ID
     * @return total budget used
     */
    @Query("SELECT COALESCE(SUM(t.hours * t.hourlyRate.amount), 0) FROM Timesheet t WHERE " +
           "t.courseId = :courseId AND t.status = 'FINAL_CONFIRMED'")
    BigDecimal getTotalApprovedBudgetUsedByCourse(@Param("courseId") Long courseId);

    /**
     * Get pending timesheets for a specific approver based on role.
     * For tutors: timesheets in PENDING_TUTOR_CONFIRMATION status assigned to them
     * For HR/final approvers: timesheets in LECTURER_CONFIRMED status
     *
     * @param approverId the approver's ID
     * @param isHR whether the approver is HR
     * @return list of pending timesheets
     */
    @Query("SELECT t FROM Timesheet t WHERE " +
           "(:isHR = true AND t.status = 'LECTURER_CONFIRMED') OR " +
           "(:isHR = false AND t.status = 'PENDING_TUTOR_CONFIRMATION' AND t.tutorId = :approverId)")
    List<Timesheet> findPendingTimesheetsForApprover(@Param("approverId") Long approverId, @Param("isHR") boolean isHR);
    
    /**
     * Find timesheets created by a specific user (lecturer).
     *
     * @param createdBy the creator's ID
     * @return list of timesheets
     */
    List<Timesheet> findByCreatedBy(Long createdBy);
    
    /**
     * Find timesheets created by a specific user with paging.
     *
     * @param createdBy the creator's ID
     * @param pageable paging information
     * @return page of timesheets
     */
    Page<Timesheet> findByCreatedBy(Long createdBy, Pageable pageable);
    
    /**
     * Find timesheets with PENDING_TUTOR_CONFIRMATION status for courses taught by a specific lecturer.
     * Used for the GET /api/timesheets/pending-approval endpoint.
     *
     * @param lecturerId the lecturer's ID
     * @param pageable paging and sorting information
     * @return page of timesheets pending tutor confirmation for the lecturer's courses
     */
    @Query("SELECT t FROM Timesheet t WHERE t.status = 'PENDING_TUTOR_CONFIRMATION' AND t.courseId IN " +
           "(SELECT c.id FROM Course c WHERE c.lecturerId = :lecturerId)")
    Page<Timesheet> findPendingLecturerApprovalByCourses(@Param("lecturerId") Long lecturerId, Pageable pageable);
    
    /**
     * Find all timesheets with PENDING_TUTOR_CONFIRMATION status (for ADMIN users).
     * Used for the GET /api/timesheets/pending-approval endpoint.
     *
     * @param pageable paging and sorting information
     * @return page of all timesheets pending tutor confirmation
     */
    @EntityGraph(attributePaths = {"approvals"})
    Page<Timesheet> findByStatusOrderByCreatedAtAsc(ApprovalStatus status, Pageable pageable);

    /**
     * Find timesheets with TUTOR_CONFIRMED status for courses taught by a specific lecturer.
     * Used for the GET /api/timesheets/pending-final-approval endpoint.
     *
     * @param lecturerId the lecturer's ID
     * @param pageable paging and sorting information
     * @return page of timesheets confirmed by tutor, awaiting lecturer final confirmation
     */
    @Query("SELECT t FROM Timesheet t WHERE t.status = 'TUTOR_CONFIRMED' AND t.courseId IN " +
           "(SELECT c.id FROM Course c WHERE c.lecturerId = :lecturerId)")
    Page<Timesheet> findApprovedByTutorByCourses(@Param("lecturerId") Long lecturerId, Pageable pageable);

    /**
     * Same as findApprovedByTutorByCourses but ensures the tutor is assigned to the course via TutorAssignment.
     */
    @Query("SELECT t FROM Timesheet t WHERE t.status = 'TUTOR_CONFIRMED' AND t.courseId IN " +
           "(SELECT c.id FROM Course c WHERE c.lecturerId = :lecturerId) AND EXISTS (" +
           "SELECT 1 FROM TutorAssignment a WHERE a.tutorId = t.tutorId AND a.courseId = t.courseId)")
    Page<Timesheet> findApprovedByTutorByCoursesWithAssignment(@Param("lecturerId") Long lecturerId, Pageable pageable);
    
    /**
     * Load a timesheet with its approvals using fetch join to avoid N+1 when history is required.
     */
    @Query("select t from Timesheet t left join fetch t.approvals where t.id = :id")
    Optional<Timesheet> findWithApprovalsById(@Param("id") Long id);
    
    // ==================== DASHBOARD AGGREGATION QUERIES ====================
    
    /**
     * Get timesheet aggregation data for dashboard - TUTOR scope.
     * Returns summary metrics for efficient dashboard rendering.
     *
     * @param tutorId the tutor's ID
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    @Query("SELECT new com.usyd.catams.dto.TimesheetSummaryData(" +
           "COUNT(t), " +
           "COALESCE(SUM(t.hours), 0), " +
           "COALESCE(SUM(t.hours * t.hourlyRate.amount), 0), " +
           "SUM(CASE WHEN t.status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', " +
           "'MODIFICATION_REQUESTED') THEN 1L ELSE 0L END)) " +
           "FROM Timesheet t " +
           "WHERE t.tutorId = :tutorId " +
           "AND t.weekPeriod.weekStartDate BETWEEN :startDate AND :endDate")
    TimesheetSummaryData findTimesheetSummaryByTutorNative(
        @Param("tutorId") Long tutorId,
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get timesheet aggregation data for dashboard - TUTOR scope.
     * Returns summary metrics for efficient dashboard rendering.
     *
     * @param tutorId the tutor's ID
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    default TimesheetSummaryData findTimesheetSummaryByTutor(
        Long tutorId, LocalDate startDate, LocalDate endDate) {
        return findTimesheetSummaryByTutorNative(tutorId, startDate, endDate);
    }
    
    /**
     * Get timesheet aggregation data for dashboard - LECTURER scope.
     * Returns summary metrics for courses managed by a lecturer.
     *
     * @param courseIds list of course IDs managed by the lecturer
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    @Query("SELECT new com.usyd.catams.dto.TimesheetSummaryData(" +
           "COUNT(t), " +
           "COALESCE(SUM(t.hours), 0), " +
           "COALESCE(SUM(t.hours * t.hourlyRate.amount), 0), " +
           "SUM(CASE WHEN t.status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', " +
           "'MODIFICATION_REQUESTED') THEN 1L ELSE 0L END)) " +
           "FROM Timesheet t " +
           "WHERE t.courseId IN :courseIds " +
           "AND t.weekPeriod.weekStartDate BETWEEN :startDate AND :endDate")
    TimesheetSummaryData findTimesheetSummaryByCoursesNative(
        @Param("courseIds") List<Long> courseIds,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get timesheet aggregation data for dashboard - LECTURER scope.
     * Returns summary metrics for courses managed by a lecturer.
     *
     * @param courseIds list of course IDs managed by the lecturer
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    default TimesheetSummaryData findTimesheetSummaryByCourses(
        List<Long> courseIds, LocalDate startDate, LocalDate endDate) {
        return findTimesheetSummaryByCoursesNative(courseIds, startDate, endDate);
    }
    
    /**
     * Get timesheet aggregation data for dashboard - ADMIN scope.
     * Returns system-wide summary metrics.
     *
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    @Query("SELECT new com.usyd.catams.dto.TimesheetSummaryData(" +
           "COUNT(t), " +
           "COALESCE(SUM(t.hours), 0), " +
           "COALESCE(SUM(t.hours * t.hourlyRate.amount), 0), " +
           "SUM(CASE WHEN t.status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', " +
           "'MODIFICATION_REQUESTED') THEN 1L ELSE 0L END)) " +
           "FROM Timesheet t " +
           "WHERE t.weekPeriod.weekStartDate BETWEEN :startDate AND :endDate")
    TimesheetSummaryData findTimesheetSummarySystemWideNative(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get timesheet aggregation data for dashboard - ADMIN scope.
     * Returns system-wide summary metrics.
     *
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    default TimesheetSummaryData findTimesheetSummarySystemWide(
        LocalDate startDate, LocalDate endDate) {
        return findTimesheetSummarySystemWideNative(startDate, endDate);
    }
    
    /**
     * Get timesheet aggregation data for a specific course (ADMIN filter).
     *
     * @param courseId the course ID
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    @Query("SELECT new com.usyd.catams.dto.TimesheetSummaryData(" +
           "COUNT(t), " +
           "COALESCE(SUM(t.hours), 0), " +
           "COALESCE(SUM(t.hours * t.hourlyRate.amount), 0), " +
           "SUM(CASE WHEN t.status IN ('PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', " +
           "'MODIFICATION_REQUESTED') THEN 1L ELSE 0L END)) " +
           "FROM Timesheet t " +
           "WHERE t.courseId = :courseId " +
           "AND t.weekPeriod.weekStartDate BETWEEN :startDate AND :endDate")
    TimesheetSummaryData findTimesheetSummaryByCourseNative(
        @Param("courseId") Long courseId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * Get timesheet aggregation data for a specific course (ADMIN filter).
     *
     * @param courseId the course ID
     * @param startDate start date for filtering (inclusive)
     * @param endDate end date for filtering (inclusive)
     * @return aggregated timesheet summary data
     */
    default TimesheetSummaryData findTimesheetSummaryByCourse(
        Long courseId, LocalDate startDate, LocalDate endDate) {
        return findTimesheetSummaryByCourseNative(courseId, startDate, endDate);
    }
    
    
}
