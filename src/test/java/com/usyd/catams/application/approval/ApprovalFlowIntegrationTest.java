package com.usyd.catams.application.approval;

import com.usyd.catams.application.ApprovalApplicationService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.usyd.catams.integration.IntegrationTestBase;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

@WithMockUser(roles = {"LECTURER"})
public class ApprovalFlowIntegrationTest extends IntegrationTestBase {

    @Autowired
    private ApprovalApplicationService approvalApplicationService;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    private static LocalDate mondayWeeksAgo(int weeks) {
        LocalDate today = LocalDate.now();
        int diffToMonday = (today.getDayOfWeek().getValue() + 6) % 7;
        LocalDate base = today.minusDays(diffToMonday).minusWeeks(weeks);
        if (base.getDayOfWeek() != DayOfWeek.MONDAY) {
            // normalize just in case
            base = base.minusDays((base.getDayOfWeek().getValue() + 6) % 7);
        }
        return base;
    }

    @Test
    void lecturerConfirmationFlow_succeeds() {
        // Arrange: create lecturer, tutor, course, and DRAFT timesheet
        User lecturer = new User("lecturer-int@example.com", "Lecturer Int", "x", UserRole.LECTURER);
        userRepository.save(lecturer);

        User tutor = new User("tutor-int@example.com", "Tutor Int", "x", UserRole.TUTOR);
        userRepository.save(tutor);

        Course course = new Course();
        course.setCode("COMP3308");
        course.setName("Integration E2E");
        course.setSemester("S1 2025");
        course.setLecturerId(lecturer.getId());
        course.setBudgetAllocated(new BigDecimal("10000.00"));
        course.setIsActive(true);
        courseRepository.save(course);

        LocalDate weekStart = mondayWeeksAgo(12);
        Timesheet ts = new Timesheet(
                tutor.getId(),
                course.getId(),
                weekStart,
                new BigDecimal("6.0"),
                new BigDecimal("40.00"),
                "Integration flow",
                lecturer.getId()
        );
        // DRAFT by default
        timesheetRepository.save(ts);

        // Act & Assert transitions
        approvalApplicationService.performApprovalAction(ts.getId(), ApprovalAction.SUBMIT_FOR_APPROVAL, "submit", lecturer.getId());
        Timesheet afterSubmit = timesheetRepository.findById(ts.getId()).orElseThrow();
        Assertions.assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, afterSubmit.getStatus());

        approvalApplicationService.performApprovalAction(ts.getId(), ApprovalAction.TUTOR_CONFIRM, "tutor ok", tutor.getId());
        Timesheet afterTutor = timesheetRepository.findById(ts.getId()).orElseThrow();
        Assertions.assertEquals(ApprovalStatus.TUTOR_CONFIRMED, afterTutor.getStatus());

        approvalApplicationService.performApprovalAction(ts.getId(), ApprovalAction.LECTURER_CONFIRM, "lec ok", lecturer.getId());
        Timesheet afterLecturer = timesheetRepository.findById(ts.getId()).orElseThrow();
        Assertions.assertEquals(ApprovalStatus.LECTURER_CONFIRMED, afterLecturer.getStatus());
    }

    @Test
    void tutorCanResubmitAfterModificationRequest_andLecturerCannot() {
        User lecturer = new User("lecturer-mod@example.com", "Lecturer Mod", "x", UserRole.LECTURER);
        userRepository.save(lecturer);

        User tutor = new User("tutor-mod@example.com", "Tutor Mod", "x", UserRole.TUTOR);
        userRepository.save(tutor);

        Course course = new Course();
        course.setCode("COMP3310");
        course.setName("Workflow Regression Harness");
        course.setSemester("S1 2025");
        course.setLecturerId(lecturer.getId());
        course.setBudgetAllocated(new BigDecimal("12000.00"));
        course.setIsActive(true);
        courseRepository.save(course);

        Timesheet timesheet = new Timesheet(
            tutor.getId(),
            course.getId(),
            mondayWeeksAgo(8),
            new BigDecimal("4.0"),
            new BigDecimal("55.00"),
            "Needs lecturer feedback",
            tutor.getId()
        );
        timesheetRepository.save(timesheet);

        approvalApplicationService.performApprovalAction(timesheet.getId(), ApprovalAction.SUBMIT_FOR_APPROVAL, "initial submit", tutor.getId());
        approvalApplicationService.performApprovalAction(timesheet.getId(), ApprovalAction.TUTOR_CONFIRM, "tutor confirmed", tutor.getId());
        approvalApplicationService.performApprovalAction(timesheet.getId(), ApprovalAction.REQUEST_MODIFICATION, "please attach receipts", lecturer.getId());

        Timesheet afterRequest = timesheetRepository.findById(timesheet.getId()).orElseThrow();
        Assertions.assertEquals(ApprovalStatus.MODIFICATION_REQUESTED, afterRequest.getStatus());

        Assertions.assertThrows(SecurityException.class, () ->
            approvalApplicationService.performApprovalAction(timesheet.getId(), ApprovalAction.SUBMIT_FOR_APPROVAL, "lecturer resubmit attempt", lecturer.getId())
        );

        approvalApplicationService.performApprovalAction(timesheet.getId(), ApprovalAction.SUBMIT_FOR_APPROVAL, "tutor resubmit", tutor.getId());
        Timesheet afterResubmit = timesheetRepository.findById(timesheet.getId()).orElseThrow();
        Assertions.assertEquals(ApprovalStatus.PENDING_TUTOR_CONFIRMATION, afterResubmit.getStatus());
    }
}
