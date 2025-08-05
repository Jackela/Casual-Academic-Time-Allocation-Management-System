package com.usyd.catams.repository;

import com.usyd.catams.entity.Course;
import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class CourseRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:13")
            .withDatabaseName("catams_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Course course1;
    private Course course2;
    private Course course3;

    @BeforeEach
    void setUp() {
        course1 = new Course(
            new CourseCode("COMP2022"),
            "Models of Computation",
            "2024S1",
            1L, // lecturerId
            new Money(new BigDecimal("10000.00")) // budgetAllocated
        );
        course1.setBudgetUsed(new Money(new BigDecimal("2500.00")));

        course2 = new Course(
            new CourseCode("COMP3888"),
            "Computer Science Capstone",
            "2024S1",
            2L, // lecturerId
            new Money(new BigDecimal("15000.00")) // budgetAllocated
        );
        course2.setBudgetUsed(new Money(new BigDecimal("12500.00"))); // Over 80% usage
        course2.setIsActive(true);

        course3 = new Course(
            new CourseCode("COMP1511"),
            "Programming Fundamentals",
            "2024S2",
            1L, // lecturerId
            new Money(new BigDecimal("8000.00")) // budgetAllocated
        );
        course3.setBudgetUsed(new Money(new BigDecimal("8500.00"))); // Over budget
        course3.setIsActive(false); // Inactive course

        entityManager.persistAndFlush(course1);
        entityManager.persistAndFlush(course2);
        entityManager.persistAndFlush(course3);
    }

    @Test
    void findByCode_ShouldReturnCourseWhenExists() {
        Optional<Course> result = courseRepository.findByCode("COMP2022");

        assertThat(result).isPresent();
        assertThat(result.get().getCode()).isEqualTo("COMP2022");
        assertThat(result.get().getName()).isEqualTo("Models of Computation");
    }

    @Test
    void findByCode_ShouldReturnEmptyWhenNotExists() {
        Optional<Course> result = courseRepository.findByCode("NONEXISTENT");

        assertThat(result).isEmpty();
    }

    @Test
    void findByCodeAndIsActive_ShouldReturnActiveCourse() {
        Optional<Course> result = courseRepository.findByCodeAndIsActive("COMP2022", true);

        assertThat(result).isPresent();
        assertThat(result.get().getCode()).isEqualTo("COMP2022");
        assertThat(result.get().getIsActive()).isTrue();
    }

    @Test
    void findByCodeAndIsActive_ShouldReturnEmptyForInactiveCourse() {
        Optional<Course> result = courseRepository.findByCodeAndIsActive("COMP1511", true);

        assertThat(result).isEmpty();
    }

    @Test
    void findByCodeAndIsActive_ShouldReturnInactiveCourse() {
        Optional<Course> result = courseRepository.findByCodeAndIsActive("COMP1511", false);

        assertThat(result).isPresent();
        assertThat(result.get().getCode()).isEqualTo("COMP1511");
        assertThat(result.get().getIsActive()).isFalse();
    }

    @Test
    void findByLecturerId_ShouldReturnCoursesForLecturer() {
        List<Course> result = courseRepository.findByLecturerId(1L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Course::getLecturerId).containsOnly(1L);
        assertThat(result).extracting(Course::getCode).containsExactlyInAnyOrder("COMP2022", "COMP1511");
    }

    @Test
    void findByLecturerId_ShouldReturnEmptyForNonExistentLecturer() {
        List<Course> result = courseRepository.findByLecturerId(999L);

        assertThat(result).isEmpty();
    }

    @Test
    void findByLecturerIdAndIsActive_ShouldReturnActiveCoursesOnly() {
        List<Course> result = courseRepository.findByLecturerIdAndIsActive(1L, true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("COMP2022");
        assertThat(result.get(0).getIsActive()).isTrue();
    }

    @Test
    void findByLecturerIdAndIsActive_ShouldReturnInactiveCoursesOnly() {
        List<Course> result = courseRepository.findByLecturerIdAndIsActive(1L, false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("COMP1511");
        assertThat(result.get(0).getIsActive()).isFalse();
    }

    @Test
    void findBySemester_ShouldReturnCoursesInSemester() {
        List<Course> result = courseRepository.findBySemester("2024S1");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Course::getSemester).containsOnly("2024S1");
        assertThat(result).extracting(Course::getCode).containsExactlyInAnyOrder("COMP2022", "COMP3888");
    }

    @Test
    void findBySemesterAndIsActive_ShouldReturnActiveCoursesInSemester() {
        List<Course> result = courseRepository.findBySemesterAndIsActive("2024S1", true);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(c -> c.getSemester().equals("2024S1"));
        assertThat(result).allMatch(Course::getIsActive);
    }

    @Test
    void findByIsActive_ShouldReturnActiveCourses() {
        List<Course> result = courseRepository.findByIsActive(true);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(Course::getIsActive);
        assertThat(result).extracting(Course::getCode).containsExactlyInAnyOrder("COMP2022", "COMP3888");
    }

    @Test
    void findByIsActive_ShouldReturnInactiveCourses() {
        List<Course> result = courseRepository.findByIsActive(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("COMP1511");
        assertThat(result.get(0).getIsActive()).isFalse();
    }

    @Test
    void findByIsActiveWithPaging_ShouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Course> result = courseRepository.findByIsActive(true, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(2);
        assertThat(result.getContent().get(0).getIsActive()).isTrue();
    }

    @Test
    void findByLecturerIdWithPaging_ShouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Course> result = courseRepository.findByLecturerId(1L, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(2);
        assertThat(result.getContent().get(0).getLecturerId()).isEqualTo(1L);
    }

    @Test
    void existsByCode_ShouldReturnTrueWhenCourseExists() {
        boolean exists = courseRepository.existsByCode("COMP2022");

        assertThat(exists).isTrue();
    }

    @Test
    void existsByCode_ShouldReturnFalseWhenCourseNotExists() {
        boolean exists = courseRepository.existsByCode("NONEXISTENT");

        assertThat(exists).isFalse();
    }

    @Test
    void existsByCodeAndIsActive_ShouldReturnTrueForActiveCourse() {
        boolean exists = courseRepository.existsByCodeAndIsActive("COMP2022", true);

        assertThat(exists).isTrue();
    }

    @Test
    void existsByCodeAndIsActive_ShouldReturnFalseForInactiveCourse() {
        boolean exists = courseRepository.existsByCodeAndIsActive("COMP1511", true);

        assertThat(exists).isFalse();
    }

    @Test
    void existsByCodeAndIsActive_ShouldReturnTrueForInactiveCourseWhenSearchingInactive() {
        boolean exists = courseRepository.existsByCodeAndIsActive("COMP1511", false);

        assertThat(exists).isTrue();
    }

    @Test
    void findCoursesWithBudgetUsage_ShouldReturnAllCoursesWhenNoLecturerFilter() {
        List<Course> result = courseRepository.findCoursesWithBudgetUsage(null);

        assertThat(result).hasSize(3);
        // Should be ordered by budgetUsed DESC
        assertThat(result.get(0).getBudgetUsed()).isGreaterThanOrEqualTo(result.get(1).getBudgetUsed());
        assertThat(result.get(1).getBudgetUsed()).isGreaterThanOrEqualTo(result.get(2).getBudgetUsed());
    }

    @Test
    void findCoursesWithBudgetUsage_ShouldFilterByLecturer() {
        List<Course> result = courseRepository.findCoursesWithBudgetUsage(1L);

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(c -> c.getLecturerId().equals(1L));
        assertThat(result).extracting(Course::getCode).containsExactlyInAnyOrder("COMP2022", "COMP1511");
    }

    @Test
    void findCoursesWithLowBudget_ShouldReturnCoursesOver80Percent() {
        List<Course> result = courseRepository.findCoursesWithLowBudget();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("COMP3888");
        
        // Verify it's over 80%: 12500 > (15000 * 0.8 = 12000)
        BigDecimal budgetUsed = result.get(0).getBudgetUsed();
        BigDecimal budgetAllocated = result.get(0).getBudgetAllocated();
        BigDecimal threshold = budgetAllocated.multiply(new BigDecimal("0.8"));
        assertThat(budgetUsed).isGreaterThan(threshold);
    }

    @Test
    void findCoursesOverBudget_ShouldReturnCoursesExceedingBudget() {
        List<Course> result = courseRepository.findCoursesOverBudget();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("COMP1511");
        
        // Verify it's over budget: 8500 > 8000
        assertThat(result.get(0).getBudgetUsed()).isGreaterThan(result.get(0).getBudgetAllocated());
    }

    @Test
    void getTotalBudgetAllocatedByLecturer_ShouldReturnCorrectSum() {
        Double result = courseRepository.getTotalBudgetAllocatedByLecturer(1L);

        // COMP2022: 10000 + COMP1511: 8000 = 18000 (but COMP1511 is inactive, so only COMP2022: 10000)
        assertThat(result).isEqualTo(10000.0);
    }

    @Test
    void getTotalBudgetAllocatedByLecturer_ShouldReturnZeroForNonExistentLecturer() {
        Double result = courseRepository.getTotalBudgetAllocatedByLecturer(999L);

        assertThat(result).isEqualTo(0.0);
    }

    @Test
    void getTotalBudgetUsedByLecturer_ShouldReturnCorrectSum() {
        Double result = courseRepository.getTotalBudgetUsedByLecturer(1L);

        // Only active courses: COMP2022: 2500 (COMP1511 is inactive)
        assertThat(result).isEqualTo(2500.0);
    }

    @Test
    void getTotalBudgetUsedByLecturer_ShouldReturnZeroForNonExistentLecturer() {
        Double result = courseRepository.getTotalBudgetUsedByLecturer(999L);

        assertThat(result).isEqualTo(0.0);
    }

    @Test
    void existsByIdAndLecturerId_ShouldReturnTrueWhenLecturerTeachesCourse() {
        boolean exists = courseRepository.existsByIdAndLecturerId(course1.getId(), 1L);

        assertThat(exists).isTrue();
    }

    @Test
    void existsByIdAndLecturerId_ShouldReturnFalseWhenLecturerDoesNotTeachCourse() {
        boolean exists = courseRepository.existsByIdAndLecturerId(course1.getId(), 999L);

        assertThat(exists).isFalse();
    }

    @Test
    void existsByIdAndLecturerId_ShouldReturnFalseForNonExistentCourse() {
        boolean exists = courseRepository.existsByIdAndLecturerId(999L, 1L);

        assertThat(exists).isFalse();
    }
}