package com.usyd.catams.repository;

import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.integration.IntegrationTestBase;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.repository.LecturerAssignmentRepository;
import com.usyd.catams.testdata.TestDataBuilder;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CourseRepositoryIntegrationTest extends IntegrationTestBase {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LecturerAssignmentRepository lecturerAssignmentRepository;

    @Autowired
    private EntityManager entityManager;

    private Course course1;
    private Course course2;
    private Course course3;
    private Long lecturerAId;
    private Long lecturerBId;

    @BeforeEach
    void setUp() {
        lecturerAssignmentRepository.deleteAll();
        lecturerAssignmentRepository.flush();

        courseRepository.deleteAll();
        courseRepository.flush();
        userRepository.deleteAll();
        userRepository.flush();

        User lecturerA = userRepository.save(
            TestDataBuilder.aLecturer()
                .withEmail("courselect1@test.com")
                .withName("Lecturer A")
                .withHashedPassword("hashedPassword123")
                .build()
        );
        User lecturerB = userRepository.save(
            TestDataBuilder.aLecturer()
                .withEmail("courselect2@test.com")
                .withName("Lecturer B")
                .withHashedPassword("hashedPassword123")
                .build()
        );
        userRepository.flush();
        lecturerAId = lecturerA.getId();
        lecturerBId = lecturerB.getId();

        course1 = new Course(
            new CourseCode("COMP2022"),
            "Models of Computation",
            "2024S1",
            lecturerAId,
            new Money(new BigDecimal("10000.00"))
        );
        course1.setBudgetUsed(new Money(new BigDecimal("2500.00")));
        course1.setIsActive(true);

        course2 = new Course(
            new CourseCode("COMP3888"),
            "Computer Science Capstone",
            "2024S1",
            lecturerBId,
            new Money(new BigDecimal("15000.00"))
        );
        course2.setBudgetUsed(new Money(new BigDecimal("12500.00"))); // > 80%
        course2.setIsActive(true);

        course3 = new Course(
            new CourseCode("COMP1511"),
            "Programming Fundamentals",
            "2024S2",
            lecturerAId,
            new Money(new BigDecimal("8000.00"))
        );
        course3.setBudgetUsed(new Money(new BigDecimal("7600.00"))); // high usage but within allocation
        course3.setIsActive(false);

        entityManager.persist(course1);
        entityManager.persist(course2);
        entityManager.persist(course3);
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void findByCode_ShouldReturnCourseWhenExists() {
        Optional<Course> result = courseRepository.findByCode("COMP2022");
        assertThat(result).isPresent();
        assertThat(result.get().getCode()).isEqualTo("COMP2022");
        assertThat(result.get().getName()).isEqualTo("Models of Computation");
    }

    @Test
    void findByCodeAndIsActive_ShouldRespectActiveFlag() {
        assertThat(courseRepository.findByCodeAndIsActive("COMP2022", true)).isPresent();
        assertThat(courseRepository.findByCodeAndIsActive("COMP2022", false)).isEmpty();
        assertThat(courseRepository.findByCodeAndIsActive("COMP1511", false)).isPresent();
    }

    @Test
    void findByLecturerId_FiltersByLecturer() {
        List<Course> byLecturer1 = courseRepository.findByLecturerId(lecturerAId);
        List<Course> byLecturer2 = courseRepository.findByLecturerId(lecturerBId);
        assertThat(byLecturer1).extracting(Course::getLecturerId).containsOnly(lecturerAId);
        assertThat(byLecturer2).extracting(Course::getLecturerId).containsOnly(lecturerBId);
    }

    @Test
    void findByLecturerIdAndIsActive_FiltersByLecturerAndActive() {
        List<Course> activeLecturer1 = courseRepository.findByLecturerIdAndIsActive(lecturerAId, true);
        assertThat(activeLecturer1).extracting(Course::getCode).containsExactlyInAnyOrder("COMP2022");
    }

    @Test
    void semesterQueries_ShouldWork() {
        assertThat(courseRepository.findBySemester("2024S1")).hasSize(2);
        assertThat(courseRepository.findBySemesterAndIsActive("2024S1", true)).hasSize(2);
        assertThat(courseRepository.findBySemesterAndIsActive("2024S2", true)).isEmpty();
    }

    @Test
    void activeQueries_ShouldWorkWithPaging() {
        List<Course> active = courseRepository.findByIsActive(true);
        assertThat(active).hasSize(2);
        Pageable pageable = PageRequest.of(0, 1);
        Page<Course> page = courseRepository.findByIsActive(true, pageable);
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void pagingByLecturer_ShouldReturnPages() {
        Page<Course> page = courseRepository.findByLecturerId(lecturerAId, PageRequest.of(0, 10));
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(Course::getLecturerId).containsOnly(lecturerAId);
    }

    @Test
    void existsQueries_ShouldBeAccurate() {
        assertThat(courseRepository.existsByCode("COMP2022")).isTrue();
        assertThat(courseRepository.existsByCode("NOPE9999")).isFalse();
        assertThat(courseRepository.existsByCodeAndIsActive("COMP2022", true)).isTrue();
        assertThat(courseRepository.existsByCodeAndIsActive("COMP1511", true)).isFalse();
    }

    @Test
    void budgetUsageQueries_ShouldIdentifyLowAndOverBudget() {
        List<Course> budgetUsage = courseRepository.findCoursesWithBudgetUsage(null);
        assertThat(budgetUsage).hasSize(3);
        assertThat(courseRepository.findCoursesWithLowBudget()).extracting(Course::getCode)
            .contains("COMP3888");
        assertThat(courseRepository.findCoursesOverBudget()).isEmpty();
    }

    @Test
    void totalsByLecturer_ShouldSumBudgets() {
        Double allocated = courseRepository.getTotalBudgetAllocatedByLecturer(lecturerAId);
        Double used = courseRepository.getTotalBudgetUsedByLecturer(lecturerAId);
        assertThat(allocated).isNotNull();
        assertThat(allocated).isGreaterThan(0.0);
        assertThat(used).isNotNull();
        assertThat(used).isGreaterThan(0.0);
    }

    @Test
    void existsByIdAndLecturerId_ShouldCheckOwnership() {
        entityManager.flush();
        assertThat(courseRepository.existsByIdAndLecturerId(course1.getId(), lecturerAId)).isTrue();
        assertThat(courseRepository.existsByIdAndLecturerId(course2.getId(), lecturerAId)).isFalse();
    }
}
