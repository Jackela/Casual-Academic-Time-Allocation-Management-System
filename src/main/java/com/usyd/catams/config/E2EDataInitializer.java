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
import org.springframework.beans.factory.ObjectProvider;
import org.flywaydb.core.Flyway;
// E2E DB is provided by profile-specific datasource config

/**
 * E2E Test data initializer for end-to-end testing environments
 * 
 * Creates initial test users and courses in the database when running with the 'e2e' or 'e2e-local' profile
 * This initializer uses the exact credentials expected by the E2E test suite
 * Uses PostgreSQL-compatible database for consistency with production environment
 * 
 * @author Development Team
 * @since 1.0
 */
@Configuration
@Profile({"e2e", "e2e-local", "demo"})
public class E2EDataInitializer {
    
    /**
     * Initialize E2E test data on application startup.
     */
    @Bean
    public CommandLineRunner initE2ETestData(
            UserRepository userRepository, 
            CourseRepository courseRepository,
            TimesheetRepository timesheetRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<Flyway> flywayProvider) {
        return args -> {
            flywayProvider.ifAvailable(flyway -> {
                try {
                    flyway.migrate();
                } catch (Exception ignored) {
                    System.out.println("⚠️  Flyway migration skipped or already applied: " + ignored.getMessage());
                }
            });
            System.out.println("\uD83D\uDE80 Starting E2E data initialization...");
            System.out.println("\uD83D\uDCCB Active profiles: " + System.getProperty("spring.profiles.active"));
            
            // Always clear and recreate data for E2E tests to ensure clean state
            try { timesheetRepository.deleteAll(); } catch (Exception ignored) {}
            try { courseRepository.deleteAll(); } catch (Exception ignored) {}
            try { userRepository.deleteAll(); } catch (Exception ignored) {}
            
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
            
            LocalDate today = LocalDate.now();
            LocalDate lastMonday = today.minusDays((today.getDayOfWeek().getValue() + 6) % 7);
            LocalDate twoWeeksAgoMonday = lastMonday.minusDays(7);
            
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

            Timesheet pendingTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                lastMonday,
                new BigDecimal("10.0"),
                new BigDecimal("45.00"),
                "Tutorial sessions and marking for COMP1001",
                lecturerUser.getId()
            );
            pendingTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            upsert.apply(pendingTimesheet);
            
            Timesheet pendingTimesheet2 = new Timesheet(
                tutorUser.getId(),
                course2.getId(),
                twoWeeksAgoMonday,
                new BigDecimal("8.0"),
                new BigDecimal("50.00"),
                "Lab supervision and student consultations",
                lecturerUser.getId()
            );
            pendingTimesheet2.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            upsert.apply(pendingTimesheet2);

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

            Timesheet approvedByTutorTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                lastMonday.minusDays(14),
                new BigDecimal("9.0"),
                new BigDecimal("43.00"),
                "Ready for lecturer final approval",
                lecturerUser.getId()
            );
            approvedByTutorTimesheet.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            upsert.apply(approvedByTutorTimesheet);

            Timesheet approvedByTutorTimesheet2 = new Timesheet(
                tutorUser.getId(),
                course2.getId(),
                twoWeeksAgoMonday.minusDays(21),
                new BigDecimal("8.5"),
                new BigDecimal("44.00"),
                "Second item for lecturer final approval",
                lecturerUser.getId()
            );
            approvedByTutorTimesheet2.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
            upsert.apply(approvedByTutorTimesheet2);

            Timesheet lecturerConfirmedTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                lastMonday.minusDays(21),
                new BigDecimal("9.5"),
                new BigDecimal("46.00"),
                "Awaiting HR final confirmation",
                lecturerUser.getId()
            );
            lecturerConfirmedTimesheet.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
            upsert.apply(lecturerConfirmedTimesheet);

            Timesheet finalConfirmedTimesheet = new Timesheet(
                tutorUser.getId(),
                course2.getId(),
                twoWeeksAgoMonday.minusDays(28),
                new BigDecimal("7.0"),
                new BigDecimal("48.00"),
                "Completed and paid timesheet",
                lecturerUser.getId()
            );
            finalConfirmedTimesheet.setStatus(ApprovalStatus.FINAL_CONFIRMED);
            upsert.apply(finalConfirmedTimesheet);

            Timesheet modificationRequestedTimesheet = new Timesheet(
                tutorUser.getId(),
                course1.getId(),
                lastMonday.minusDays(28),
                new BigDecimal("5.5"),
                new BigDecimal("41.00"),
                "Needs additional clarification from tutor",
                lecturerUser.getId()
            );
            modificationRequestedTimesheet.setStatus(ApprovalStatus.MODIFICATION_REQUESTED);
            upsert.apply(modificationRequestedTimesheet);


            
            System.out.println("✅ E2E test data initialized");
        };
    }
}




