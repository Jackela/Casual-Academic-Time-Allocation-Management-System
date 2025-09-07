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
     * Primary DataSource using TestContainers when Docker is available,
     * otherwise fall back to Embedded Postgres (Zonky) so local demo can run without Docker.
     */
    @Bean(destroyMethod = "close")
    public DataSource dataSource() throws Exception {
        logger.info("🔧 Configuring E2E database for local environment...");

        if (isDockerAvailable()) {
            logger.info("✅ Docker detected, using TestContainers PostgreSQL...");
            return createTestContainerDataSource();
        }

        logger.warn("⚠️  Docker not available - falling back to Embedded Postgres (Zonky)");
        return createEmbeddedDataSource();
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
     * Create Embedded Postgres-based DataSource (Zonky)
     */
    private DataSource createEmbeddedDataSource() {
        try {
            EmbeddedPostgres embedded = EmbeddedPostgres.start();
            int port = embedded.getPort();
            logger.info("🐘 Embedded PostgreSQL started on port: {}", port);

            HikariDataSource ds = new HikariDataSource();
            ds.setJdbcUrl("jdbc:postgresql://localhost:" + port + "/postgres");
            ds.setUsername("postgres");
            ds.setPassword("");
            ds.setMaximumPoolSize(10);
            ds.setMinimumIdle(1);
            ds.setAutoCommit(true);

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try { ds.close(); } catch (Exception ignored) {}
                try {
                    logger.info("🧹 Stopping embedded PostgreSQL...");
                    embedded.close();
                } catch (Exception e) {
                    logger.warn("⚠️  Error stopping embedded PostgreSQL: {}", e.getMessage());
                }
            }));

            try (Connection conn = ds.getConnection()) {
                logger.info("✅ Embedded database connection verified successfully");
            }

            return ds;
        } catch (Exception e) {
            logger.error("❌ Failed to start Embedded PostgreSQL: {}", e.getMessage());
            throw new RuntimeException("Failed to start Embedded PostgreSQL: " + e.getMessage(), e);
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