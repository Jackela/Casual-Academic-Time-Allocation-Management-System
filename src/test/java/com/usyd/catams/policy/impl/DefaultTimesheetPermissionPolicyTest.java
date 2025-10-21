package com.usyd.catams.policy.impl;

import com.usyd.catams.domain.service.TimesheetDomainService;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests that capture the revised authorization rule:
 * tutors may never create timesheets, even for themselves,
 * while lecturers and admins retain their existing permissions.
 */
@ExtendWith(MockitoExtension.class)
class DefaultTimesheetPermissionPolicyTest {

    @Mock
    private TimesheetDomainService domainService;

    @Mock
    private CourseRepository courseRepository;

    private DefaultTimesheetPermissionPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new DefaultTimesheetPermissionPolicy(domainService, courseRepository);
    }

    @Test
    void tutorCannotCreateTimesheetEvenForSelf() {
        User tutor = user(UserRole.TUTOR, 10L);
        Course course = course(20L, 99L);

        boolean result = policy.canCreateTimesheetFor(tutor, tutor, course);

        assertThat(result)
                .as("Tutor self-service creation should be rejected to enforce lecturer/admin oversight")
                .isFalse();
    }

    @Test
    void lecturerCanCreateTimesheetForTutorTheyTeach() {
        User lecturer = user(UserRole.LECTURER, 5L);
        User tutor = user(UserRole.TUTOR, 6L);
        Course course = course(30L, lecturer.getId());

        boolean result = policy.canCreateTimesheetFor(lecturer, tutor, course);

        assertThat(result)
                .as("Lecturers should retain ability to create for tutors in their course")
                .isTrue();
    }

    @Test
    void adminCanCreateTimesheetForTutor() {
        User admin = user(UserRole.ADMIN, 1L);
        User tutor = user(UserRole.TUTOR, 2L);
        Course course = course(40L, 123L);

        boolean result = policy.canCreateTimesheetFor(admin, tutor, course);

        assertThat(result)
                .as("Admins act as superusers and can create timesheets for any tutor")
                .isTrue();
    }

    private static User user(UserRole role, long id) {
        User user = new User(role.name().toLowerCase() + id + "@example.test", role.name() + " User", "hashed", role);
        user.setId(id);
        return user;
    }

    private static Course course(long id, long lecturerId) {
        Course course = new Course("COMP6000", "Course " + id, "2024S2", lecturerId, BigDecimal.valueOf(1000));
        course.setId(id);
        return course;
    }
}
