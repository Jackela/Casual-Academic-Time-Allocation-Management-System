package com.usyd.catams.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.DockerClientFactory;

import javax.sql.DataSource;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Smart PostgreSQL configuration for local E2E profile.
 * Automatically chooses the best database strategy:
 * 
 * Priority Order:
 * 1. TestContainers (if Docker is available) - Most reliable, closest to production
 * 2. Exit gracefully with helpful message (if Docker not available)
 * 
 * This ensures cross-platform compatibility and clear user guidance.
 */
@Configuration
@Profile("e2e-local")
public class EmbeddedPostgresConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(EmbeddedPostgresConfig.class);
    
    /**
     * Primary DataSource using TestContainers - preferred approach
     */
    @Bean(destroyMethod = "close")
    public DataSource dataSource() throws Exception {
        logger.info("🔧 Configuring E2E database for local environment...");
        
        // Check Docker availability first
        if (!isDockerAvailable()) {
            logger.error("❌ Docker is not available or not running!");
            logger.error("📋 To run E2E tests locally, please:");
            logger.error("   1. Install Docker Desktop");
            logger.error("   2. Start Docker Desktop");
            logger.error("   3. Verify with: docker --version");
            logger.error("💡 Alternative: Run E2E tests in CI/CD environment with Docker support");
            
            // Exit gracefully rather than trying problematic embedded postgres
            throw new RuntimeException(
                "E2E tests require Docker for TestContainers. " +
                "Please install and start Docker Desktop, then try again. " +
                "For CI/CD environments, ensure Docker service is available."
            );
        }
        
        logger.info("✅ Docker detected, using TestContainers PostgreSQL...");
        return createTestContainerDataSource();
    }
    
    /**
     * Create TestContainers-based DataSource
     */
    private DataSource createTestContainerDataSource() {
        try {
            PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
                DockerImageName.parse("postgres:15-alpine")
            )
            .withDatabaseName("catams_e2e")
            .withUsername("postgres")
            .withPassword("postgres")
            .withReuse(false) // Always fresh container for E2E tests
            .withStartupTimeoutSeconds(60); // Reasonable timeout
            
            postgres.start();
            logger.info("🐘 PostgreSQL container started on port: {}", postgres.getFirstMappedPort());
            
            // Create optimized connection pool
            HikariDataSource ds = new HikariDataSource();
            ds.setJdbcUrl(postgres.getJdbcUrl());
            ds.setUsername(postgres.getUsername());
            ds.setPassword(postgres.getPassword());
            ds.setMaximumPoolSize(10);
            ds.setMinimumIdle(2);
            ds.setConnectionTimeout(30000); // 30 seconds
            ds.setIdleTimeout(600000); // 10 minutes
            ds.setMaxLifetime(1800000); // 30 minutes
            ds.setAutoCommit(true);
            
            // Register shutdown hook for clean container termination
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    logger.info("🧹 Stopping PostgreSQL container...");
                    postgres.stop();
                    logger.info("✅ PostgreSQL container stopped");
                } catch (Exception e) {
                    logger.warn("⚠️  Error stopping PostgreSQL container: {}", e.getMessage());
                }
            }));
            
            // Verify connection
            try (Connection conn = ds.getConnection()) {
                logger.info("✅ Database connection verified successfully");
            }
            
            return ds;
            
        } catch (Exception e) {
            logger.error("❌ Failed to create TestContainers PostgreSQL: {}", e.getMessage());
            throw new RuntimeException(
                "Failed to start PostgreSQL container. " +
                "Please ensure Docker Desktop is running and has sufficient resources. " +
                "Error: " + e.getMessage(), e
            );
        }
    }
    
    /**
     * Check if Docker is available and running
     */
    private boolean isDockerAvailable() {
        try {
            // Use TestContainers' built-in Docker detection
            DockerClientFactory.instance().client();
            
            // Additional verification - try to get Docker info
            var client = DockerClientFactory.instance().client();
            var info = client.infoCmd().exec();
            
            logger.debug("Docker detected - Version: {}, OS: {}", 
                info.getServerVersion(), info.getOperatingSystem());
            return true;
            
        } catch (Exception e) {
            logger.debug("Docker not available: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if running on Windows
     */
    private boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("windows");
    }
}