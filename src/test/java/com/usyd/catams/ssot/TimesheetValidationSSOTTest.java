package com.usyd.catams.ssot;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.TutorAssignmentRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.service.Schedule1CalculationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(com.usyd.catams.config.ApplicationConfig.class)
public class TimesheetValidationSSOTTest {

    @Autowired
    private TimesheetValidationProperties props;

    @Autowired
    private TimesheetRepository timesheetRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CourseRepository courseRepository;
    @Autowired
    private TutorAssignmentRepository tutorAssignmentRepository;
    @Autowired
    private TimesheetDomainService domainService;
    @Autowired
    private TimesheetValidationService validationService;
    @Autowired
    private TimesheetMapper mapper;

    @Autowired
    private TimesheetApplicationService appService;

    private User lecturer;
    private User tutor;
    private Course course;

    @BeforeEach
    void seedData() {
        lecturer = new User("lecturer@test.com", "Dr L", "pw", UserRole.LECTURER);
        userRepository.save(lecturer);
        tutor = new User("tutor@test.com", "T U", "pw", UserRole.TUTOR);
        userRepository.save(tutor);
        course = new Course("COMP1010", "CS", "S1", lecturer.getId(), new BigDecimal("10000.00"));
        courseRepository.save(course);
        tutorAssignmentRepository.deleteAll();
        tutorAssignmentRepository.save(new com.usyd.catams.entity.TutorAssignment(tutor.getId(), course.getId()));
    }

    @Test
    void when_change_max_hours_in_config_validation_should_follow_consistently() {
        assertEquals(new BigDecimal("38.0"), props.getHours().getMax());

        // Attempt hours beyond configured max should fail consistently via SSOT
        Schedule1CalculationResult calculation = new Schedule1CalculationResult(
            LocalDate.now().with(java.time.DayOfWeek.MONDAY),
            "TU2",
            TutorQualification.STANDARD,
            false,
            new BigDecimal("39.0"),
            BigDecimal.ZERO,
            new BigDecimal("39.0"),
            new BigDecimal("10.00"),
            new BigDecimal("390.00"),
            "validation test",
            "Schedule 1"
        );
        assertThrows(IllegalArgumentException.class, () -> appService.createTimesheet(
            tutor.getId(), course.getId(), LocalDate.now().with(java.time.DayOfWeek.MONDAY),
            calculation,
            TimesheetTaskType.TUTORIAL,
            "desc", lecturer.getId()
        ));
    }
}
