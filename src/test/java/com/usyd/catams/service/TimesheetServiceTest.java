
package com.usyd.catams.service;

import com.usyd.catams.application.TimesheetApplicationService;
import com.usyd.catams.domain.rules.*;
import com.usyd.catams.domain.rules.context.TimesheetValidationContext;
import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.mapper.TimesheetMapper;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import com.usyd.catams.testdata.builder.UserBuilder;import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TimesheetServiceTest {

    @Mock
    private RuleEngine ruleEngine;
    @Mock
    private HoursRangeRule hoursRangeRule;
    @Mock
    private HourlyRateRangeRule hourlyRateRangeRule;
    @Mock
    private FutureDateRule futureDateRule;
    @Mock
    private BudgetExceededRule budgetExceededRule;

    @Mock
    private UserRepository userRepository;
    @Mock
    private CourseRepository courseRepository;

    private TimesheetDomainService timesheetDomainService;

    @BeforeEach
    void setUp() {
        timesheetDomainService = new TimesheetDomainService(
            ruleEngine, 
            hoursRangeRule, 
            hourlyRateRangeRule, 
            futureDateRule, 
            budgetExceededRule,
            userRepository, 
            courseRepository
        );
    }

    @Captor
    private ArgumentCaptor<List<Specification<TimesheetValidationContext>>> rulesCaptor;

    @Test
    void validateTimesheetCreation_ShouldExecuteAllCreationRules() {
        // Arrange
        User creator = TestDataBuilder.aUser().asLecturer().withId(1L).build();
        User tutor = TestDataBuilder.aUser().asTutor().withId(2L).build();
        Course course = TestDataBuilder.aCourse().withId(100L).withLecturerId(1L).build();
        LocalDate date = LocalDate.now().with(java.time.DayOfWeek.MONDAY); // Ensure it's a Monday
        BigDecimal hours = BigDecimal.TEN;
        BigDecimal rate = BigDecimal.valueOf(50);
        String description = "Test Description";

        TimesheetValidationContext context = new TimesheetValidationContext(creator, tutor, course, date, hours, rate, description);

        // Act
        timesheetDomainService.validateTimesheetCreation(creator, tutor, course, date, hours, rate, description);

        // Assert
        verify(ruleEngine).execute(any(TimesheetValidationContext.class), rulesCaptor.capture());
        List<Specification<TimesheetValidationContext>> executedRules = rulesCaptor.getValue();

        assertThat(executedRules).containsExactlyInAnyOrder(
            hoursRangeRule,
            hourlyRateRangeRule,
            futureDateRule,
            budgetExceededRule
        );    }
}

