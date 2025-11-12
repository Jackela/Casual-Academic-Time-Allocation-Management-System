package com.usyd.catams.testing;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import java.time.Duration;

/**
 * Singleton TestContainer for PostgreSQL.
 * Ensures that only one instance of the container is started for the entire test suite.
 */
public class PostgresTestContainer extends PostgreSQLContainer<PostgresTestContainer> {

    private static final String IMAGE_VERSION = "postgres:15-alpine";
    private static final boolean RUNNING_IN_ACT = isActEnvironment();
    private static PostgresTestContainer container;

    static {
        if (RUNNING_IN_ACT) {
            // act executes inside Docker where Ryuk can't call back to the host; disable it to prevent context boot failures
            setIfUnset("testcontainers.ryuk.disabled", "true");
        }
    }

    private PostgresTestContainer() {
        super(IMAGE_VERSION);
        // Harden startup to reduce flakiness on Windows/Docker Desktop
        this.withStartupAttempts(1)
            .withStartupTimeout(Duration.ofSeconds(60))
            .waitingFor(Wait.forLogMessage(".*database system is ready to accept connections.*\\n", 1));
        // Allow reuse when enabled locally to speed up iterations
        try { this.withReuse(true); } catch (Throwable ignored) {}
    }

    public static PostgresTestContainer getInstance() {
        if (container == null) {
            container = new PostgresTestContainer();
        }
        return container;
    }

    private static void setIfUnset(String key, String value) {
        if (System.getProperty(key) == null && System.getenv(key.replace('.', '_').toUpperCase()) == null) {
            System.setProperty(key, value);
        }
    }

    private static boolean isActEnvironment() {
        return System.getenv("ACT") != null || System.getenv("ACT_TOOLSDIRECTORY") != null;
    }

    @Override
    public void start() {
        super.start();
        System.setProperty("DB_URL", container.getJdbcUrl());
        System.setProperty("DB_USERNAME", container.getUsername());
        System.setProperty("DB_PASSWORD", container.getPassword());
    }

    @Override
    public void stop() {
        // Do nothing. The container will be stopped by the JVM shutdown hook.
    }
}

