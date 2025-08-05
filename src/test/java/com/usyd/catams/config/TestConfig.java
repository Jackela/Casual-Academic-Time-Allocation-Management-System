package com.usyd.catams.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Test configuration for consistent test environment setup.
 * 
 * Provides test-specific beans and configurations that override
 * production configurations during testing.
 */
@TestConfiguration
@Profile("test")
public class TestConfig {

    /**
     * Test-specific configuration can be added here
     * For example, test-specific authentication providers,
     * mock external services, etc.
     */
}