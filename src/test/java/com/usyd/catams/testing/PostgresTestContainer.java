package com.usyd.catams.testing;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import java.time.Duration;

/**
 * Singleton TestContainer for PostgreSQL.
 * Ensures that only one instance of the container is started for the entire test suite.
 */
public class PostgresTestContainer extends PostgreSQLContainer<PostgresTestContainer> {

    private static final String IMAGE_VERSION = "postgres:15";
    private static PostgresTestContainer container;

    private PostgresTestContainer() {
        super(IMAGE_VERSION);
        // Harden startup to reduce flakiness on Windows/Docker Desktop
        this.withStartupAttempts(3)
            .withStartupTimeout(Duration.ofMinutes(3))
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

