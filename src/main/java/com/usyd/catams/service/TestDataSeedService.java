package com.usyd.catams.service;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.common.domain.model.WeekPeriod;
import com.usyd.catams.common.domain.model.Money;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Profile({"test", "e2e", "e2e-local"})
public class TestDataSeedService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TestDataSeedService.class);

    private final CourseRepository courseRepository;
    private final LecturerAssignmentRepository lecturerAssignmentRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final TutorAssignmentRepository tutorAssignmentRepository;
    private final TimesheetRepository timesheetRepository;

    public TestDataSeedService(CourseRepository courseRepository, UserRepository userRepository, LecturerAssignmentRepository lecturerAssignmentRepository, TutorAssignmentRepository tutorAssignmentRepository, TimesheetRepository timesheetRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.lecturerAssignmentRepository = lecturerAssignmentRepository;
        this.tutorAssignmentRepository = tutorAssignmentRepository;
        this.timesheetRepository = timesheetRepository;
    }

    @Transactional
    public void ensureLecturerCourses(Long lecturerId) {
        if (lecturerId == null || lecturerId <= 0) {
            throw new IllegalArgumentException("lecturerId must be a positive number");
        }

        // Idempotent upsert by globally-unique course code to avoid unique constraint conflicts
        // Using real University of Sydney course codes for demo authenticity
        ensureCourseByCode("COMP1001", "Introduction to Programming", lecturerId, new BigDecimal("15000"));
        ensureCourseByCode("INFO1110", "Introduction to Programming", lecturerId, new BigDecimal("12000"));

        LOGGER.info("Ensured courses for lecturer {} exist and are active: COMP1001, INFO1110", lecturerId);

        // Ensure lecturer assignments match courses for test determinism
        var courses = courseRepository.findByLecturerIdAndIsActive(lecturerId, true);
        for (var c : courses) {
            if (!lecturerAssignmentRepository.existsByLecturerIdAndCourseId(lecturerId, c.getId())) {
                lecturerAssignmentRepository.save(new com.usyd.catams.entity.LecturerAssignment(lecturerId, c.getId()));
            }
        }
    }

    private void ensureCourseByCode(String code, String name, Long lecturerId, BigDecimal budgetAllocated) {
        courseRepository.findByCode(code).ifPresentOrElse(existing -> {
            // Update ownership/metadata to requested lecturer deterministically for test environments
            existing.setName(name);
            existing.setSemester(currentSemester());
            existing.setLecturerId(lecturerId);
            existing.setBudgetAllocated(budgetAllocated);
            existing.setIsActive(true);
            courseRepository.save(existing);
        }, () -> {
            Course course = new Course(new CourseCode(code), name, currentSemester(), lecturerId, new Money(budgetAllocated));
            course.setIsActive(true);
            courseRepository.save(course);
        });
    }

    @Transactional
    public void ensureBasicTutors() {
        // Create or update a couple of active tutors deterministically
        upsertTutor("tutor@example.com", "E2E Tutor One", "Tutor123!");
        upsertTutor("tutor2@example.com", "E2E Tutor Two", "Tutor123!");
    }

    /**
     * Ensure seeded tutors are assigned to all active courses owned by the lecturer.
     * Idempotent via repository upsert semantics.
     */
    @Transactional
    public void ensureTutorAssignmentsForLecturerCourses(Long lecturerId) {
        if (lecturerId == null || lecturerId <= 0) return;
        var courses = courseRepository.findByLecturerIdAndIsActive(lecturerId, true);
        if (courses == null || courses.isEmpty()) return;
        var tutorEmails = java.util.List.of("tutor@example.com", "tutor2@example.com");
        for (String email : tutorEmails) {
            var opt = userRepository.findByEmail(email);
            if (opt.isEmpty()) continue;
            Long tutorId = opt.get().getId();
            for (var c : courses) {
                try {
                    if (!tutorAssignmentRepository.existsByTutorIdAndCourseId(tutorId, c.getId())) {
                        tutorAssignmentRepository.save(new com.usyd.catams.entity.TutorAssignment(tutorId, c.getId()));
                    }
                } catch (Exception e) {
                    // tolerate duplicates or transient errors in test seeding
                }
            }
        }
    }

    /**
     * Seed a minimal set of timesheets to exercise approval queues for Tutor/Lecturer/Admin.
     * Creates at most 3 items for the first active course owned by the lecturer, using the seeded tutor(s).
     * Idempotent: checks existing (tutor, course, weekStartDate) before insert to avoid unique constraint violation.
     */
    @Transactional
    public void ensureMinimalApprovalSamples(Long lecturerId) {
        if (lecturerId == null || lecturerId <= 0) return;
        var courses = courseRepository.findByLecturerIdAndIsActive(lecturerId, true);
        if (courses == null || courses.isEmpty()) return;

        Long courseId = courses.get(0).getId();
        // Prefer the canonical tutor; fallback to the second one
        Long tutorId = userRepository.findByEmail("tutor@example.com").map(com.usyd.catams.entity.User::getId)
                .or(() -> userRepository.findByEmail("tutor2@example.com").map(com.usyd.catams.entity.User::getId))
                .orElse(null);
        if (tutorId == null) return;

        // Ensure assignment exists (defensive, H2-compatible)
        try {
            if (!tutorAssignmentRepository.existsByTutorIdAndCourseId(tutorId, courseId)) {
                tutorAssignmentRepository.save(new com.usyd.catams.entity.TutorAssignment(tutorId, courseId));
            }
        } catch (Exception ignored) {}

        java.time.LocalDate monday0 = java.time.LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        java.time.LocalDate monday1 = monday0.minusWeeks(1);
        java.time.LocalDate monday2 = monday0.minusWeeks(2);

        seedOneIfAbsent(tutorId, courseId, monday2, ApprovalStatus.PENDING_TUTOR_CONFIRMATION, lecturerId);
        seedOneIfAbsent(tutorId, courseId, monday1, ApprovalStatus.TUTOR_CONFIRMED, lecturerId);
        seedOneIfAbsent(tutorId, courseId, monday0, ApprovalStatus.LECTURER_CONFIRMED, lecturerId);
    }

    private void seedOneIfAbsent(Long tutorId, Long courseId, java.time.LocalDate weekStartDate, ApprovalStatus status, Long createdBy) {
        var existing = timesheetRepository.findByTutorIdAndCourseId(tutorId, courseId)
                .stream()
                .anyMatch(t -> weekStartDate.equals(t.getWeekStartDate()));
        if (existing) return;

        Timesheet t = new Timesheet();
        t.setTutorId(tutorId);
        t.setCourseId(courseId);
        t.setWeekPeriod(new WeekPeriod(weekStartDate));
        t.setSessionDate(weekStartDate);
        t.setHours(new java.math.BigDecimal("1.0"));
        t.setHourlyRate(new Money(new java.math.BigDecimal("60.00")));
        t.setDescription("E2E seed sample");
        t.setStatus(status);
        t.setCreatedBy(createdBy);
        t.setDeliveryHours(new java.math.BigDecimal("1.0"));
        t.setAssociatedHours(new java.math.BigDecimal("0.0"));
        t.setCalculatedAmount(new java.math.BigDecimal("60.00"));
        try { timesheetRepository.save(t); } catch (Exception ignored) {}
    }

    @Transactional
    public void ensureBasicLecturer() {
        upsertUserWithRole("lecturer@example.com", "E2E Lecturer", "Lecturer123!", UserRole.LECTURER);
    }

    /**
     * Resolve an effective lecturerId for test seeding. Prefer the canonical
     * lecturer@example.com user if present to avoid mismatched ownership.
     */
    @Transactional(readOnly = true)
    public Long resolveLecturerId(Long requested) {
        var u = userRepository.findByEmail("lecturer@example.com");
        if (u.isPresent()) {
            return u.get().getId();
        }
        return (requested != null && requested > 0) ? requested : null;
    }

    @Transactional
    public void ensureBasicAdmin() {
        upsertUserWithRole("admin@example.com", "E2E Admin", "Admin123!", UserRole.ADMIN);
    }

    private void upsertTutor(String email, String name, String rawPassword) {
        userRepository.findByEmail(email).ifPresentOrElse(existing -> {
            // Normalize to an active TUTOR for test determinism; keep existing password
            existing.setName(name);
            existing.setRole(UserRole.TUTOR);
            existing.setActive(true);
            userRepository.save(existing);
        }, () -> {
            String hashed = passwordEncoder.encode(rawPassword);
            User user = new User(email, name, hashed, UserRole.TUTOR);
            user.setActive(true);
            userRepository.save(user);
        });
    }

    private void upsertUserWithRole(String email, String name, String rawPassword, UserRole role) {
        userRepository.findByEmail(email).ifPresentOrElse(existing -> {
            existing.setName(name);
            existing.setRole(role);
            existing.setActive(true);
            userRepository.save(existing);
        }, () -> {
            String hashed = passwordEncoder.encode(rawPassword);
            User user = new User(email, name, hashed, role);
            user.setActive(true);
            userRepository.save(user);
        });
    }

    /**
     * Build a manifest of baseline test accounts for UAT documentation purposes.
     * Only available in test/e2e profiles.
     */
    @Transactional(readOnly = true)
    public java.util.List<java.util.Map<String, Object>> buildAccountManifest() {
        java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
        java.util.function.BiConsumer<String, String> addIfExists = (email, passwordHint) -> {
            userRepository.findByEmail(email).ifPresent(user -> {
                java.util.Map<String, Object> item = new java.util.HashMap<>();
                item.put("id", user.getId());
                item.put("email", user.getEmail());
                item.put("role", user.getRole().name());
                item.put("active", user.getIsActive());
                item.put("password", passwordHint);
                out.add(item);
            });
        };
        addIfExists.accept("admin@example.com", "Admin123!");
        addIfExists.accept("lecturer@example.com", "Lecturer123!");
        addIfExists.accept("tutor@example.com", "Tutor123!");
        addIfExists.accept("tutor2@example.com", "Tutor123!");
        return out;
    }

    private String currentSemester() {
        // A simple placeholder semester code for seeded courses
        return "E2E";
    }

    /**
     * Update course ownership to a different lecturer.
     * This updates both the Course.lecturerId field (for approval permission checks)
     * and ensures LecturerAssignment exists for the new owner.
     * Used in E2E tests to properly transfer course ownership.
     *
     * @param courseCode The course code to update
     * @param lecturerId The new lecturer owner ID
     * @return true if updated, false if course not found
     */
    @Transactional
    public boolean updateCourseOwnership(String courseCode, Long lecturerId) {
        return courseRepository.findByCode(courseCode).map(course -> {
            course.setLecturerId(lecturerId);
            courseRepository.save(course);
            LOGGER.info("Updated course {} ownership to lecturer {}", courseCode, lecturerId);
            // Also ensure LecturerAssignment exists for the new owner
            if (!lecturerAssignmentRepository.existsByLecturerIdAndCourseId(lecturerId, course.getId())) {
                lecturerAssignmentRepository.save(new com.usyd.catams.entity.LecturerAssignment(lecturerId, course.getId()));
            }
            return true;
        }).orElse(false);
    }
}
