package com.usyd.catams.repository;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * Find timesheets within a date range.
     *
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @return list of timesheets
     */
    List<Timesheet> findByWeekStartDateBetween(LocalDate startDate, LocalDate endDate);
    
    /**
     * Find timesheets for a tutor within a date range.
     *
     * @param tutorId the tutor's ID
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @return list of timesheets
     */
    List<Timesheet> findByTutorIdAndWeekStartDateBetween(Long tutorId, LocalDate startDate, LocalDate endDate);
    
    /**
     * Check if a timesheet exists for the unique combination of tutor, course, and week.
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @return true if timesheet exists
     */
    boolean existsByTutorIdAndCourseIdAndWeekStartDate(Long tutorId, Long courseId, LocalDate weekStartDate);
    
    /**
     * Find existing timesheet for the unique combination (used for duplicate checking).
     *
     * @param tutorId the tutor's ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @return the existing timesheet if found
     */
    Optional<Timesheet> findByTutorIdAndCourseIdAndWeekStartDate(Long tutorId, Long courseId, LocalDate weekStartDate);
    
    /**
     * Get all timesheets with optional filtering and paging.
     * Used for admin queries with flexible filtering.
     *
     * @param tutorId optional tutor ID filter
     * @param courseId optional course ID filter
     * @param status optional status filter
     * @param pageable paging information
     * @return page of timesheets
     */
    @Query("SELECT t FROM Timesheet t WHERE " +
           "(:tutorId IS NULL OR t.tutorId = :tutorId) AND " +
           "(:courseId IS NULL OR t.courseId = :courseId) AND " +
           "(:status IS NULL OR t.status = :status)")
    Page<Timesheet> findWithFilters(@Param("tutorId") Long tutorId,
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
    @Query("SELECT COALESCE(SUM(t.hours * t.hourlyRate), 0) FROM Timesheet t WHERE " +
           "t.tutorId = :tutorId AND t.courseId = :courseId AND t.status = 'FINAL_APPROVED'")
    BigDecimal getTotalApprovedPayByTutorAndCourse(@Param("tutorId") Long tutorId, @Param("courseId") Long courseId);
    
    /**
     * Get total budget used (approved timesheets) for a course.
     *
     * @param courseId the course ID
     * @return total budget used
     */
    @Query("SELECT COALESCE(SUM(t.hours * t.hourlyRate), 0) FROM Timesheet t WHERE " +
           "t.courseId = :courseId AND t.status = 'FINAL_APPROVED'")
    BigDecimal getTotalApprovedBudgetUsedByCourse(@Param("courseId") Long courseId);
    
    /**
     * Get pending timesheets for a specific approver based on role.
     * For tutors: timesheets in PENDING_TUTOR_REVIEW status for themselves
     * For HR: timesheets in PENDING_HR_REVIEW status
     *
     * @param approverId the approver's ID
     * @param isHR whether the approver is HR
     * @return list of pending timesheets
     */
    @Query("SELECT t FROM Timesheet t WHERE " +
           "((:isHR = true AND t.status = 'PENDING_HR_REVIEW') OR " +
           "(:isHR = false AND t.tutorId = :approverId AND t.status = 'PENDING_TUTOR_REVIEW'))")
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
     * Find timesheets with PENDING_LECTURER_APPROVAL status for courses taught by a specific lecturer.
     * Used for the GET /api/timesheets/pending-approval endpoint.
     *
     * @param lecturerId the lecturer's ID
     * @param pageable paging and sorting information
     * @return page of timesheets pending lecturer approval for the lecturer's courses
     */
    @Query("SELECT t FROM Timesheet t, Course c " +
           "WHERE t.courseId = c.id AND t.status = 'PENDING_LECTURER_APPROVAL' AND c.lecturerId = :lecturerId")
    Page<Timesheet> findPendingLecturerApprovalByCourses(@Param("lecturerId") Long lecturerId, Pageable pageable);
    
    /**
     * Find all timesheets with PENDING_LECTURER_APPROVAL status (for ADMIN users).
     * Used for the GET /api/timesheets/pending-approval endpoint.
     *
     * @param pageable paging and sorting information
     * @return page of all timesheets pending lecturer approval
     */
    Page<Timesheet> findByStatusOrderByCreatedAtAsc(ApprovalStatus status, Pageable pageable);
}