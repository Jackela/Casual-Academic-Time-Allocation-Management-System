package com.usyd.catams.config;

import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Test data initializer for development and testing environments
 * 
 * Creates initial test users in the database when running in test or dev profiles
 * 
 * @author Development Team
 * @since 1.0
 */
@Configuration
@Profile({"test", "dev"})
public class TestDataInitializer {
    
    /**
     * Initialize test data on application startup
     * 
     * @param userRepository User repository for database operations
     * @param passwordEncoder Password encoder for hashing passwords
     * @return CommandLineRunner that executes data initialization
     */
    @Bean
    public CommandLineRunner initTestData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Only initialize if database is empty
            if (userRepository.count() == 0) {
                
                // Create test tutor user
                User testTutor = new User(
                    "test@example.com",
                    "Test User",
                    passwordEncoder.encode("Password123!"),
                    UserRole.TUTOR
                );
                userRepository.save(testTutor);
                
                // Create test lecturer user
                User testLecturer = new User(
                    "lecturer@example.com",
                    "Test Lecturer",
                    passwordEncoder.encode("Password123!"),
                    UserRole.LECTURER
                );
                userRepository.save(testLecturer);
                
                // Create test admin user
                User testAdmin = new User(
                    "admin@example.com",
                    "Test Admin",
                    passwordEncoder.encode("Password123!"),
                    UserRole.ADMIN
                );
                userRepository.save(testAdmin);
                
                System.out.println("Test data initialized: 3 users created");
            }
        };
    }
}