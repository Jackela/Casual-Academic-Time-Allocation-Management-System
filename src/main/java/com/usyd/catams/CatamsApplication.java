package com.usyd.catams;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CATAMS Application Main Startup Class
 * 
 * Entry point for the Casual Academic Time Allocation Management System Spring Boot application
 * 
 * @author Development Team
 * @since 1.0
 */
@SpringBootApplication
public class CatamsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CatamsApplication.class, args);
    }
}