package com.usyd.catams.integration;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.LecturerAssignment;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

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
    private LecturerAssignmentRepository lecturerAssignmentRepository;
    
    @Autowired
    private TimesheetRepository timesheetRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private TransactionTemplate transactionTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    private record SeededUsers(Long adminId, Long lecturerId, Long tutorId) {}

    /**
     * Seeds test users in a separate transaction that gets committed immediately.
     * This ensures the users are available to JWT authentication filters.
     * Uses idempotent operations to ensure consistent state across multiple test classes.
     */
    public void seedTestUsers() {
        // Check if users are already seeded to prevent duplicate seeding across test classes
        if (userRepository.findByEmailAndIsActive("admin@integration.test", true).isPresent()) {
            return; // Users already seeded, skip to prevent ID conflicts
        }
        
        // Clean existing test data first - separate transaction
        transactionTemplate.executeWithoutResult(status -> {
            timesheetRepository.deleteAll();
            timesheetRepository.flush();
            lecturerAssignmentRepository.deleteAll();
            lecturerAssignmentRepository.flush();
            courseRepository.deleteAll();
            courseRepository.flush();
            userRepository.deleteAll();
            userRepository.flush();
            resetIdentityColumns();
        });
        
        SeededUsers seededUsers = transactionTemplate.execute(status -> seedUsers());

        // Seed dependent entities - separate transaction after users committed
        transactionTemplate.executeWithoutResult(status -> seedCoursesAndTimesheets(seededUsers));
    }
    
    /**
     * Seeds only users. Called within transaction context.
     * Must complete before courses can reference lecturer_id.
     */
    private SeededUsers seedUsers() {
        // Create and persist test users that match JWT token emails from TestAuthenticationHelper
        String defaultPassword = "testPassword123";
        String hashedPassword = passwordEncoder.encode(defaultPassword);
        
        var savedAdmin = userRepository.save(TestDataBuilder.anAdmin()
            .withId(1L)
            .withEmail("admin@integration.test")
            .withName("Test Admin")
            .withHashedPassword(hashedPassword)
            .build());
        
        var savedLecturer = userRepository.save(TestDataBuilder.aLecturer()
            .withId(2L)
            .withEmail("lecturer1@integration.test")
            .withName("Test Lecturer 1")
            .withHashedPassword(hashedPassword)
            .build());
        
        var savedTutor = userRepository.save(TestDataBuilder.aTutor()
            .withId(3L)
            .withEmail("tutor1@integration.test")
            .withName("Test Tutor 1")
            .withHashedPassword(hashedPassword) 
            .build());
        
        // Force flush and commit to ensure users are persisted before dependent entities
        userRepository.flush();
        return new SeededUsers(savedAdmin.getId(), savedLecturer.getId(), savedTutor.getId());
    }
    
    /**
     * Seeds courses and timesheets. Called within transaction context.
     * Requires users to be already committed to database.
     */
    private void seedCoursesAndTimesheets(SeededUsers seededUsers) {
        // Verify users exist before creating dependent entities
        if (!userRepository.findByEmailAndIsActive("lecturer1@integration.test", true).isPresent()) {
            throw new IllegalStateException("Users must be seeded before courses and timesheets");
        }
        Long lecturerId = seededUsers.lecturerId();
        Long tutorId = seededUsers.tutorId();
        
        // Create test courses for the lecturer 
        Course testCourse1 = new Course();
        testCourse1.setName("COMP1001 - Introduction to Programming");
        testCourse1.setCode("COMP1001");
        testCourse1.setSemester("2024S1");
        testCourse1.setLecturerId(lecturerId); // Lecturer ID - now guaranteed to exist
        testCourse1.setIsActive(true);
        testCourse1.setBudgetAllocated(BigDecimal.valueOf(10000.00));
        courseRepository.save(testCourse1);
        
        Course testCourse2 = new Course();
        testCourse2.setName("COMP2001 - Data Structures");
        testCourse2.setCode("COMP2001"); 
        testCourse2.setSemester("2024S1");
        testCourse2.setLecturerId(lecturerId); // Lecturer ID - now guaranteed to exist
        testCourse2.setIsActive(true);
        testCourse2.setBudgetAllocated(BigDecimal.valueOf(8000.00));
        courseRepository.save(testCourse2);
        
        courseRepository.flush();

        // Link lecturer to courses for access control
        lecturerAssignmentRepository.save(new LecturerAssignment(lecturerId, testCourse1.getId()));
        lecturerAssignmentRepository.save(new LecturerAssignment(lecturerId, testCourse2.getId()));

        lecturerAssignmentRepository.flush();
        
        // Create test timesheets for dashboard data
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);
        
        Timesheet testTimesheet1 = new Timesheet();
        testTimesheet1.setTutorId(tutorId); // Tutor ID - now guaranteed to exist
        testTimesheet1.setCourseId(testCourse1.getId());
        testTimesheet1.setWeekStartDate(monday);
        testTimesheet1.setHours(BigDecimal.valueOf(10.0));
        testTimesheet1.setHourlyRate(BigDecimal.valueOf(25.00));
        testTimesheet1.setDescription("Tutorial sessions and grading");
        testTimesheet1.setStatus(ApprovalStatus.DRAFT);
        testTimesheet1.setCreatedBy(lecturerId); // Created by lecturer
        timesheetRepository.save(testTimesheet1);
        
        Timesheet testTimesheet2 = new Timesheet();
        testTimesheet2.setTutorId(tutorId); // Tutor ID - now guaranteed to exist
        testTimesheet2.setCourseId(testCourse2.getId());
        testTimesheet2.setWeekStartDate(monday.minusWeeks(1));
        testTimesheet2.setHours(BigDecimal.valueOf(8.0));
        testTimesheet2.setHourlyRate(BigDecimal.valueOf(25.00));
        testTimesheet2.setDescription("Lab assistance");
        testTimesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        testTimesheet2.setCreatedBy(lecturerId); // Created by lecturer
        timesheetRepository.save(testTimesheet2);
        
        timesheetRepository.flush();
    }

    private void resetIdentityColumns() {
        resetIdentity("users");
        resetIdentity("courses");
        resetIdentity("timesheets");
        resetIdentity("lecturer_assignments");
    }

    private void resetIdentity(String tableName) {
        String alterIdentity = "ALTER TABLE " + tableName + " ALTER COLUMN id RESTART WITH 1";
        String alterSequence = "ALTER SEQUENCE " + tableName + "_id_seq RESTART WITH 1";
        try {
            entityManager.createNativeQuery(alterIdentity).executeUpdate();
        } catch (Exception ex) {
            try {
                entityManager.createNativeQuery(alterSequence).executeUpdate();
            } catch (Exception ignored) {
                // No-op: sequence may not exist in H2 or already reset
            }
        }
    }

}
