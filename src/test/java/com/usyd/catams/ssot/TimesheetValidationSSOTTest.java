package com.usyd.catams.ssot;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.domain.service.TimesheetValidationService;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
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
    private TimesheetDomainService domainService;
    @Autowired
    private TimesheetValidationService validationService;
    @Autowired
    private TimesheetMapper mapper;

    @Autowired
    private TimesheetApplicationService appService;

    @BeforeEach
    void seedData() {
        User lecturer = new User("lecturer@test.com", "Dr L", "pw", UserRole.LECTURER);
        userRepository.save(lecturer);
        User tutor = new User("tutor@test.com", "T U", "pw", UserRole.TUTOR);
        userRepository.save(tutor);
        Course course = new Course();
        course.setName("CS");
        course.setLecturerId(lecturer.getId());
        courseRepository.save(course);
    }

    @Test
    void when_change_max_hours_in_config_validation_should_follow_consistently() {
        // default max from application-test.yml is not explicitly set; expect default 38.0 from properties bean
        assertEquals(new BigDecimal("38.0"), props.getHours().getMax());

        User lecturer = userRepository.findAll().stream().filter(u -> u.getRole()==UserRole.LECTURER).findFirst().orElseThrow();
        User tutor = userRepository.findAll().stream().filter(u -> u.getRole()==UserRole.TUTOR).findFirst().orElseThrow();
        Course course = courseRepository.findAll().getFirst();

        // Try to create with hours exceeding 38.0 to trigger failure (red if entity @DecimalMax(40.0) blocks SSOT)
        assertThrows(IllegalArgumentException.class, () -> appService.createTimesheet(
            tutor.getId(), course.getId(), LocalDate.now().with(java.time.DayOfWeek.MONDAY),
            new BigDecimal("39.0"), new BigDecimal("10.00"), "desc", lecturer.getId()
        ));
    }
}