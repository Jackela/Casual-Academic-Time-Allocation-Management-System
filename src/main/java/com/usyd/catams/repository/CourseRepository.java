package com.usyd.catams.repository;

import com.usyd.catams.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    
    /**
     * Find a course by its unique code.
     *
     * @param code the course code
     * @return the course if found
     */
    @Query("SELECT c FROM Course c WHERE c.code.value = :code")
    Optional<Course> findByCode(@Param("code") String code);
    
    /**
     * Find a course by code and active status.
     *
     * @param code the course code
     * @param isActive the active status
     * @return the course if found
     */
    @Query("SELECT c FROM Course c WHERE c.code.value = :code AND c.isActive = :isActive")
    Optional<Course> findByCodeAndIsActive(@Param("code") String code, @Param("isActive") Boolean isActive);
    
    /**
     * Find all courses taught by a specific lecturer.
     *
     * @param lecturerId the lecturer's ID
     * @return list of courses
     */
    List<Course> findByLecturerId(Long lecturerId);
    
    /**
     * Find all active courses taught by a specific lecturer.
     *
     * @param lecturerId the lecturer's ID
     * @param isActive the active status
     * @return list of active courses
     */
    List<Course> findByLecturerIdAndIsActive(Long lecturerId, Boolean isActive);
    
    /**
     * Find all courses for a specific semester.
     *
     * @param semester the semester identifier
     * @return list of courses
     */
    List<Course> findBySemester(String semester);
    
    /**
     * Find all active courses for a specific semester.
     *
     * @param semester the semester identifier
     * @param isActive the active status
     * @return list of active courses
     */
    List<Course> findBySemesterAndIsActive(String semester, Boolean isActive);
    
    /**
     * Find all active courses.
     *
     * @param isActive the active status
     * @return list of active courses
     */
    List<Course> findByIsActive(Boolean isActive);
    
    /**
     * Find courses with paging support.
     *
     * @param pageable the paging information
     * @return page of courses
     */
    Page<Course> findByIsActive(Boolean isActive, Pageable pageable);
    
    /**
     * Find courses by lecturer with paging support.
     *
     * @param lecturerId the lecturer's ID
     * @param pageable the paging information
     * @return page of courses
     */
    Page<Course> findByLecturerId(Long lecturerId, Pageable pageable);
    
    /**
     * Check if a course exists by code.
     *
     * @param code the course code
     * @return true if course exists
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Course c WHERE c.code.value = :code")
    boolean existsByCode(@Param("code") String code);
    
    /**
     * Check if an active course exists by code.
     *
     * @param code the course code
     * @param isActive the active status
     * @return true if active course exists
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Course c WHERE c.code.value = :code AND c.isActive = :isActive")
    boolean existsByCodeAndIsActive(@Param("code") String code, @Param("isActive") Boolean isActive);
    
    /**
     * Get courses with budget usage statistics.
     * Custom query to retrieve courses with calculated budget utilization.
     *
     * @param lecturerId the lecturer's ID (optional, null for all)
     * @return list of courses with budget information
     */
    @Query("SELECT c FROM Course c WHERE (:lecturerId IS NULL OR c.lecturerId = :lecturerId) ORDER BY c.budgetUsed DESC")
    List<Course> findCoursesWithBudgetUsage(@Param("lecturerId") Long lecturerId);
    
    /**
     * Find courses that are running low on budget (budget used > 80% of allocated).
     *
     * @return list of courses with low budget
     */
    @Query("SELECT c FROM Course c WHERE c.budgetUsed.amount > (c.budgetAllocated.amount * 0.8) AND c.isActive = true")
    List<Course> findCoursesWithLowBudget();
    
    /**
     * Find courses that have exceeded their budget.
     *
     * @return list of courses over budget
     */
    @Query("SELECT c FROM Course c WHERE c.budgetUsed.amount > c.budgetAllocated.amount")
    List<Course> findCoursesOverBudget();
    
    /**
     * Get total budget allocated for a lecturer's courses.
     *
     * @param lecturerId the lecturer's ID
     * @return total budget allocated
     */
    @Query("SELECT COALESCE(SUM(c.budgetAllocated.amount), 0) FROM Course c WHERE c.lecturerId = :lecturerId AND c.isActive = true")
    Double getTotalBudgetAllocatedByLecturer(@Param("lecturerId") Long lecturerId);
    
    /**
     * Get total budget used for a lecturer's courses.
     *
     * @param lecturerId the lecturer's ID
     * @return total budget used
     */
    @Query("SELECT COALESCE(SUM(c.budgetUsed.amount), 0) FROM Course c WHERE c.lecturerId = :lecturerId AND c.isActive = true")
    Double getTotalBudgetUsedByLecturer(@Param("lecturerId") Long lecturerId);
    
    /**
     * Check if a lecturer has access to a specific course.
     * Used for authorization checks in dashboard filtering.
     *
     * @param lecturerId the lecturer's ID
     * @param courseId the course ID
     * @return true if lecturer teaches the course
     */
    boolean existsByIdAndLecturerId(Long courseId, Long lecturerId);
}