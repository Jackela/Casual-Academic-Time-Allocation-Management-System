package com.usyd.catams;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * CATAMS应用程序主启动类
 * 
 * Casual Academic Time Allocation Management System的Spring Boot应用入口
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