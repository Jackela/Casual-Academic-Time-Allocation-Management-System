package com.usyd.catams.domain;

import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.domain.rules.RuleEngine;
import com.usyd.catams.domain.rules.Specification;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class TimesheetDomainServiceTest {

    private RuleEngine ruleEngine;
    private Specification<TimesheetValidationContext> rule1;
    private Specification<TimesheetValidationContext> rule2;
    private UserRepository userRepository;
    private CourseRepository courseRepository;
    private TimesheetDomainService domainService;

    @BeforeEach
    void setup() {
        ruleEngine = new RuleEngine();
        // Create two rules where the first always fails to assert fail-fast behavior
        rule1 = ctx -> { throw new com.usyd.catams.exception.BusinessException("R1", "Rule1 failed"); };
        rule2 = ctx -> { throw new com.usyd.catams.exception.BusinessException("R2", "Rule2 should not execute if fail-fast"); };
        userRepository = Mockito.mock(UserRepository.class);
        courseRepository = Mockito.mock(CourseRepository.class);
        domainService = new TimesheetDomainService(ruleEngine,
                // inject rules explicitly to hit the existing constructor ordering
                (c)-> { throw new com.usyd.catams.exception.BusinessException("HOURS", "hours"); },
                (c)-> { throw new com.usyd.catams.exception.BusinessException("RATE", "rate"); },
                (c)-> { throw new com.usyd.catams.exception.BusinessException("DATE", "date"); },
                (c)-> { throw new com.usyd.catams.exception.BusinessException("BUDGET", "budget"); },
                userRepository, courseRepository);
    }

    @Test
    void canRoleEditTimesheetWithStatus_matrix() {
        assertTrue(domainService.canRoleEditTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.REJECTED));
        assertFalse(domainService.canRoleEditTimesheetWithStatus(UserRole.TUTOR, ApprovalStatus.DRAFT));
        assertTrue(domainService.canRoleEditTimesheetWithStatus(UserRole.LECTURER, ApprovalStatus.DRAFT));
        assertFalse(domainService.canRoleEditTimesheetWithStatus(UserRole.LECTURER, ApprovalStatus.REJECTED));
        assertTrue(domainService.canRoleEditTimesheetWithStatus(UserRole.ADMIN, ApprovalStatus.DRAFT));
    }

    @Test
    void validateTimesheetCreation_should_fail_fast_on_first_rule() {
        User creator = new User("lecturer@example.com", "Dr. L", "pw", UserRole.LECTURER);
        User tutor = new User("tutor@example.com", "T U", "pw", UserRole.TUTOR);
        Course course = new Course();
        course.setLecturerId(1L);
        creator.setId(1L);
        tutor.setId(2L);

        Executable call = () -> domainService.validateTimesheetCreation(
                creator, tutor, course, LocalDate.now(), new BigDecimal("1.0"), new BigDecimal("10.00"), "desc");
        var ex = assertThrows(com.usyd.catams.exception.BusinessException.class, call);
        assertEquals("HOURS", ex.getErrorCode());
    }

    @Test
    void calculateTotalPay_should_multiply() {
        assertEquals(new BigDecimal("20.00"), domainService.calculateTotalPay(new BigDecimal("2.0"), new BigDecimal("10.00")));
    }
}