package com.usyd.catams.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Central Clock configuration to enable deterministic time in tests.
 */
@Configuration
public class TimeConfig {
    @Bean
    public Clock systemClock() {
        return Clock.systemDefaultZone();
    }
}

