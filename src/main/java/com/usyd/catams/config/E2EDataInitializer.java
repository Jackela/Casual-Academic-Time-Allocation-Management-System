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
            // Be defensive: clear in dependency-safe order and ignore errors
            try { timesheetRepository.deleteAll(); } catch (Exception ignored) {}
            try { courseRepository.deleteAll(); } catch (Exception ignored) {}
            try { userRepository.deleteAll(); } catch (Exception ignored) {}
            
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
            
            // Create test timesheets for E2E testing
            // Calculate last Monday and the Monday before that
            LocalDate today = LocalDate.now();
            LocalDate lastMonday = today.minusDays((today.getDayOfWeek().getValue() + 6) % 7);
            LocalDate twoWeeksAgoMonday = lastMonday.minusDays(7);
            
            // Helper: idempotent create or update timesheet by unique key
            java.util.function.Function<Timesheet, Timesheet> upsert = (ts) -> {
                return timesheetRepository
                    .findByTutorIdAndCourseIdAndWeekPeriod_WeekStartDate(ts.getTutorId(), ts.getCourseId(), ts.getWeekStartDate())
                    .map(existing -> {
                        existing.setHours(ts.getHours());
                        existing.setHourlyRate(ts.getHourlyRate());
                        existing.setDescription(ts.getDescription());
                        existing.setStatus(ts.getStatus());
                        return timesheetRepository.save(existing);
                    })
                    .orElseGet(() -> timesheetRepository.save(ts));
            };

            // Pending item for approval/rejection flows
            Timesheet pendingTimesheet = new Timesheet(
                tutorUser.getId(),              // tutorId (assignee)
                course1.getId(),                // courseId  
                lastMonday,                     // weekStartDate (last Monday)
                new BigDecimal("10.0"),         // hours
                new BigDecimal("45.00"),        // hourlyRate
                "Tutorial sessions and marking for COMP1001", // description
                lecturerUser.getId()            // createdBy (creator must be lecturer per test plan)
            );
            pendingTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            upsert.apply(pendingTimesheet);
            
            // Another pending item
            Timesheet pendingTimesheet2 = new Timesheet(
                tutorUser.getId(),              // tutorId (assignee)
                course2.getId(),                // courseId
                twoWeeksAgoMonday,              // weekStartDate (two weeks ago Monday)
                new BigDecimal("8.0"),          // hours
                new BigDecimal("50.00"),        // hourlyRate
                "Lab supervision and student consultations", // description
                lecturerUser.getId()            // createdBy (creator must be lecturer per test plan)
            );
            pendingTimesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_REVIEW);
            upsert.apply(pendingTimesheet2);

            // DRAFT timesheet (editable by tutor; used by draft -> submit flow)
            Timesheet draftTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                twoWeeksAgoMonday.minusDays(7),
                new BigDecimal("6.0"),
                new BigDecimal("40.00"),
                "Draft: preparation and materials review",
                lecturerUser.getId()
            );
            draftTimesheet.setStatus(ApprovalStatus.DRAFT);
            upsert.apply(draftTimesheet);

            // REJECTED timesheet (to test rejection workflow and subsequent edit)
            Timesheet rejectedTimesheet = new Timesheet(
                tutorUser.getId(),
                course2.getId(),
                twoWeeksAgoMonday.minusDays(14),
                new BigDecimal("7.5"),
                new BigDecimal("42.00"),
                "Rejected: incorrect hours; requires update",
                lecturerUser.getId()
            );
            rejectedTimesheet.setStatus(ApprovalStatus.REJECTED);
            upsert.apply(rejectedTimesheet);

            // APPROVED_BY_TUTOR timesheet (in lecturer's pending queue for final approval/rejection)
            Timesheet approvedByTutorTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                lastMonday.minusDays(14),
                new BigDecimal("9.0"),
                new BigDecimal("43.00"),
                "Ready for lecturer final approval",
                lecturerUser.getId()
            );
            approvedByTutorTimesheet.setStatus(ApprovalStatus.APPROVED_BY_TUTOR);
            upsert.apply(approvedByTutorTimesheet);

            // Another APPROVED_BY_TUTOR timesheet to avoid workflow test contention
            Timesheet approvedByTutorTimesheet2 = new Timesheet(
                tutorUser.getId(),
                course2.getId(),
                twoWeeksAgoMonday.minusDays(21),
                new BigDecimal("8.5"),
                new BigDecimal("44.00"),
                "Second item for lecturer final approval",
                lecturerUser.getId()
            );
            approvedByTutorTimesheet2.setStatus(ApprovalStatus.APPROVED_BY_TUTOR);
            upsert.apply(approvedByTutorTimesheet2);
            
            System.out.println("✅ E2E test data initialized:");
            System.out.println("   - Users: " + userRepository.count());
            System.out.println("   - Courses: " + courseRepository.count());
            System.out.println("   - Timesheets: " + timesheetRepository.count());
            System.out.println("   - Seeded statuses: PENDING x2, DRAFT x1, REJECTED x1");
            System.out.println("   - Admin: admin@example.com / Admin123!");
            System.out.println("   - Lecturer: lecturer@example.com / Lecturer123!");
            System.out.println("   - Tutor: tutor@example.com / Tutor123!");
        };
    }
}