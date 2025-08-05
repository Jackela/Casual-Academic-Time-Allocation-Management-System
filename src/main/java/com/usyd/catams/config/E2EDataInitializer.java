package com.usyd.catams.config;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.TimesheetRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
// E2E DB is provided by E2EDatabaseConfig under e2e profile

/**
 * E2E Test data initializer for end-to-end testing environments
 * 
 * Creates initial test users and courses in the database when running with the 'e2e' profile
 * This initializer uses the exact credentials expected by the E2E test suite
 * Uses embedded PostgreSQL database for consistency with production environment
 * 
 * @author Development Team
 * @since 1.0
 */
@Configuration
@Profile("e2e")
public class E2EDataInitializer {
    
    // Database is provided by E2EDatabaseConfig when 'e2e' profile is active
    
    /**
     * Initialize E2E test data on application startup
     * 
     * @param userRepository User repository for database operations
     * @param courseRepository Course repository for database operations
     * @param passwordEncoder Password encoder for hashing passwords
     * @return CommandLineRunner that executes data initialization
     */
    @Bean
    public CommandLineRunner initE2ETestData(
            UserRepository userRepository, 
            CourseRepository courseRepository,
            TimesheetRepository timesheetRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            System.out.println("🚀 Starting E2E data initialization...");
            System.out.println("📋 Active profiles: " + System.getProperty("spring.profiles.active"));
            System.out.println("🔧 Environment check - Profile: e2e");
            
            // Always clear and recreate data for E2E tests to ensure clean state
            timesheetRepository.deleteAll();
            userRepository.deleteAll();
            courseRepository.deleteAll();
            
            // Create E2E test users with exact credentials from test fixtures
            User adminUser = new User(
                "admin@example.com",
                "Admin User",
                passwordEncoder.encode("Admin123!"),
                UserRole.ADMIN
            );
            userRepository.save(adminUser);
            
            User lecturerUser = new User(
                "lecturer@example.com",
                "Dr. Jane Smith",
                passwordEncoder.encode("Lecturer123!"),
                UserRole.LECTURER
            );
            userRepository.save(lecturerUser);
            
            User tutorUser = new User(
                "tutor@example.com",
                "John Doe",
                passwordEncoder.encode("Tutor123!"),
                UserRole.TUTOR
            );
            userRepository.save(tutorUser);
            
            // Create test courses for timesheet testing
            Course course1 = new Course();
            course1.setCode("COMP1001");
            course1.setName("Introduction to Programming");
            course1.setSemester("Semester 1, 2025");
            course1.setLecturerId(lecturerUser.getId());
            course1.setBudgetAllocated(new java.math.BigDecimal("10000.00"));
            course1.setIsActive(true);
            courseRepository.save(course1);
            
            Course course2 = new Course();
            course2.setCode("COMP2001");
            course2.setName("Data Structures and Algorithms");
            course2.setSemester("Semester 1, 2025");
            course2.setLecturerId(lecturerUser.getId());
            course2.setBudgetAllocated(new java.math.BigDecimal("12000.00"));
            course2.setIsActive(true);
            courseRepository.save(course2);
            
            // Create test timesheets for E2E testing (PENDING_TUTOR_REVIEW status)
            // Calculate last Monday and the Monday before that
            LocalDate today = LocalDate.now();
            LocalDate lastMonday = today.minusDays(today.getDayOfWeek().getValue() - 1);
            if (lastMonday.equals(today)) {
                lastMonday = lastMonday.minusDays(7); // If today is Monday, get previous Monday
            }
            LocalDate twoWeeksAgoMonday = lastMonday.minusDays(7);
            
            Timesheet timesheet1 = new Timesheet(
                tutorUser.getId(),              // tutorId (assignee)
                course1.getId(),                // courseId  
                lastMonday,                     // weekStartDate (last Monday)
                new BigDecimal("10.0"),         // hours
                new BigDecimal("45.00"),        // hourlyRate
                "Tutorial sessions and marking for COMP1001", // description
                lecturerUser.getId()            // createdBy (creator must be lecturer per test plan)
            );
            timesheet1.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            timesheetRepository.save(timesheet1);
            
            Timesheet timesheet2 = new Timesheet(
                tutorUser.getId(),              // tutorId (assignee)
                course2.getId(),                // courseId
                twoWeeksAgoMonday,              // weekStartDate (two weeks ago Monday)
                new BigDecimal("8.0"),          // hours
                new BigDecimal("50.00"),        // hourlyRate
                "Lab supervision and student consultations", // description
                lecturerUser.getId()            // createdBy (creator must be lecturer per test plan)
            );
            timesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            timesheetRepository.save(timesheet2);
            
            System.out.println("✅ E2E test data initialized:");
            System.out.println("   - Users: " + userRepository.count());
            System.out.println("   - Courses: " + courseRepository.count());
            System.out.println("   - Timesheets: " + timesheetRepository.count());
            System.out.println("   - Admin: admin@example.com / Admin123!");
            System.out.println("   - Lecturer: lecturer@example.com / Lecturer123!");
            System.out.println("   - Tutor: tutor@example.com / Tutor123!");
        };
    }
}