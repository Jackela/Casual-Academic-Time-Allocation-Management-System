package com.usyd.catams.e2e;

import com.usyd.catams.entity.Course;
import com.usyd.catams.repository.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;

@Configuration
@Profile({"e2e", "e2e-local", "test"})
public class E2ECourseSeeder {

    @Bean
    public CommandLineRunner ensureBaselineCourse(CourseRepository courseRepository) {
        return args -> {
            try {
                // Ensure a baseline course with code "COURSE-1" exists for assignment tests
                String code = "COURSE-1";
                if (!courseRepository.existsByCode(code)) {
                    Course c = new Course(code, "Baseline Course", "2025-S1", 1L, new BigDecimal("10000"));
                    courseRepository.save(c);
                }
            } catch (Exception ignored) {
                // Non-fatal in test envs
            }
        };
    }
}

