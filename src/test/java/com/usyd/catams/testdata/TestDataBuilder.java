package com.usyd.catams.testdata;

import com.usyd.catams.dto.request.ApprovalActionRequest;
import com.usyd.catams.dto.request.AuthenticationRequest;
import com.usyd.catams.dto.request.TimesheetCreateRequest;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Test data builders for consistent test data creation across all test types.
 * Following the Builder pattern for fluent, readable test data construction.
 */
public class TestDataBuilder {

    // User Builders
    public static class UserBuilder {
        private Long id;
        private String email;
        private String password;
        private String name;
        private UserRole role;
        
        private UserBuilder() {}
        
        public UserBuilder id(Long id) {
            this.id = id;
            return this;
        }
        
        public UserBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserBuilder password(String password) {
            this.password = password;
            return this;
        }
        
        public UserBuilder name(String name) {
            this.name = name;
            return this;
        }
        
        public UserBuilder role(UserRole role) {
            this.role = role;
            return this;
        }
        
        public User build() {
            User user = new User();
            user.setId(id);
            user.setEmail(email != null ? email : "test@university.edu");
            user.setHashedPassword(password != null ? password : "password");
            user.setName(name != null ? name : "Test User");
            user.setRole(role != null ? role : UserRole.TUTOR);
            user.setActive(true); // Set user as active by default
            return user;
        }
    }
    
    public static UserBuilder aLecturer() {
        return new UserBuilder()
            .id(100L)
            .email("lecturer@test.com")
            .name("Dr. Test Lecturer")
            .role(UserRole.LECTURER);
    }
    
    public static UserBuilder aTutor() {
        return new UserBuilder()
            .id(200L)
            .email("tutor@test.com")
            .name("Test Tutor")
            .role(UserRole.TUTOR);
    }
    
    public static UserBuilder anAdmin() {
        return new UserBuilder()
            .id(300L)
            .email("admin@test.com")
            .name("Test Admin")
            .role(UserRole.ADMIN);
    }

    // Course Builders
    public static class CourseBuilder {
        private Long id;
        private String code;
        private String name;
        private User lecturer;
        
        private CourseBuilder() {}
        
        public CourseBuilder id(Long id) {
            this.id = id;
            return this;
        }
        
        public CourseBuilder code(String code) {
            this.code = code;
            return this;
        }
        
        public CourseBuilder name(String name) {
            this.name = name;
            return this;
        }
        
        public CourseBuilder lecturer(User lecturer) {
            this.lecturer = lecturer;
            return this;
        }
        
        public Course build() {
            Course course = new Course();
            course.setId(id);
            course.setCode(code != null ? code : "TEST3001");
            course.setName(name != null ? name : "Test Course");
            course.setSemester("2024S1");
            course.setLecturerId(lecturer != null ? lecturer.getId() : aLecturer().build().getId());
            course.setBudgetAllocated(new java.math.BigDecimal("10000.00"));
            course.setBudgetUsed(new java.math.BigDecimal("0.00"));
            return course;
        }
    }
    
    public static CourseBuilder aCourse() {
        return new CourseBuilder()
            .id(1000L)
            .code("COMP1001")
            .name("Introduction to Programming");
    }

    // Timesheet Request Builders
    public static class TimesheetCreateRequestBuilder {
        private Long tutorId;
        private Long courseId;
        private LocalDate weekCommencing;
        private BigDecimal hours;
        private BigDecimal hourlyRate;
        private String description;
        
        private TimesheetCreateRequestBuilder() {}
        
        public TimesheetCreateRequestBuilder tutorId(Long tutorId) {
            this.tutorId = tutorId;
            return this;
        }
        
        public TimesheetCreateRequestBuilder courseId(Long courseId) {
            this.courseId = courseId;
            return this;
        }
        
        public TimesheetCreateRequestBuilder weekCommencing(LocalDate weekCommencing) {
            this.weekCommencing = weekCommencing;
            return this;
        }
        
        public TimesheetCreateRequestBuilder hours(BigDecimal hours) {
            this.hours = hours;
            return this;
        }
        
        public TimesheetCreateRequestBuilder hourlyRate(BigDecimal hourlyRate) {
            this.hourlyRate = hourlyRate;
            return this;
        }
        
        public TimesheetCreateRequestBuilder description(String description) {
            this.description = description;
            return this;
        }
        
        public TimesheetCreateRequest build() {
            TimesheetCreateRequest request = new TimesheetCreateRequest();
            request.setTutorId(tutorId != null ? tutorId : 200L);
            request.setCourseId(courseId != null ? courseId : 1000L);
            request.setWeekStartDate(weekCommencing != null ? weekCommencing : getNextMonday());
            request.setHours(hours != null ? hours : new BigDecimal("10.0"));
            request.setHourlyRate(hourlyRate != null ? hourlyRate : new BigDecimal("35.00"));
            request.setDescription(description != null ? description : "Test timesheet description");
            return request;
        }
        
        private LocalDate getNextMonday() {
            LocalDate today = LocalDate.now();
            return today.with(DayOfWeek.MONDAY);
        }
    }
    
    public static TimesheetCreateRequestBuilder aTimesheetRequest() {
        return new TimesheetCreateRequestBuilder();
    }

    // Auth Request Builders
    public static class AuthRequestBuilder {
        private String email;
        private String password;
        
        private AuthRequestBuilder() {}
        
        public AuthRequestBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public AuthRequestBuilder password(String password) {
            this.password = password;
            return this;
        }
        
        public AuthenticationRequest build() {
            AuthenticationRequest request = new AuthenticationRequest();
            request.setEmail(email != null ? email : "test@university.edu");
            request.setPassword(password != null ? password : "password");
            return request;
        }
    }
    
    public static AuthRequestBuilder anAuthRequest() {
        return new AuthRequestBuilder();
    }

    // Approval Action Request Builders
    public static class ApprovalActionRequestBuilder {
        private Long timesheetId;
        private ApprovalAction action;
        private String comment;
        
        private ApprovalActionRequestBuilder() {}
        
        public ApprovalActionRequestBuilder timesheetId(Long timesheetId) {
            this.timesheetId = timesheetId;
            return this;
        }
        
        public ApprovalActionRequestBuilder action(ApprovalAction action) {
            this.action = action;
            return this;
        }
        
        public ApprovalActionRequestBuilder comment(String comment) {
            this.comment = comment;
            return this;
        }
        
        public ApprovalActionRequest build() {
            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setTimesheetId(timesheetId != null ? timesheetId : 1L);
            request.setAction(action != null ? action : ApprovalAction.SUBMIT_FOR_APPROVAL);
            request.setComment(comment != null ? comment : "Test approval comment");
            return request;
        }
    }
    
    public static ApprovalActionRequestBuilder anApprovalActionRequest() {
        return new ApprovalActionRequestBuilder();
    }

    // Timesheet Entity Builders
    public static class TimesheetBuilder {
        private Long id;
        private User tutor;
        private Course course;
        private LocalDate weekCommencing;
        private BigDecimal hours;
        private BigDecimal hourlyRate;
        private String description;
        private ApprovalStatus status;
        
        private TimesheetBuilder() {}
        
        public TimesheetBuilder id(Long id) {
            this.id = id;
            return this;
        }
        
        public TimesheetBuilder tutor(User tutor) {
            this.tutor = tutor;
            return this;
        }
        
        public TimesheetBuilder course(Course course) {
            this.course = course;
            return this;
        }
        
        public TimesheetBuilder weekCommencing(LocalDate weekCommencing) {
            this.weekCommencing = weekCommencing;
            return this;
        }
        
        public TimesheetBuilder hours(BigDecimal hours) {
            this.hours = hours;
            return this;
        }
        
        public TimesheetBuilder hourlyRate(BigDecimal hourlyRate) {
            this.hourlyRate = hourlyRate;
            return this;
        }
        
        public TimesheetBuilder description(String description) {
            this.description = description;
            return this;
        }
        
        public TimesheetBuilder status(ApprovalStatus status) {
            this.status = status;
            return this;
        }
        
        public Timesheet build() {
            Timesheet timesheet = new Timesheet();
            timesheet.setId(id);
            timesheet.setTutorId(tutor != null ? tutor.getId() : aTutor().build().getId());
            timesheet.setCourseId(course != null ? course.getId() : aCourse().build().getId());
            timesheet.setWeekStartDate(weekCommencing != null ? weekCommencing : LocalDate.now().with(DayOfWeek.MONDAY));
            timesheet.setHours(hours != null ? hours : new BigDecimal("10.0"));
            timesheet.setHourlyRate(hourlyRate != null ? hourlyRate : new BigDecimal("35.00"));
            timesheet.setDescription(description != null ? description : "Test timesheet");
            timesheet.setStatus(status != null ? status : ApprovalStatus.DRAFT);
            timesheet.setCreatedBy(tutor != null ? tutor.getId() : 200L);
            return timesheet;
        }
    }
    
    public static TimesheetBuilder aTimesheet() {
        return new TimesheetBuilder()
            .id(5000L);
    }
    
    public static TimesheetBuilder aDraftTimesheet() {
        return aTimesheet().status(ApprovalStatus.DRAFT);
    }
    
    public static TimesheetBuilder aPendingTimesheetForLecturer() {
        return aTimesheet().status(ApprovalStatus.PENDING_LECTURER_APPROVAL);
    }
    
    public static TimesheetBuilder anApprovedTimesheet() {
        return aTimesheet().status(ApprovalStatus.FINAL_APPROVED);
    }
}