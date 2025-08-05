package com.usyd.catams.repository;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Email;
import com.usyd.catams.common.domain.model.Money;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class CourseRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private CourseRepository courseRepository;

    private User lecturer1;
    private User lecturer2;
    private Course course1;
    private Course course2;
    private Course inactiveCourse;

    @BeforeEach
    void setUp() {
        // Create test lecturers
        lecturer1 = new User(new Email("lecturer1@usyd.edu.au"), "Test Lecturer 1", 
                           "hashedPassword", UserRole.LECTURER);
        lecturer2 = new User(new Email("lecturer2@usyd.edu.au"), "Test Lecturer 2", 
                           "hashedPassword", UserRole.LECTURER);
        
        lecturer1 = entityManager.persistAndFlush(lecturer1);
        lecturer2 = entityManager.persistAndFlush(lecturer2);
        
        // Create test courses
        course1 = new Course(new CourseCode("COMP3999"), "Software Engineering", "2024S1", 
                           lecturer1.getId(), new Money(new BigDecimal("5000.00")));
        course2 = new Course(new CourseCode("MATH2001"), "Linear Algebra", "2024S1", 
                           lecturer2.getId(), new Money(new BigDecimal("3000.00")));
        inactiveCourse = new Course(new CourseCode("PHYS1001"), "Physics Fundamentals", "2023S2", 
                                  lecturer1.getId(), new Money(new BigDecimal("2000.00")));
        inactiveCourse.setIsActive(false);
        
        course1 = entityManager.persistAndFlush(course1);
        course2 = entityManager.persistAndFlush(course2);
        inactiveCourse = entityManager.persistAndFlush(inactiveCourse);
    }

    @Test
    void testFindByCode() {
        // When
        Optional<Course> found = courseRepository.findByCode("COMP3999");
        Optional<Course> notFound = courseRepository.findByCode("NONEXISTENT");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Software Engineering");
        assertThat(found.get().getLecturerId()).isEqualTo(lecturer1.getId());
        
        assertThat(notFound).isEmpty();
    }

    @Test
    void testFindByCodeAndIsActive() {
        // When
        Optional<Course> activeCourse = courseRepository.findByCodeAndIsActive("COMP3999", true);
        Optional<Course> inactiveSearch = courseRepository.findByCodeAndIsActive("PHYS1001", false);
        Optional<Course> activeSearchInactive = courseRepository.findByCodeAndIsActive("PHYS1001", true);

        // Then
        assertThat(activeCourse).isPresent();
        assertThat(activeCourse.get().getName()).isEqualTo("Software Engineering");
        assertThat(activeCourse.get().getIsActive()).isTrue();
        
        assertThat(inactiveSearch).isPresent();
        assertThat(inactiveSearch.get().getName()).isEqualTo("Physics Fundamentals");
        assertThat(inactiveSearch.get().getIsActive()).isFalse();
        
        // Should not find inactive course when looking for active
        assertThat(activeSearchInactive).isEmpty();
    }

    @Test
    void testFindByLecturerId() {
        // When
        List<Course> lecturer1Courses = courseRepository.findByLecturerId(lecturer1.getId());
        List<Course> lecturer2Courses = courseRepository.findByLecturerId(lecturer2.getId());

        // Then
        assertThat(lecturer1Courses).hasSize(2); // course1 + inactiveCourse
        assertThat(lecturer1Courses).extracting(Course::getCode)
                .containsExactlyInAnyOrder("COMP3999", "PHYS1001");
        
        assertThat(lecturer2Courses).hasSize(1);
        assertThat(lecturer2Courses.get(0).getCode()).isEqualTo("MATH2001");
    }

    @Test
    void testFindByLecturerIdAndIsActive() {
        // When
        List<Course> lecturer1ActiveCourses = courseRepository.findByLecturerIdAndIsActive(lecturer1.getId(), true);
        List<Course> lecturer1InactiveCourses = courseRepository.findByLecturerIdAndIsActive(lecturer1.getId(), false);

        // Then
        assertThat(lecturer1ActiveCourses).hasSize(1);
        assertThat(lecturer1ActiveCourses.get(0).getCode()).isEqualTo("COMP3999");
        assertThat(lecturer1ActiveCourses.get(0).getIsActive()).isTrue();
        
        assertThat(lecturer1InactiveCourses).hasSize(1);
        assertThat(lecturer1InactiveCourses.get(0).getCode()).isEqualTo("PHYS1001");
        assertThat(lecturer1InactiveCourses.get(0).getIsActive()).isFalse();
    }

    @Test
    void testFindBySemester() {
        // Given - Add course for different semester
        Course semester2Course = new Course(new CourseCode("COMP2001"), "Data Structures", "2024S2", 
                                          lecturer1.getId(), new Money(new BigDecimal("4000.00")));
        entityManager.persistAndFlush(semester2Course);

        // When
        List<Course> semester1Courses = courseRepository.findBySemester("2024S1");
        List<Course> semester2Courses = courseRepository.findBySemester("2024S2");
        List<Course> oldSemesterCourses = courseRepository.findBySemester("2023S2");

        // Then
        assertThat(semester1Courses).hasSize(2); // course1 + course2
        assertThat(semester1Courses).extracting(Course::getCode)
                .containsExactlyInAnyOrder("COMP3999", "MATH2001");
        
        assertThat(semester2Courses).hasSize(1);
        assertThat(semester2Courses.get(0).getCode()).isEqualTo("COMP2001");
        
        assertThat(oldSemesterCourses).hasSize(1);
        assertThat(oldSemesterCourses.get(0).getCode()).isEqualTo("PHYS1001");
    }

    @Test
    void testFindBySemesterAndIsActive() {
        // Given - Add more test data
        Course activeSemester2 = new Course(new CourseCode("COMP2001"), "Data Structures", "2024S2", 
                                          lecturer1.getId(), new Money(new BigDecimal("4000.00")));
        Course inactiveSemester2 = new Course(new CourseCode("COMP2002"), "Algorithms", "2024S2", 
                                            lecturer2.getId(), new Money(new BigDecimal("3500.00")));
        inactiveSemester2.setIsActive(false);
        
        entityManager.persistAndFlush(activeSemester2);
        entityManager.persistAndFlush(inactiveSemester2);

        // When
        List<Course> activeSemester1 = courseRepository.findBySemesterAndIsActive("2024S1", true);
        List<Course> activeSemester2Courses = courseRepository.findBySemesterAndIsActive("2024S2", true);
        List<Course> inactiveSemester2Courses = courseRepository.findBySemesterAndIsActive("2024S2", false);

        // Then
        assertThat(activeSemester1).hasSize(2); // course1 + course2
        assertThat(activeSemester2Courses).hasSize(1);
        assertThat(activeSemester2Courses.get(0).getCode()).isEqualTo("COMP2001");
        
        assertThat(inactiveSemester2Courses).hasSize(1);
        assertThat(inactiveSemester2Courses.get(0).getCode()).isEqualTo("COMP2002");
    }

    @Test
    void testFindByIsActive() {
        // When
        List<Course> activeCourses = courseRepository.findByIsActive(true);
        List<Course> inactiveCourses = courseRepository.findByIsActive(false);

        // Then
        assertThat(activeCourses).hasSize(2); // course1 + course2
        assertThat(activeCourses).extracting(Course::getCode)
                .containsExactlyInAnyOrder("COMP3999", "MATH2001");
        assertThat(activeCourses).allMatch(Course::getIsActive);
        
        assertThat(inactiveCourses).hasSize(1);
        assertThat(inactiveCourses.get(0).getCode()).isEqualTo("PHYS1001");
        assertThat(inactiveCourses).noneMatch(Course::getIsActive);
    }

    @Test
    void testFindByIsActiveWithPaging() {
        // Given - Add more courses to test paging
        for (int i = 1; i <= 5; i++) {
            Course course = new Course(new CourseCode("TEST" + (3000 + i)), "Test Course " + i, "2024S1", 
                                     lecturer1.getId(), new Money(new BigDecimal("1000.00")));
            entityManager.persistAndFlush(course);
        }

        // When
        Page<Course> page1 = courseRepository.findByIsActive(true, PageRequest.of(0, 3));
        Page<Course> page2 = courseRepository.findByIsActive(true, PageRequest.of(1, 3));

        // Then
        assertThat(page1.getContent()).hasSize(3);
        assertThat(page1.getTotalElements()).isEqualTo(7); // 2 original + 5 new
        assertThat(page1.getTotalPages()).isEqualTo(3); // ceil(7/3)
        
        assertThat(page2.getContent()).hasSize(3);
        assertThat(page2.getNumber()).isEqualTo(1);
    }

    @Test
    void testFindByLecturerIdWithPaging() {
        // Given - Add more courses for lecturer1
        for (int i = 1; i <= 3; i++) {
            Course course = new Course(new CourseCode("LECT" + (1000 + i)), "Lecturer Course " + i, "2024S1", 
                                     lecturer1.getId(), new Money(new BigDecimal("2000.00")));
            entityManager.persistAndFlush(course);
        }

        // When
        Page<Course> page = courseRepository.findByLecturerId(lecturer1.getId(), PageRequest.of(0, 3));

        // Then
        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getTotalElements()).isEqualTo(5); // 2 original + 3 new
        assertThat(page.getTotalPages()).isEqualTo(2); // ceil(5/3)
        
        assertThat(page.getContent()).allMatch(course -> course.getLecturerId().equals(lecturer1.getId()));
    }

    @Test
    void testExistsByCode() {
        // When & Then
        assertThat(courseRepository.existsByCode("COMP3999")).isTrue();
        assertThat(courseRepository.existsByCode("MATH2001")).isTrue();
        assertThat(courseRepository.existsByCode("PHYS1001")).isTrue(); // Even inactive courses exist
        assertThat(courseRepository.existsByCode("NONEXISTENT")).isFalse();
    }

    @Test
    void testExistsByCodeAndIsActive() {
        // When & Then
        assertThat(courseRepository.existsByCodeAndIsActive("COMP3999", true)).isTrue();
        assertThat(courseRepository.existsByCodeAndIsActive("PHYS1001", false)).isTrue();
        assertThat(courseRepository.existsByCodeAndIsActive("PHYS1001", true)).isFalse(); // Inactive course
        assertThat(courseRepository.existsByCodeAndIsActive("NONEXISTENT", true)).isFalse();
    }

    @Test
    void testFindCoursesWithBudgetUsage() {
        // Given - Update budget used for testing
        course1.setBudgetUsed(new Money(new BigDecimal("1500.00")));
        course2.setBudgetUsed(new Money(new BigDecimal("500.00")));
        entityManager.merge(course1);
        entityManager.merge(course2);
        entityManager.flush();

        // When
        List<Course> allCoursesWithBudget = courseRepository.findCoursesWithBudgetUsage(null);
        List<Course> lecturer1CoursesWithBudget = courseRepository.findCoursesWithBudgetUsage(lecturer1.getId());

        // Then
        assertThat(allCoursesWithBudget).hasSize(3); // All courses
        // Should be ordered by budgetUsed DESC
        assertThat(allCoursesWithBudget.get(0).getCode()).isEqualTo("COMP3999"); // Highest budget used
        
        assertThat(lecturer1CoursesWithBudget).hasSize(2); // course1 + inactiveCourse
        assertThat(lecturer1CoursesWithBudget).allMatch(course -> course.getLecturerId().equals(lecturer1.getId()));
    }

    @Test
    void testFindCoursesWithLowBudget() {
        // Given - Set budget used to > 80% of allocated
        course1.setBudgetUsed(new Money(new BigDecimal("4500.00"))); // 90% of 5000
        course2.setBudgetUsed(new Money(new BigDecimal("1000.00"))); // 33% of 3000
        entityManager.merge(course1);
        entityManager.merge(course2);
        entityManager.flush();

        // When
        List<Course> lowBudgetCourses = courseRepository.findCoursesWithLowBudget();

        // Then
        assertThat(lowBudgetCourses).hasSize(1);
        assertThat(lowBudgetCourses.get(0).getCode()).isEqualTo("COMP3999");
        assertThat(lowBudgetCourses.get(0).getBudgetUsed()).isGreaterThan(
                lowBudgetCourses.get(0).getBudgetAllocated().multiply(new BigDecimal("0.8"))
        );
    }

    @Test
    void testFindCoursesOverBudget() {
        // Given - Set budget used to exceed allocated
        course1.setBudgetUsed(new Money(new BigDecimal("5500.00"))); // Over 5000 allocated
        course2.setBudgetUsed(new Money(new BigDecimal("2000.00"))); // Under 3000 allocated
        entityManager.merge(course1);
        entityManager.merge(course2);
        entityManager.flush();

        // When
        List<Course> overBudgetCourses = courseRepository.findCoursesOverBudget();

        // Then
        assertThat(overBudgetCourses).hasSize(1);
        assertThat(overBudgetCourses.get(0).getCode()).isEqualTo("COMP3999");
        assertThat(overBudgetCourses.get(0).getBudgetUsed()).isGreaterThan(
                overBudgetCourses.get(0).getBudgetAllocated()
        );
    }

    @Test
    void testGetTotalBudgetAllocatedByLecturer() {
        // When
        Double lecturer1TotalAllocated = courseRepository.getTotalBudgetAllocatedByLecturer(lecturer1.getId());
        Double lecturer2TotalAllocated = courseRepository.getTotalBudgetAllocatedByLecturer(lecturer2.getId());

        // Then
        // lecturer1 has COMP3999 (5000) + PHYS1001 (2000, but inactive) = only 5000 (active only)
        assertThat(lecturer1TotalAllocated).isEqualTo(5000.0);
        
        // lecturer2 has MATH2001 (3000)
        assertThat(lecturer2TotalAllocated).isEqualTo(3000.0);
    }

    @Test
    void testGetTotalBudgetUsedByLecturer() {
        // Given - Set some budget used
        course1.setBudgetUsed(new Money(new BigDecimal("1500.00")));
        course2.setBudgetUsed(new Money(new BigDecimal("800.00")));
        entityManager.merge(course1);
        entityManager.merge(course2);
        entityManager.flush();

        // When
        Double lecturer1TotalUsed = courseRepository.getTotalBudgetUsedByLecturer(lecturer1.getId());
        Double lecturer2TotalUsed = courseRepository.getTotalBudgetUsedByLecturer(lecturer2.getId());

        // Then
        // Only active courses count
        assertThat(lecturer1TotalUsed).isEqualTo(1500.0); // Only course1 (active)
        assertThat(lecturer2TotalUsed).isEqualTo(800.0); // course2
    }

    @Test
    void testExistsByIdAndLecturerId() {
        // When & Then
        assertThat(courseRepository.existsByIdAndLecturerId(course1.getId(), lecturer1.getId())).isTrue();
        assertThat(courseRepository.existsByIdAndLecturerId(course2.getId(), lecturer2.getId())).isTrue();
        assertThat(courseRepository.existsByIdAndLecturerId(course1.getId(), lecturer2.getId())).isFalse();
        assertThat(courseRepository.existsByIdAndLecturerId(course2.getId(), lecturer1.getId())).isFalse();
    }

    @Test
    void testCourseCodeUniqueness() {
        // When & Then - Verify course codes are unique
        assertThat(courseRepository.findByCode("COMP3999")).isPresent();
        assertThat(courseRepository.existsByCode("COMP3999")).isTrue();
        
        // Each code should return exactly one course
        List<Course> allCourses = courseRepository.findAll();
        long uniqueCodes = allCourses.stream()
                .map(Course::getCode)
                .distinct()
                .count();
        assertThat(uniqueCodes).isEqualTo(allCourses.size());
    }

    @Test
    void testBudgetCalculations() {
        // Given - Set specific budget values for testing calculations
        course1.setBudgetUsed(new Money(new BigDecimal("2000.00")));
        course2.setBudgetUsed(new Money(new BigDecimal("1500.00")));
        entityManager.merge(course1);
        entityManager.merge(course2);
        entityManager.flush();

        // When
        List<Course> coursesWithBudget = courseRepository.findCoursesWithBudgetUsage(null);

        // Then - Verify budget calculations work correctly
        Course foundCourse1 = coursesWithBudget.stream()
                .filter(c -> c.getCode().equals("COMP3999"))
                .findFirst()
                .orElseThrow();
        
        assertThat(foundCourse1.getBudgetAllocated()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(foundCourse1.getBudgetUsed()).isEqualByComparingTo(new BigDecimal("2000.00"));
        
        // Test the budget remaining calculation (if implemented in entity)
        if (foundCourse1.getBudgetRemainingAmount() != null) {
            assertThat(foundCourse1.getBudgetRemainingAmount()).isEqualByComparingTo(new BigDecimal("3000.00"));
        }
    }

    @Test
    void testSemesterFiltering() {
        // Given - Create courses for multiple semesters
        Course summer2024 = new Course(new CourseCode("SUMM2001"), "Summer Course", "2024Summer", 
                                     lecturer1.getId(), new Money(new BigDecimal("1500.00")));
        Course semester1_2025 = new Course(new CourseCode("NEXT3001"), "Next Year Course", "2025S1", 
                                         lecturer2.getId(), new Money(new BigDecimal("4500.00")));
        
        entityManager.persistAndFlush(summer2024);
        entityManager.persistAndFlush(semester1_2025);

        // When
        List<Course> semester2024S1 = courseRepository.findBySemester("2024S1");
        List<Course> semesterSummer = courseRepository.findBySemester("2024Summer");
        List<Course> semester2025S1 = courseRepository.findBySemester("2025S1");

        // Then
        assertThat(semester2024S1).hasSize(2); // course1 + course2
        assertThat(semesterSummer).hasSize(1);
        assertThat(semesterSummer.get(0).getCode()).isEqualTo("SUMM2001");
        
        assertThat(semester2025S1).hasSize(1);
        assertThat(semester2025S1.get(0).getCode()).isEqualTo("NEXT3001");
    }
}