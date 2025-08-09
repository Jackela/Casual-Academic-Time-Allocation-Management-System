package com.usyd.catams.repository;

import com.usyd.catams.entity.Course;
import com.usyd.catams.common.domain.model.CourseCode;
import com.usyd.catams.common.domain.model.Money;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.persistence.EntityManager;
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
    private EntityManager entityManager;
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

        entityManager.persist(course1);
        entityManager.flush();
        entityManager.persist(course2);
        entityManager.flush();
        entityManager.persist(course3);
        entityManager.flush();    }

    @Test
    void findByCode_ShouldReturnCourseWhenExists() {
        Optional<Course> result = courseRepository.findByCode("COMP2022");

        assertThat(result).isPresent();
        assertThat(result.get().getCode()).isEqualTo("COMP2022");
        assertThat(result.get().getName()).isEqualTo("Models of Computation");
    }

    // ... other tests from the original file
}
