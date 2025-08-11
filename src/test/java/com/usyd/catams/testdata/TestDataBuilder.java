package com.usyd.catams.testdata;

import com.usyd.catams.testdata.builder.CourseBuilder;
import com.usyd.catams.testdata.builder.UserBuilder;
import com.usyd.catams.testdata.builder.TimesheetCreateRequestBuilder;
import com.usyd.catams.testdata.builder.TimesheetBuilder;

/**
 * Central entry point for all test data builders following Domain-Driven Design principles.
 * 
 * This class provides static factory methods to create instances of various entity builders
 * that respect domain invariants, aggregate boundaries, and business rules. Each builder
 * enforces proper construction of domain entities with their value objects.
 * 
 * <h3>Design by Contract (DbC) Principles:</h3>
 * <ul>
 *   <li><strong>Preconditions:</strong> All factory methods provide sensible defaults</li>
 *   <li><strong>Postconditions:</strong> Built entities are valid according to domain rules</li>
 *   <li><strong>Invariants:</strong> Domain constraints are maintained throughout construction</li>
 * </ul>
 * 
 * <h3>DDD Compliance:</h3>
 * <ul>
 *   <li>Uses proper value objects (Money, Email, CourseCode, WeekPeriod)</li>
 *   <li>Respects aggregate root boundaries</li>
 *   <li>Enforces business rule constraints</li>
 *   <li>Supports SSOT (Single Source of Truth) for test scenarios</li>
 * </ul>
 * 
 * @author Integration Test Infrastructure
 * @since 1.0.0
 */
public class TestDataBuilder {

    /**
     * Creates a new UserBuilder instance.
     * @return a UserBuilder instance
     */
    public static UserBuilder aUser() {
        return new UserBuilder();
    }

    /**
     * Creates a new UserBuilder instance configured as a Lecturer.
     * @return a UserBuilder instance configured as a Lecturer
     */
    public static UserBuilder aLecturer() {
        return new UserBuilder().asLecturer();
    }

    /**
     * Creates a new UserBuilder instance configured as a Tutor.
     * @return a UserBuilder instance configured as a Tutor
     */
    public static UserBuilder aTutor() {
        return new UserBuilder().asTutor();
    }

    /**
     * Creates a new UserBuilder instance configured as an Admin.
     * @return a UserBuilder instance configured as an Admin
     */
    public static UserBuilder anAdmin() {
        return new UserBuilder().asAdmin();
    }

    /**
     * Creates a new CourseBuilder instance.
     * @return a CourseBuilder instance
     */    public static CourseBuilder aCourse() {
        return new CourseBuilder();
    }

    /**
     * Creates a new TimesheetCreateRequestBuilder instance.
     * @return a TimesheetCreateRequestBuilder instance
     */
    public static TimesheetCreateRequestBuilder aTimesheetRequest() {
        return new TimesheetCreateRequestBuilder();
    }

    /**
     * Creates a new TimesheetBuilder instance configured as a Draft Timesheet.
     * @return a TimesheetBuilder instance configured as a Draft Timesheet
     */
    public static TimesheetBuilder aDraftTimesheet() {
        return new TimesheetBuilder().asDraft();
    }

    // Add other entity builders here as needed
}
