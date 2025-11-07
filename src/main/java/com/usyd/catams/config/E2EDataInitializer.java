package com.usyd.catams.config;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.LecturerAssignment;
import com.usyd.catams.entity.TutorAssignment;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.entity.PolicyVersion;
import com.usyd.catams.entity.RateAmount;
import com.usyd.catams.entity.RateCode;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.PolicyVersionRepository;
import com.usyd.catams.repository.RateAmountRepository;
import com.usyd.catams.repository.RateCodeRepository;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
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
            LecturerAssignmentRepository lecturerAssignmentRepository,
            TutorAssignmentRepository tutorAssignmentRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<Flyway> flywayProvider,
            RateCodeRepository rateCodeRepository,
            PolicyVersionRepository policyVersionRepository,
            RateAmountRepository rateAmountRepository) {
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

            User lecturerTwo = new User(
                "lecturer2@example.com",
                "Dr. Sam Lee",
                passwordEncoder.encode("Lecturer123!"),
                UserRole.LECTURER
            );
            userRepository.save(lecturerTwo);
            
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

            Course course3 = new Course();
            course3.setCode("COMP3001");
            course3.setName("Advanced Algorithms");
            course3.setSemester("Semester 2, 2025");
            course3.setLecturerId(lecturerTwo.getId());
            course3.setBudgetAllocated(new java.math.BigDecimal("15000.00"));
            course3.setIsActive(true);
            courseRepository.save(course3);
            
            // Create lecturer assignments for proper access control
            LecturerAssignment assignment1 = new LecturerAssignment(lecturerUser.getId(), course1.getId());
            lecturerAssignmentRepository.save(assignment1);
            
            LecturerAssignment assignment2 = new LecturerAssignment(lecturerUser.getId(), course2.getId());
            lecturerAssignmentRepository.save(assignment2);
            
            LecturerAssignment assignment3 = new LecturerAssignment(lecturerTwo.getId(), course3.getId());
            lecturerAssignmentRepository.save(assignment3);
            
            System.out.println("✅ Created lecturer assignments");
            
            // Create tutor assignments for proper access control
            TutorAssignment tutorAssignment1 = new TutorAssignment(tutorUser.getId(), course1.getId());
            tutorAssignmentRepository.save(tutorAssignment1);
            
            TutorAssignment tutorAssignment2 = new TutorAssignment(tutorUser.getId(), course2.getId());
            tutorAssignmentRepository.save(tutorAssignment2);
            
            TutorAssignment tutorAssignment3 = new TutorAssignment(tutorUser.getId(), course3.getId());
            tutorAssignmentRepository.save(tutorAssignment3);
            
            System.out.println("✅ Created tutor assignments");
            
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
            pendingTimesheet.setTaskType(TimesheetTaskType.TUTORIAL);
            pendingTimesheet.setQualification(TutorQualification.STANDARD);
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
            pendingTimesheet2.setTaskType(TimesheetTaskType.ORAA);
            pendingTimesheet2.setQualification(TutorQualification.STANDARD);
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
            draftTimesheet.setTaskType(TimesheetTaskType.MARKING);
            draftTimesheet.setQualification(TutorQualification.STANDARD);
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
            rejectedTimesheet.setTaskType(TimesheetTaskType.TUTORIAL);
            rejectedTimesheet.setQualification(TutorQualification.STANDARD);
            upsert.apply(rejectedTimesheet);

            Timesheet crossCourseTimesheet = new Timesheet(
                tutorUser.getId(),
                course3.getId(),
                twoWeeksAgoMonday,
                new BigDecimal("5.0"),
                new BigDecimal("55.00"),
                "Cross-course seeding for lecturer2",
                lecturerTwo.getId()
            );
            crossCourseTimesheet.setStatus(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
            crossCourseTimesheet.setTaskType(TimesheetTaskType.DEMO);
            crossCourseTimesheet.setQualification(TutorQualification.PHD);
            upsert.apply(crossCourseTimesheet);

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
            approvedByTutorTimesheet.setTaskType(TimesheetTaskType.TUTORIAL);
            approvedByTutorTimesheet.setQualification(TutorQualification.STANDARD);
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
            approvedByTutorTimesheet2.setTaskType(TimesheetTaskType.ORAA);
            approvedByTutorTimesheet2.setQualification(TutorQualification.STANDARD);
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
            lecturerConfirmedTimesheet.setTaskType(TimesheetTaskType.MARKING);
            lecturerConfirmedTimesheet.setQualification(TutorQualification.COORDINATOR);
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
            finalConfirmedTimesheet.setTaskType(TimesheetTaskType.TUTORIAL);
            finalConfirmedTimesheet.setQualification(TutorQualification.STANDARD);
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
            modificationRequestedTimesheet.setTaskType(TimesheetTaskType.ORAA);
            modificationRequestedTimesheet.setQualification(TutorQualification.STANDARD);
            upsert.apply(modificationRequestedTimesheet);

            seedSchedule1Rates(rateCodeRepository, policyVersionRepository, rateAmountRepository);

            
            System.out.println("✅ E2E test data initialized");
        };
    }

    private void seedSchedule1Rates(RateCodeRepository rateCodeRepository,
                                    PolicyVersionRepository policyVersionRepository,
                                    RateAmountRepository rateAmountRepository) {
        PolicyVersion policy = policyVersionRepository.findAll().stream()
            .filter(p -> "EA-2023-2026-Schedule-1".equals(p.getEaReference()))
            .findFirst()
            .orElseGet(() -> {
                PolicyVersion version = new PolicyVersion();
                version.setEaReference("EA-2023-2026-Schedule-1");
                version.setMajorVersion(2023);
                version.setMinorVersion(0);
                version.setEffectiveFrom(LocalDate.of(2022, 7, 1));
                version.setEffectiveTo(null);
                version.setSourceDocumentUrl("University-of-Sydney-Enterprise-Agreement-2023-2026.pdf");
                version.setNotes("Seeded for e2e-local profile to exercise Schedule 1 calculator");
                return policyVersionRepository.save(version);
            });

        RateCode tu1 = ensureRateCode(rateCodeRepository,
            "TU1",
            TimesheetTaskType.TUTORIAL,
            "Tutorial rate – PhD holder or unit coordinator (1h delivery + up to 2h associated)",
            new BigDecimal("2.00"),
            new BigDecimal("1.00"),
            true,
            false,
            "Schedule 1 – Tutoring");

        RateCode tu2 = ensureRateCode(rateCodeRepository,
            "TU2",
            TimesheetTaskType.TUTORIAL,
            "Tutorial rate – standard eligibility (1h delivery + up to 2h associated)",
            new BigDecimal("2.00"),
            new BigDecimal("1.00"),
            false,
            false,
            "Schedule 1 – Tutoring");

        RateCode ao1 = ensureRateCode(rateCodeRepository,
            "AO1_DE1",
            TimesheetTaskType.ORAA,
            "Other required academic activity – PhD holder or unit coordinator (hourly)",
            BigDecimal.ZERO,
            BigDecimal.ONE,
            true,
            false,
            "Schedule 1 Clause 3.1(a) – ORAA");

        RateCode ao2 = ensureRateCode(rateCodeRepository,
            "AO2_DE2",
            TimesheetTaskType.ORAA,
            "Other required academic activity – standard eligibility (hourly)",
            BigDecimal.ZERO,
            BigDecimal.ONE,
            false,
            false,
            "Schedule 1 Clause 3.1(a) – ORAA");

        LocalDate effectiveFrom = LocalDate.of(2025, 7, 1);
        LocalDate effectiveTo = LocalDate.of(2026, 5, 31);

        ensureRateAmount(rateAmountRepository, policy, tu1, TutorQualification.PHD,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("218.07"),
            new BigDecimal("2.00"), new BigDecimal("3.00"),
            "Schedule 1 – Tutoring (1 July 2025)");

        ensureRateAmount(rateAmountRepository, policy, tu1, TutorQualification.COORDINATOR,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("218.07"),
            new BigDecimal("2.00"), new BigDecimal("3.00"),
            "Schedule 1 – Tutoring (1 July 2025)");

        ensureRateAmount(rateAmountRepository, policy, tu2, TutorQualification.STANDARD,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("182.54"),
            new BigDecimal("2.00"), new BigDecimal("3.00"),
            "Schedule 1 – Tutoring (1 July 2025)");

        ensureRateAmount(rateAmountRepository, policy, ao1, TutorQualification.PHD,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("72.33"),
            BigDecimal.ZERO, BigDecimal.ONE,
            "Schedule 1 – ORAA (1 July 2025)");

        ensureRateAmount(rateAmountRepository, policy, ao1, TutorQualification.COORDINATOR,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("72.33"),
            BigDecimal.ZERO, BigDecimal.ONE,
            "Schedule 1 – ORAA (1 July 2025)");

        ensureRateAmount(rateAmountRepository, policy, ao2, TutorQualification.STANDARD,
            "2025-07", effectiveFrom, effectiveTo, new BigDecimal("60.51"),
            BigDecimal.ZERO, BigDecimal.ONE,
            "Schedule 1 – ORAA (1 July 2025)");
    }

    private RateCode ensureRateCode(RateCodeRepository rateCodeRepository,
                                    String code,
                                    TimesheetTaskType taskType,
                                    String description,
                                    BigDecimal defaultAssociated,
                                    BigDecimal defaultDelivery,
                                    boolean requiresPhd,
                                    boolean repeatable,
                                    String clauseReference) {
        return rateCodeRepository.findByCode(code).orElseGet(() -> {
            RateCode rateCode = new RateCode();
            rateCode.setCode(code);
            rateCode.setTaskType(taskType);
            rateCode.setDescription(description);
            rateCode.setDefaultAssociatedHours(defaultAssociated);
            rateCode.setDefaultDeliveryHours(defaultDelivery);
            rateCode.setRequiresPhd(requiresPhd);
            rateCode.setRepeatable(repeatable);
            rateCode.setEaClauseReference(clauseReference);
            return rateCodeRepository.save(rateCode);
        });
    }

    private void ensureRateAmount(RateAmountRepository rateAmountRepository,
                                  PolicyVersion policyVersion,
                                  RateCode rateCode,
                                  TutorQualification qualification,
                                  String yearLabel,
                                  LocalDate effectiveFrom,
                                  LocalDate effectiveTo,
                                  BigDecimal hourlyRate,
                                  BigDecimal maxAssociatedHours,
                                  BigDecimal maxPayableHours,
                                  String notes) {
        RateAmount rateAmount = new RateAmount();
        rateAmount.setRateCode(rateCode);
        rateAmount.setPolicyVersion(policyVersion);
        rateAmount.setYearLabel(yearLabel);
        rateAmount.setEffectiveFrom(effectiveFrom);
        rateAmount.setEffectiveTo(effectiveTo);
        rateAmount.setHourlyAmountAud(hourlyRate);
        rateAmount.setMaxAssociatedHours(maxAssociatedHours);
        rateAmount.setMaxPayableHours(maxPayableHours);
        rateAmount.setQualification(qualification);
        rateAmount.setNotes(notes);
        rateAmountRepository.save(rateAmount);
    }
}




