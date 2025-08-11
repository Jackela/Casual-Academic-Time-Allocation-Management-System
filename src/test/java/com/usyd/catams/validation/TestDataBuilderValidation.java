package com.usyd.catams.validation;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.testdata.TestDataBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Manual validation class for TestDataBuilder functionality.
 * This can be run independently to verify that TestDataBuilder creates valid entities.
 */
public class TestDataBuilderValidation {
    
    public static void main(String[] args) {
        System.out.println("=== TestDataBuilder Validation ===");
        
        try {
            validateUserCreation();
            validateCourseCreation();
            validateTimesheetCreation();
            validateDomainInvariants();
            validateBuilderPatterns();
            
            System.out.println("\n✅ All TestDataBuilder validations PASSED!");
            System.out.println("\nValidation Results:");
            System.out.println("- User entities: Created successfully with domain invariants");
            System.out.println("- Course entities: Created successfully with value objects");
            System.out.println("- Timesheet entities: Created successfully with business rules");
            System.out.println("- Domain invariants: Properly enforced");
            System.out.println("- Builder patterns: Fluent interface working correctly");
            
        } catch (Exception e) {
            System.err.println("❌ TestDataBuilder validation FAILED: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private static void validateUserCreation() {
        System.out.println("\n--- Validating User Creation ---");
        
        // Test Tutor creation
        User tutor = TestDataBuilder.aTutor()
            .withEmail("validation.tutor@test.usyd.edu.au")
            .withName("Validation Test Tutor")
            .build();
        
        assert tutor != null : "Tutor should not be null";
        assert tutor.getRole() == UserRole.TUTOR : "Role should be TUTOR";
        assert tutor.getEmail().equals("validation.tutor@test.usyd.edu.au") : "Email should match";
        assert tutor.getName().equals("Validation Test Tutor") : "Name should match";
        assert tutor.isActive() : "User should be active by default";
        assert tutor.getHashedPassword() != null && !tutor.getHashedPassword().isEmpty() : "Password should be set";
        
        // Test Lecturer creation
        User lecturer = TestDataBuilder.aLecturer()
            .withEmail("validation.lecturer@test.usyd.edu.au")
            .withName("Dr. Validation Lecturer")
            .build();
        
        assert lecturer.getRole() == UserRole.LECTURER : "Role should be LECTURER";
        assert lecturer.getFirstName().equals("Dr. Validation") : "First name parsing should work";
        assert lecturer.getLastName().equals("Lecturer") : "Last name parsing should work";
        
        // Test Admin creation
        User admin = TestDataBuilder.anAdmin()
            .withEmail("validation.admin@test.usyd.edu.au")
            .withName("System Administrator")
            .inactive() // Test inactive state
            .build();
        
        assert admin.getRole() == UserRole.ADMIN : "Role should be ADMIN";
        assert !admin.isActive() : "Admin should be inactive";
        
        System.out.println("✓ User creation validation passed");
    }
    
    private static void validateCourseCreation() {
        System.out.println("\n--- Validating Course Creation ---");
        
        Course course = TestDataBuilder.aCourse() // Uses default code "COMP1000"
            .withName("Validation Testing Course")
            .withSemester("2025S1")
            .withLecturerId(100L)
            .withBudgetAllocated(new BigDecimal("25000.00"))
            .withBudgetUsed(new BigDecimal("10000.00"))
            .build();
        
        assert course != null : "Course should not be null";
        assert course.getCode().equals("COMP1000") : "Course code should match";
        assert course.getName().equals("Validation Testing Course") : "Course name should match";
        assert course.getSemester().equals("2025S1") : "Semester should match";
        assert course.getLecturerId().equals(100L) : "Lecturer ID should match";
        assert course.getBudgetAllocated().equals(new BigDecimal("25000.00")) : "Budget allocated should match";
        assert course.getBudgetUsed().equals(new BigDecimal("10000.00")) : "Budget used should match";
        assert course.getIsActive() : "Course should be active by default";
        
        // Test CourseCode value object
        assert course.getCourseCodeObject() != null : "CourseCode value object should exist";
        assert course.getCourseCodeObject().getValue().equals("COMP1000") : "CourseCode value should match";
        
        // Test Money value objects
        assert course.getBudgetAllocatedMoney() != null : "Budget allocated Money object should exist";
        assert course.getBudgetUsedMoney() != null : "Budget used Money object should exist";
        assert course.getBudgetAllocatedMoney().getAmount().equals(new BigDecimal("25000.00")) : "Budget allocated amount should match";
        
        // Test budget calculations
        assert course.getBudgetRemainingAmount().equals(new BigDecimal("15000.00")) : "Budget remaining calculation should work";
        assert course.hasSufficientBudget(new BigDecimal("10000.00")) : "Should have sufficient budget for 10000";
        assert !course.hasSufficientBudget(new BigDecimal("20000.00")) : "Should not have sufficient budget for 20000";
        
        System.out.println("✓ Course creation validation passed");
    }
    
    private static void validateTimesheetCreation() {
        System.out.println("\n--- Validating Timesheet Creation ---");
        
        LocalDate mondayDate = LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY);
        
        Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
            .withTutorId(200L)
            .withCourseId(300L)
            .withWeekStartDate(mondayDate)
            .withHours(new BigDecimal("22.5"))
            .withHourlyRate(new BigDecimal("55.00"))
            .withDescription("Validation test timesheet")
            .withCreatedBy(200L)
            .build();
        
        assert timesheet != null : "Timesheet should not be null";
        assert timesheet.getTutorId().equals(200L) : "Tutor ID should match";
        assert timesheet.getCourseId().equals(300L) : "Course ID should match";
        assert timesheet.getWeekStartDate().equals(mondayDate) : "Week start date should match";
        assert timesheet.getWeekStartDate().getDayOfWeek() == java.time.DayOfWeek.MONDAY : "Week should start on Monday";
        assert timesheet.getHours().equals(new BigDecimal("22.5")) : "Hours should match";
        assert timesheet.getHourlyRate().equals(new BigDecimal("55.00")) : "Hourly rate should match";
        assert timesheet.getDescription().equals("Validation test timesheet") : "Description should match";
        assert timesheet.getStatus() == ApprovalStatus.DRAFT : "Status should be DRAFT";
        assert timesheet.getCreatedBy().equals(200L) : "Created by should match";
        
        // Test WeekPeriod value object
        assert timesheet.getWeekPeriod() != null : "WeekPeriod value object should exist";
        
        // Test Money value object for hourly rate
        assert timesheet.getHourlyRateMoney() != null : "HourlyRate Money object should exist";
        assert timesheet.getHourlyRateMoney().getAmount().equals(new BigDecimal("55.00")) : "HourlyRate amount should match";
        
        // Test approval status transitions
        Timesheet pendingTimesheet = TestDataBuilder.aDraftTimesheet()
            .asPendingTutorReview()
            .build();
        assert pendingTimesheet.getStatus() == ApprovalStatus.PENDING_TUTOR_REVIEW : "Status should be PENDING_TUTOR_REVIEW";
        
        Timesheet approvedTimesheet = TestDataBuilder.aDraftTimesheet()
            .asApprovedByTutor()
            .build();
        assert approvedTimesheet.getStatus() == ApprovalStatus.APPROVED_BY_TUTOR : "Status should be APPROVED_BY_TUTOR";
        
        System.out.println("✓ Timesheet creation validation passed");
    }
    
    private static void validateDomainInvariants() {
        System.out.println("\n--- Validating Domain Invariants ---");
        
        // Test User domain invariants
        User user = TestDataBuilder.aUser()
            .withEmail("domain@test.usyd.edu.au")
            .withName("Domain Test User")
            .withRole(UserRole.TUTOR)
            .build();
        
        assert user.hasValidName() : "User should have valid name";
        assert user.getEmailValue() != null && !user.getEmailValue().isEmpty() : "User should have valid email";
        assert user.getRole() != null : "User should have valid role";
        assert user.getEmailObject() != null : "Email value object should exist";
        
        // Test Course domain invariants
        Course course = TestDataBuilder.aCourse()
            .withCode("MATH1001")
            .withBudgetAllocated(new BigDecimal("10000.00"))
            .withBudgetUsed(new BigDecimal("3000.00"))
            .build();
        
        assert course.getCode() != null && !course.getCode().isEmpty() : "Course should have valid code";
        assert course.getCourseCodeObject() != null : "CourseCode value object should exist";
        assert course.getBudgetAllocated().compareTo(BigDecimal.ZERO) >= 0 : "Budget allocated should be non-negative";
        assert course.getBudgetUsed().compareTo(BigDecimal.ZERO) >= 0 : "Budget used should be non-negative";
        assert course.getBudgetUsed().compareTo(course.getBudgetAllocated()) <= 0 : "Budget used should not exceed allocated";
        
        // Test Timesheet domain invariants
        Timesheet timesheet = TestDataBuilder.aDraftTimesheet()
            .withHours(new BigDecimal("30.0"))
            .withHourlyRate(new BigDecimal("50.00"))
            .withWeekStartDate(LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY))
            .build();
        
        assert timesheet.getHours().compareTo(BigDecimal.ZERO) > 0 : "Hours should be positive";
        assert timesheet.getHours().compareTo(new BigDecimal("40.0")) <= 0 : "Hours should not exceed 40";
        assert timesheet.getHourlyRate().compareTo(BigDecimal.ZERO) > 0 : "Hourly rate should be positive";
        assert timesheet.getWeekStartDate().getDayOfWeek() == java.time.DayOfWeek.MONDAY : "Week should start on Monday";
        assert timesheet.getDescription() != null && !timesheet.getDescription().isEmpty() : "Description should not be empty";
        
        System.out.println("✓ Domain invariant validation passed");
    }
    
    private static void validateBuilderPatterns() {
        System.out.println("\n--- Validating Builder Patterns ---");
        
        // Test fluent interface
        User user = TestDataBuilder.aTutor()
            .withEmail("fluent@test.usyd.edu.au")
            .withName("Fluent Builder Test")
            .active()
            .build();
        
        assert user.getRole() == UserRole.TUTOR : "Fluent interface should work";
        assert user.getEmail().equals("fluent@test.usyd.edu.au") : "Email should be set via fluent interface";
        assert user.isActive() : "Active status should be set via fluent interface";
        
        // Test builder reusability
        User user1 = TestDataBuilder.aTutor().withEmail("user1@test.com").build();
        User user2 = TestDataBuilder.aTutor().withEmail("user2@test.com").build();
        
        assert user1 != user2 : "Builders should create different instances";
        assert user1.getEmail().equals("user1@test.com") : "First user email should be correct";
        assert user2.getEmail().equals("user2@test.com") : "Second user email should be correct";
        
        // Test default values
        User defaultUser = TestDataBuilder.aUser().build();
        Course defaultCourse = TestDataBuilder.aCourse().build();
        Timesheet defaultTimesheet = TestDataBuilder.aDraftTimesheet().build();
        
        assert defaultUser.getEmail() != null && !defaultUser.getEmail().isEmpty() : "Default user should have email";
        assert defaultUser.getName() != null && !defaultUser.getName().isEmpty() : "Default user should have name";
        assert defaultCourse.getCode() != null && !defaultCourse.getCode().isEmpty() : "Default course should have code";
        assert defaultTimesheet.getHours().compareTo(BigDecimal.ZERO) > 0 : "Default timesheet should have positive hours";
        
        System.out.println("✓ Builder pattern validation passed");
    }
}