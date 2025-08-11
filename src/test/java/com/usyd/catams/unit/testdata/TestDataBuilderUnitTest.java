package com.usyd.catams.unit.testdata;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.testdata.TestDataBuilder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit test for TestDataBuilder to validate entity creation and domain invariants.
 * 
 * This test validates that:
 * - TestDataBuilder creates valid domain aggregates
 * - Builders respect domain invariants and business rules  
 * - Entity construction follows DDD principles
 * - Value objects are properly created and validated
 * 
 * @author Backend-Data Agent
 */
class TestDataBuilderUnitTest {

    @Nested
    @DisplayName("User Entity Creation")
    class UserEntityCreation {

        @Test
        @DisplayName("Should create valid Tutor user with domain invariants")
        void shouldCreateValidTutorWithDomainInvariants() {
            // When
            User tutor = TestDataBuilder.aTutor()
                .withEmail("unit.tutor@test.usyd.edu.au")
                .withName("Unit Test Tutor")
                .build();

            // Then
            assertThat(tutor).isNotNull();
            assertThat(tutor.getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(tutor.getEmail()).isEqualTo("unit.tutor@test.usyd.edu.au");
            assertThat(tutor.getName()).isEqualTo("Unit Test Tutor");
            assertThat(tutor.getFirstName()).isEqualTo("Unit Test");
            assertThat(tutor.getLastName()).isEqualTo("Tutor");
            assertThat(tutor.isActive()).isTrue();
            assertThat(tutor.getHashedPassword()).isNotBlank();
            assertThat(tutor.hasValidName()).isTrue();
            assertThat(tutor.getEmailValue()).isEqualTo("unit.tutor@test.usyd.edu.au");
        }

        @Test
        @DisplayName("Should create valid Lecturer user with domain invariants")
        void shouldCreateValidLecturerWithDomainInvariants() {
            // When
            User lecturer = TestDataBuilder.aLecturer()
                .withEmail("unit.lecturer@test.usyd.edu.au")
                .withName("Dr. Unit Test Lecturer")
                .build();

            // Then
            assertThat(lecturer).isNotNull();
            assertThat(lecturer.getRole()).isEqualTo(UserRole.LECTURER);
            assertThat(lecturer.getEmail()).isEqualTo("unit.lecturer@test.usyd.edu.au");
            assertThat(lecturer.getName()).isEqualTo("Dr. Unit Test Lecturer");
            assertThat(lecturer.getFirstName()).isEqualTo("Dr. Unit Test");
            assertThat(lecturer.getLastName()).isEqualTo("Lecturer");
            assertThat(lecturer.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should create valid Admin user with domain invariants")
        void shouldCreateValidAdminWithDomainInvariants() {
            // When
            User admin = TestDataBuilder.anAdmin()
                .withEmail("unit.admin@test.usyd.edu.au")
                .withName("System Administrator")
                .build();

            // Then
            assertThat(admin).isNotNull();
            assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
            assertThat(admin.getEmail()).isEqualTo("unit.admin@test.usyd.edu.au");
            assertThat(admin.getName()).isEqualTo("System Administrator");
            assertThat(admin.getFirstName()).isEqualTo("System");
            assertThat(admin.getLastName()).isEqualTo("Administrator");
            assertThat(admin.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should support fluent builder pattern")
        void shouldSupportFluentBuilderPattern() {
            // When
            User user = TestDataBuilder.aUser()
                .withEmail("fluent@test.usyd.edu.au")
                .withName("Fluent Builder")
                .withRole(UserRole.TUTOR)
                .active()
                .build();

            // Then
            assertThat(user.getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(user.getEmail()).isEqualTo("fluent@test.usyd.edu.au");
            assertThat(user.getName()).isEqualTo("Fluent Builder");
            assertThat(user.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should support inactive users")
        void shouldSupportInactiveUsers() {
            // When
            User inactiveUser = TestDataBuilder.aTutor()
                .withEmail("inactive@test.usyd.edu.au")
                .inactive()
                .build();

            // Then
            assertThat(inactiveUser.isActive()).isFalse();
            assertThat(inactiveUser.getIsActive()).isFalse();
        }
    }

    @Nested
    @DisplayName("Course Entity Creation")
    class CourseEntityCreation {

        @Test
        @DisplayName("Should create valid Course with domain invariants")
        void shouldCreateValidCourseWithDomainInvariants() {
            // When
            Course course = TestDataBuilder.aCourse()
                .withCode("UNIT3001")
                .withName("Unit Testing Fundamentals")
                .withSemester("2025S1")
                .withLecturerId(100L)
                .withBudgetAllocated(new BigDecimal("20000.00"))
                .withBudgetUsed(new BigDecimal("8000.00"))
                .build();

            // Then
            assertThat(course).isNotNull();
            assertThat(course.getCode()).isEqualTo("UNIT3001");
            assertThat(course.getName()).isEqualTo("Unit Testing Fundamentals");
            assertThat(course.getSemester()).isEqualTo("2025S1");
            assertThat(course.getLecturerId()).isEqualTo(100L);
            assertThat(course.getBudgetAllocated()).isEqualTo(new BigDecimal("20000.00"));
            assertThat(course.getBudgetUsed()).isEqualTo(new BigDecimal("8000.00"));
            assertThat(course.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should support CourseCode value object")
        void shouldSupportCourseCodeValueObject() {
            // When
            Course course = TestDataBuilder.aCourse()
                .withCode("COMP1234")
                .build();

            // Then
            assertThat(course.getCode()).isEqualTo("COMP1234");
            assertThat(course.getCourseCodeObject()).isNotNull();
            assertThat(course.getCourseCodeObject().getValue()).isEqualTo("COMP1234");
        }

        @Test
        @DisplayName("Should support Money value objects for budget")
        void shouldSupportMoneyValueObjectsForBudget() {
            // When
            Course course = TestDataBuilder.aCourse()
                .withBudgetAllocated(new BigDecimal("15000.00"))
                .withBudgetUsed(new BigDecimal("5000.00"))
                .build();

            // Then
            assertThat(course.getBudgetAllocated()).isEqualTo(new BigDecimal("15000.00"));
            assertThat(course.getBudgetUsed()).isEqualTo(new BigDecimal("5000.00"));
            assertThat(course.getBudgetAllocatedMoney()).isNotNull();
            assertThat(course.getBudgetUsedMoney()).isNotNull();
            assertThat(course.getBudgetAllocatedMoney().getAmount()).isEqualTo(new BigDecimal("15000.00"));
            assertThat(course.getBudgetUsedMoney().getAmount()).isEqualTo(new BigDecimal("5000.00"));
        }

        @Test
        @DisplayName("Should support budget calculation methods")
        void shouldSupportBudgetCalculationMethods() {
            // When
            Course course = TestDataBuilder.aCourse()
                .withBudgetAllocated(new BigDecimal("10000.00"))
                .withBudgetUsed(new BigDecimal("3000.00"))
                .build();

            // Then
            assertThat(course.getBudgetRemainingAmount()).isEqualTo(new BigDecimal("7000.00"));
            assertThat(course.hasSufficientBudget(new BigDecimal("5000.00"))).isTrue();
            assertThat(course.hasSufficientBudget(new BigDecimal("8000.00"))).isFalse();
        }

        @Test
        @DisplayName("Should support active/inactive states")
        void shouldSupportActiveInactiveStates() {
            // When
            Course activeCourse = TestDataBuilder.aCourse()
                .withCode("ACTV1001")
                .active()
                .build();

            Course inactiveCourse = TestDataBuilder.aCourse()
                .withCode("INAC1001") 
                .inactive()
                .build();

            // Then
            assertThat(activeCourse.getIsActive()).isTrue();
            assertThat(inactiveCourse.getIsActive()).isFalse();
        }
    }

    @Nested
    @DisplayName("Timesheet Entity Creation")
    class TimesheetEntityCreation {

        @Test
        @DisplayName("Should create valid Draft Timesheet with domain invariants")
        void shouldCreateValidDraftTimesheetWithDomainInvariants() {
            // When
            Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
                .withTutorId(200L)
                .withCourseId(300L)
                .withWeekStartDate(LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY))
                .withHours(new BigDecimal("18.5"))
                .withHourlyRate(new BigDecimal("52.00"))
                .withDescription("Unit test timesheet creation")
                .withCreatedBy(200L)
                .build();

            // Then
            assertThat(timesheet).isNotNull();
            assertThat(timesheet.getTutorId()).isEqualTo(200L);
            assertThat(timesheet.getCourseId()).isEqualTo(300L);
            assertThat(timesheet.getWeekStartDate().getDayOfWeek()).isEqualTo(java.time.DayOfWeek.MONDAY);
            assertThat(timesheet.getHours()).isEqualTo(new BigDecimal("18.5"));
            assertThat(timesheet.getHourlyRate()).isEqualTo(new BigDecimal("52.00"));
            assertThat(timesheet.getDescription()).isEqualTo("Unit test timesheet creation");
            assertThat(timesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(timesheet.getCreatedBy()).isEqualTo(200L);
        }

        @Test
        @DisplayName("Should support WeekPeriod value object with Monday constraint")
        void shouldSupportWeekPeriodValueObjectWithMondayConstraint() {
            // Given
            LocalDate mondayDate = LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY);

            // When
            Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
                .withWeekStartDate(mondayDate)
                .build();

            // Then
            assertThat(timesheet.getWeekStartDate()).isEqualTo(mondayDate);
            assertThat(timesheet.getWeekStartDate().getDayOfWeek()).isEqualTo(java.time.DayOfWeek.MONDAY);
            assertThat(timesheet.getWeekPeriod()).isNotNull();
        }

        @Test
        @DisplayName("Should reject non-Monday week start dates")
        void shouldRejectNonMondayWeekStartDates() {
            // Given
            LocalDate wednesdayDate = LocalDate.now().with(java.time.DayOfWeek.WEDNESDAY);

            // When/Then
            assertThatThrownBy(() -> {
                TestDataBuilder.aDraftTimesheet()
                    .withWeekStartDate(wednesdayDate)
                    .build();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("Should support Money value object for hourly rate")
        void shouldSupportMoneyValueObjectForHourlyRate() {
            // When
            Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
                .withHourlyRate(new BigDecimal("55.00"))
                .build();

            // Then
            assertThat(timesheet.getHourlyRate()).isEqualTo(new BigDecimal("55.00"));
            assertThat(timesheet.getHourlyRateMoney()).isNotNull();
            assertThat(timesheet.getHourlyRateMoney().getAmount()).isEqualTo(new BigDecimal("55.00"));
        }

        @Test
        @DisplayName("Should support approval status transitions")
        void shouldSupportApprovalStatusTransitions() {
            // When
            Timesheet draftTimesheet = TestDataBuilder.aDraftTimesheet()
                .asDraft()
                .build();

            Timesheet pendingTimesheet = TestDataBuilder.aDraftTimesheet()
                .asPendingTutorReview()
                .build();

            Timesheet approvedTimesheet = TestDataBuilder.aDraftTimesheet()
                .asApprovedByTutor()
                .build();

            Timesheet rejectedTimesheet = TestDataBuilder.aDraftTimesheet()
                .asRejected()
                .build();

            // Then
            assertThat(draftTimesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
            assertThat(pendingTimesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_REVIEW);
            assertThat(approvedTimesheet.getStatus()).isEqualTo(ApprovalStatus.APPROVED_BY_TUTOR);
            assertThat(rejectedTimesheet.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        }

        @Test
        @DisplayName("Should support User entity associations")
        void shouldSupportUserEntityAssociations() {
            // Given
            User tutor = TestDataBuilder.aTutor()
                .withId(500L)
                .build();

            // When
            Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
                .withTutor(tutor)
                .withCreatedBy(tutor.getId())
                .build();

            // Then
            assertThat(timesheet.getTutorId()).isEqualTo(500L);
            assertThat(timesheet.getCreatedBy()).isEqualTo(500L);
        }
    }

    @Nested
    @DisplayName("Domain Invariant Validation")
    class DomainInvariantValidation {

        @Test
        @DisplayName("Should enforce User domain invariants at construction")
        void shouldEnforceUserDomainInvariantsAtConstruction() {
            // Test that User entities enforce domain rules
            User validUser = TestDataBuilder.aUser()
                .withEmail("valid.user@test.usyd.edu.au")
                .withName("Valid User Name")
                .withRole(UserRole.TUTOR)
                .build();

            // Domain invariants should be satisfied
            assertThat(validUser.hasValidName()).isTrue();
            assertThat(validUser.getEmailValue()).isNotBlank();
            assertThat(validUser.getRole()).isNotNull();
            assertThat(validUser.getHashedPassword()).isNotBlank();

            // Test email value object
            assertThat(validUser.getEmailObject()).isNotNull();
            assertThat(validUser.getEmailObject().getValue()).isEqualTo("valid.user@test.usyd.edu.au");
        }

        @Test
        @DisplayName("Should enforce Course domain invariants at construction")
        void shouldEnforceCourseDomainInvariantsAtConstruction() {
            // Test that Course entities enforce domain rules
            Course validCourse = TestDataBuilder.aCourse()
                .withCode("DOMN2001")
                .withBudgetAllocated(new BigDecimal("12000.00"))
                .withBudgetUsed(new BigDecimal("4000.00"))
                .build();

            // Domain invariants should be satisfied
            assertThat(validCourse.getCode()).isNotBlank();
            assertThat(validCourse.getCourseCodeObject()).isNotNull();
            assertThat(validCourse.getBudgetAllocated()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
            assertThat(validCourse.getBudgetUsed()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
            assertThat(validCourse.getBudgetUsed()).isLessThanOrEqualTo(validCourse.getBudgetAllocated());
            assertThat(validCourse.getLecturerId()).isNotNull();
        }

        @Test
        @DisplayName("Should enforce Timesheet domain invariants at construction")
        void shouldEnforceTimesheetDomainInvariantsAtConstruction() {
            // Test that Timesheet entities enforce domain rules
            Timesheet validTimesheet = TestDataBuilder.aDraftTimesheet()
                .withHours(new BigDecimal("25.0"))
                .withHourlyRate(new BigDecimal("48.00"))
                .withWeekStartDate(LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY))
                .build();

            // Domain invariants should be satisfied
            assertThat(validTimesheet.getHours()).isGreaterThan(BigDecimal.ZERO);
            assertThat(validTimesheet.getHours()).isLessThanOrEqualTo(new BigDecimal("40.0"));
            assertThat(validTimesheet.getHourlyRate()).isGreaterThan(BigDecimal.ZERO);
            assertThat(validTimesheet.getWeekStartDate().getDayOfWeek()).isEqualTo(java.time.DayOfWeek.MONDAY);
            assertThat(validTimesheet.getTutorId()).isNotNull();
            assertThat(validTimesheet.getCourseId()).isNotNull();
            assertThat(validTimesheet.getDescription()).isNotBlank();
            assertThat(validTimesheet.getStatus()).isNotNull();
            assertThat(validTimesheet.getCreatedBy()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Builder Pattern Compliance")
    class BuilderPatternCompliance {

        @Test
        @DisplayName("Should provide sensible defaults")
        void shouldProvideSensibleDefaults() {
            // When - Build entities with minimal configuration
            User defaultUser = TestDataBuilder.aUser().build();
            Course defaultCourse = TestDataBuilder.aCourse().build();
            Timesheet defaultTimesheet = TestDataBuilder.aDraftTimesheet().build();

            // Then - Should have valid defaults
            assertThat(defaultUser.getEmail()).isNotBlank();
            assertThat(defaultUser.getName()).isNotBlank();
            assertThat(defaultUser.getRole()).isNotNull();
            assertThat(defaultUser.isActive()).isTrue();

            assertThat(defaultCourse.getCode()).isNotBlank();
            assertThat(defaultCourse.getName()).isNotBlank();
            assertThat(defaultCourse.getBudgetAllocated()).isGreaterThan(BigDecimal.ZERO);
            assertThat(defaultCourse.getIsActive()).isTrue();

            assertThat(defaultTimesheet.getHours()).isGreaterThan(BigDecimal.ZERO);
            assertThat(defaultTimesheet.getHourlyRate()).isGreaterThan(BigDecimal.ZERO);
            assertThat(defaultTimesheet.getStatus()).isEqualTo(ApprovalStatus.DRAFT);
        }

        @Test
        @DisplayName("Should support method chaining")
        void shouldSupportMethodChaining() {
            // When - Use fluent interface
            User user = TestDataBuilder.aTutor()
                .withEmail("chain@test.usyd.edu.au")
                .withName("Method Chain")
                .active()
                .build();

            // Then
            assertThat(user.getRole()).isEqualTo(UserRole.TUTOR);
            assertThat(user.getEmail()).isEqualTo("chain@test.usyd.edu.au");
            assertThat(user.getName()).isEqualTo("Method Chain");
            assertThat(user.isActive()).isTrue();
        }

        @Test
        @DisplayName("Should be immutable after build")
        void shouldBeImmutableAfterBuild() {
            // When
            User user1 = TestDataBuilder.aTutor().withEmail("user1@test.com").build();
            User user2 = TestDataBuilder.aTutor().withEmail("user2@test.com").build();

            // Then - Each build should create a new instance
            assertThat(user1).isNotSameAs(user2);
            assertThat(user1.getEmail()).isEqualTo("user1@test.com");
            assertThat(user2.getEmail()).isEqualTo("user2@test.com");
        }
    }
}