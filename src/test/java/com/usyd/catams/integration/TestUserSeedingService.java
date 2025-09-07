package com.usyd.catams.integration;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Service for seeding test users with separate transaction management.
 * 
 * This service ensures that seeded test users are committed to the database
 * and available to JWT authentication filters during integration tests.
 * 
 * @author Integration Test Infrastructure
 */
@Service
public class TestUserSeedingService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CourseRepository courseRepository;
    
    @Autowired
    private TimesheetRepository timesheetRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Seeds test users in a separate transaction that gets committed immediately.
     * This ensures the users are available to JWT authentication filters.
     * Uses idempotent operations to ensure consistent state across multiple test classes.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void seedTestUsers() {
        // Check if users are already seeded to prevent duplicate seeding across test classes
        if (userRepository.findByEmailAndIsActive("admin@integration.test", true).isPresent()) {
            return; // Users already seeded, skip to prevent ID conflicts
        }
        
        // Clean existing test users first
        cleanTestUsers();
        
        // Create and persist test users that match JWT token emails from TestAuthenticationHelper
        String defaultPassword = "testPassword123";
        String hashedPassword = passwordEncoder.encode(defaultPassword);
        
        var testAdmin = TestDataBuilder.anAdmin()
            .withId(1L)
            .withEmail("admin@integration.test")
            .withName("Test Admin")
            .withHashedPassword(hashedPassword)
            .build();
        userRepository.save(testAdmin);
        
        var testLecturer = TestDataBuilder.aLecturer()
            .withId(2L)  // Use unique ID, but TestAuthenticationHelper will pass lecturerId=1L
            .withEmail("lecturer1@integration.test")  // Matches TestAuthenticationHelper pattern
            .withName("Test Lecturer 1")
            .withHashedPassword(hashedPassword)
            .build();
        userRepository.save(testLecturer);
        
        var testTutor = TestDataBuilder.aTutor()
            .withId(3L)  // Use unique ID, but TestAuthenticationHelper will pass tutorId=1L  
            .withEmail("tutor1@integration.test")     // Matches TestAuthenticationHelper pattern
            .withName("Test Tutor 1")
            .withHashedPassword(hashedPassword) 
            .build();
        userRepository.save(testTutor);
        
        // Create test courses for the lecturer 
        Course testCourse1 = new Course();
        testCourse1.setName("COMP1001 - Introduction to Programming");
        testCourse1.setCode("COMP1001");
        testCourse1.setSemester("2024S1");
        testCourse1.setLecturerId(2L); // Lecturer ID
        testCourse1.setIsActive(true);
        testCourse1.setBudgetAllocated(BigDecimal.valueOf(10000.00));
        courseRepository.save(testCourse1);
        
        Course testCourse2 = new Course();
        testCourse2.setName("COMP2001 - Data Structures");
        testCourse2.setCode("COMP2001"); 
        testCourse2.setSemester("2024S1");
        testCourse2.setLecturerId(2L); // Lecturer ID
        testCourse2.setIsActive(true);
        testCourse2.setBudgetAllocated(BigDecimal.valueOf(8000.00));
        courseRepository.save(testCourse2);
        
        // Create test timesheets for dashboard data
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);
        
        Timesheet testTimesheet1 = new Timesheet();
        testTimesheet1.setTutorId(3L); // Tutor ID
        testTimesheet1.setCourseId(testCourse1.getId());
        testTimesheet1.setWeekStartDate(monday);
        testTimesheet1.setHours(BigDecimal.valueOf(10.0));
        testTimesheet1.setHourlyRate(BigDecimal.valueOf(25.00));
        testTimesheet1.setDescription("Tutorial sessions and grading");
        testTimesheet1.setStatus(ApprovalStatus.DRAFT);
        testTimesheet1.setCreatedBy(2L); // Created by lecturer
        timesheetRepository.save(testTimesheet1);
        
        Timesheet testTimesheet2 = new Timesheet();
        testTimesheet2.setTutorId(3L); // Tutor ID
        testTimesheet2.setCourseId(testCourse2.getId());
        testTimesheet2.setWeekStartDate(monday.minusWeeks(1));
        testTimesheet2.setHours(BigDecimal.valueOf(8.0));
        testTimesheet2.setHourlyRate(BigDecimal.valueOf(25.00));
        testTimesheet2.setDescription("Lab assistance");
        testTimesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        testTimesheet2.setCreatedBy(2L); // Created by lecturer
        timesheetRepository.save(testTimesheet2);
        
        // Force flush to ensure persistence
        userRepository.flush();
        courseRepository.flush();
        timesheetRepository.flush();
    }

    /**
     * Cleans up test users in a separate transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cleanTestUsers() {
        // Delete in proper order due to foreign key constraints
        timesheetRepository.deleteAll();
        courseRepository.deleteAll();
        userRepository.deleteAll();
        
        // Reset database sequence to ensure consistent IDs
        timesheetRepository.flush();
        courseRepository.flush();
        userRepository.flush();
    }
}