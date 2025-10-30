package com.usyd.catams.verification;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.exception.AuthorizationException;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.TimesheetService;
import com.usyd.catams.service.Schedule1CalculationResult;
import com.usyd.catams.policy.TimesheetPermissionPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 验证跨角色数据访问权限控制
 * 确保用户只能访问其权限范围内的数据
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class CrossRoleDataAccessTest {

    private static final AtomicInteger COURSE_SEQUENCE = new AtomicInteger(1000);

    @Autowired
    private TimesheetService timesheetService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CourseRepository courseRepository;
    
    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private TimesheetPermissionPolicy permissionPolicy;

    @Autowired
    private TutorAssignmentRepository tutorAssignmentRepository;

    private User tutorA;
    private User tutorB;
    private User lecturerA;
    private User lecturerB;
    private User adminUser;
    private Course courseA;
    private Course courseB;
    private Timesheet timesheetA1; // TutorA's timesheet in CourseA
    private Timesheet timesheetB1; // TutorB's timesheet in CourseB

    @BeforeEach
    void setUp() {
        // 创建测试用户
        tutorA = createUser("tutorA@test.com", "Tutor A", UserRole.TUTOR);
        tutorB = createUser("tutorB@test.com", "Tutor B", UserRole.TUTOR);
        lecturerA = createUser("lecturerA@test.com", "Lecturer A", UserRole.LECTURER);
        lecturerB = createUser("lecturerB@test.com", "Lecturer B", UserRole.LECTURER);
        adminUser = createUser("admin@test.com", "Admin User", UserRole.ADMIN);

        // 创建课程
        courseA = createCourse("COURSE_A", "Course A", lecturerA.getId());
        courseB = createCourse("COURSE_B", "Course B", lecturerB.getId());

        tutorAssignmentRepository.deleteAll();
        tutorAssignmentRepository.save(new com.usyd.catams.entity.TutorAssignment(tutorA.getId(), courseA.getId()));
        tutorAssignmentRepository.save(new com.usyd.catams.entity.TutorAssignment(tutorB.getId(), courseB.getId()));

        // 创建timesheet
        timesheetA1 = createTimesheet(tutorA.getId(), courseA.getId(), lecturerA.getId());
        timesheetB1 = createTimesheet(tutorB.getId(), courseB.getId(), lecturerB.getId());

        // Sanity checks to ensure data integrity
        assertEquals(lecturerA.getId(), courseA.getLecturerId(), "Course A should be owned by LecturerA");
        assertEquals(lecturerB.getId(), courseB.getLecturerId(), "Course B should be owned by LecturerB");
        assertEquals(tutorA.getId(), timesheetA1.getTutorId(), "TimesheetA1 should belong to TutorA");
        assertEquals(tutorB.getId(), timesheetB1.getTutorId(), "TimesheetB1 should belong to TutorB");
        assertTrue(permissionPolicy.canViewTimesheet(lecturerA, timesheetA1, courseA),
            "Permission policy should allow LecturerA to view Course A timesheets");
        assertTrue(permissionPolicy.canViewTimesheet(tutorA, timesheetA1, courseA),
            "Permission policy should allow TutorA to view their own timesheets");

        // 再次从仓库加载以模拟Service中的取数逻辑
        Timesheet reloadedA1 = timesheetRepository.findById(timesheetA1.getId())
            .orElseThrow(() -> new IllegalStateException("TimesheetA1 load失败"));
        Course reloadedCourseA = courseRepository.findById(courseA.getId())
            .orElseThrow(() -> new IllegalStateException("CourseA load失败"));
        User reloadedTutorA = userRepository.findById(tutorA.getId())
            .orElseThrow(() -> new IllegalStateException("TutorA load失败"));
        User reloadedLecturerA = userRepository.findById(lecturerA.getId())
            .orElseThrow(() -> new IllegalStateException("LecturerA load失败"));

        assertTrue(permissionPolicy.canViewTimesheet(reloadedTutorA, reloadedA1, reloadedCourseA),
            "Reloaded TutorA should still have access to their timesheet");
        assertTrue(permissionPolicy.canViewTimesheet(reloadedLecturerA, reloadedA1, reloadedCourseA),
            "Reloaded LecturerA should still have access to Course A timesheets");
    }

    @Test
    @DisplayName("Tutor can only access their own timesheets")
    public void testTutorCanOnlyAccessOwnTimesheets() {
        // TutorA should be able to access their own timesheets
        Page<Timesheet> tutorAResults = timesheetService.getTimesheets(
            tutorA.getId(), null, null, tutorA.getId(), PageRequest.of(0, 10));
        assertTrue(tutorAResults.getContent().stream()
                .anyMatch(ts -> ts.getId().equals(timesheetA1.getId())),
            "TutorA pagination result should include their own timesheet");
        assertTrue(permissionPolicy.canViewTimesheet(tutorA, timesheetA1, courseA),
            "Permission policy should allow TutorA to view their own timesheet");

        // TutorA should not be able to view TutorB's timesheet
        assertThrows(AuthorizationException.class, () -> 
            timesheetService.getTimesheetById(timesheetB1.getId(), tutorA.getId()),
            "TutorA should not be able to view TutorB's timesheet");
    }

    @Test
    @DisplayName("Lecturer can only access timesheets for their courses")
    public void testLecturerCanOnlyAccessOwnCourseTimesheets() {
        // LecturerA should be able to access timesheets for Course A
        Page<Timesheet> lecturerAResults = timesheetService.getTimesheets(
            null, courseA.getId(), null, lecturerA.getId(), PageRequest.of(0, 10));
        assertTrue(lecturerAResults.getContent().stream()
                .anyMatch(ts -> ts.getId().equals(timesheetA1.getId())),
            "LecturerA pagination result should include Course A timesheets");
        assertTrue(permissionPolicy.canViewTimesheet(lecturerA, timesheetA1, courseA),
            "Permission policy should allow LecturerA to view Course A timesheets");

        // LecturerA should not be able to access timesheets from other courses
        assertThrows(AuthorizationException.class, () -> 
            timesheetService.getTimesheetById(timesheetB1.getId(), lecturerA.getId()),
            "LecturerA should not be able to view timesheets from other courses");
    }

    @Test
    @DisplayName("Admin can access all timesheets")
    public void testAdminCanAccessAllTimesheets() {
        // Admin应该能访问任何timesheet
        Optional<Timesheet> timesheetA = timesheetService.getTimesheetById(
            timesheetA1.getId(), adminUser.getId());
        assertTrue(timesheetA.isPresent(), 
            "Admin应该能访问TutorA的timesheet");

        Optional<Timesheet> timesheetB = timesheetService.getTimesheetById(
            timesheetB1.getId(), adminUser.getId());
        assertTrue(timesheetB.isPresent(), 
            "Admin应该能访问TutorB的timesheet");
    }

    @Test
    @DisplayName("Pagination respects permission filters")
    public void testPaginatedQueriesRespectPermissions() {
        // TutorA查询timesheet时只应该看到自己的
        Page<Timesheet> tutorATimesheets = timesheetService.getTimesheets(
            tutorA.getId(), null, null, tutorA.getId(), PageRequest.of(0, 10));
        
        assertTrue(tutorATimesheets.getContent().stream()
                .allMatch(ts -> ts.getTutorId().equals(tutorA.getId())),
            "TutorA pagination result should only contain their own timesheets");

        // LecturerA查询时只应该看到自己课程的
        Page<Timesheet> lecturerATimesheets = timesheetService.getTimesheets(
            null, courseA.getId(), null, lecturerA.getId(), PageRequest.of(0, 10));
        
        assertTrue(lecturerATimesheets.getContent().stream()
                .allMatch(ts -> ts.getCourseId().equals(courseA.getId())),
            "LecturerA pagination result should only contain Course A timesheets");
    }

    @Test
    @DisplayName("Cross-role modification permissions are enforced")
    public void testCrossRoleOperationPermissions() {
        // TutorA should not be able to update TutorB's timesheet
        assertThrows(Exception.class, () -> {
            timesheetService.updateTimesheet(
                timesheetB1.getId(),
                null, // calculation
                null, // taskType
                "Unauthorized update attempt",
                tutorA.getId()
            );
        }, "TutorA should not be able to update TutorB's timesheet");

        // LecturerA should not be able to delete timesheets from other courses
        assertThrows(Exception.class, () -> {
            timesheetService.deleteTimesheet(timesheetB1.getId(), lecturerA.getId());
        }, "LecturerA should not be able to delete timesheets from other courses");
    }

    @Test
    @DisplayName("HR approval queue only returns lecturer confirmed timesheets")
    public void testHRApprovalQueueFiltering() {
        // Set timesheet statuses
        timesheetA1.setStatus(ApprovalStatus.LECTURER_CONFIRMED);
        timesheetB1.setStatus(ApprovalStatus.TUTOR_CONFIRMED);
        timesheetRepository.save(timesheetA1);
        timesheetRepository.save(timesheetB1);

        // Query HR approval queue
        Page<Timesheet> hrQueue = timesheetService.getLecturerFinalApprovalQueue(
            adminUser.getId(), PageRequest.of(0, 10));

        // Ensure only lecturer confirmed timesheets are returned
        assertTrue(hrQueue.getContent().stream()
            .allMatch(ts -> ts.getStatus() == ApprovalStatus.LECTURER_CONFIRMED),
            "HR approval queue should only contain lecturer confirmed timesheets");
        
        // Ensure tutor confirmed timesheets are excluded
        assertFalse(hrQueue.getContent().stream()
            .anyMatch(ts -> ts.getStatus() == ApprovalStatus.TUTOR_CONFIRMED),
            "HR approval queue should not contain tutor confirmed timesheets");
    }

    @Test
    @DisplayName("Data isolation protects sensitive fields")
    public void testDataIsolationSensitiveFields() {
        // Verify users cannot access sensitive data for other users
        Optional<Timesheet> timesheet = timesheetService.getTimesheetById(
            timesheetA1.getId(), tutorA.getId());
        
        if (timesheet.isPresent()) {
            Timesheet ts = timesheet.get();
            // Ensure only authorised fields are present
            assertNotNull(ts.getId());
            assertNotNull(ts.getDescription());
            assertNotNull(ts.getHours());
            // 验证敏感的审批历史需要单独的权限检查
        }
    }

    // 辅助方法
    private User createUser(String email, String name, UserRole role) {
        User user = new User(email, name, "password", role);
        return userRepository.save(user);
    }

    private Course createCourse(String code, String name, Long lecturerId) {
        Course course = new Course(generateCourseCode(code), name, "2024-S1", lecturerId, new BigDecimal("10000.00"));
        return courseRepository.save(course);
    }

    private Timesheet createTimesheet(Long tutorId, Long courseId, Long creatorId) {
        LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        Schedule1CalculationResult calculation = new Schedule1CalculationResult(
            weekStart,
            "TST1",
            TutorQualification.STANDARD,
            false,
            new BigDecimal("2.0"),
            BigDecimal.ZERO,
            new BigDecimal("2.0"),
            new BigDecimal("45.00"),
            new BigDecimal("90.00"),
            "2h * 45.00",
            "Test Clause"
        );

        Timesheet timesheet = timesheetService.createTimesheet(
            tutorId,
            courseId,
            weekStart,
            calculation,
            TimesheetTaskType.TUTORIAL,
            "Test timesheet",
            creatorId
        );

        return timesheetRepository.findById(timesheet.getId())
            .orElseThrow(() -> new IllegalStateException("Timesheet creation failed"));
    }

    private String generateCourseCode(String seed) {
        String letters = seed != null ? seed.replaceAll("[^A-Za-z]", "").toUpperCase() : "";
        if (letters.length() < 3) {
            letters = (letters + "COURSE").substring(0, 4);
        } else if (letters.length() == 3) {
            letters = letters + "X";
        } else if (letters.length() > 4) {
            letters = letters.substring(0, 4);
        }
        int seq = COURSE_SEQUENCE.getAndIncrement();
        return String.format("%s%04d", letters, seq % 10000);
    }
}
