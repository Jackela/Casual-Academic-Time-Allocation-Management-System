package com.usyd.catams.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.List;
import java.util.Locale;

/**
 * Provides deterministic database reset behaviour for automated E2E suites.
 *
 * This service truncates timesheet-related tables and optionally resets
 * identity sequences so each test run starts from a known baseline.
 */
@Service
@Profile({"test", "e2e", "e2e-local"})
public class TestDataResetService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TestDataResetService.class);
    private static final List<String> TARGET_TABLES = List.of("approvals", "timesheets");

    private final JdbcTemplate jdbcTemplate;

    public TestDataResetService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Clears domain tables and attempts to reset identity sequences so test
     * data does not bleed across E2E executions.
     */
    @Transactional
    public void resetDatabase() {
        // Delete child records first to satisfy FK constraints.
        TARGET_TABLES.forEach(table -> jdbcTemplate.execute("DELETE FROM " + table));

        resetIdentities();
    }

    private void resetIdentities() {
        String productName = jdbcTemplate.execute((ConnectionCallback<String>) connection -> {
            try {
                return connection.getMetaData().getDatabaseProductName();
            } catch (SQLException exception) {
                LOGGER.warn("Failed to detect database product name: {}", exception.getMessage());
                return null;
            }
        });

        if (productName == null) {
            return;
        }

        String dialect = productName.toLowerCase(Locale.ROOT);

        for (String table : TARGET_TABLES) {
            try {
                if (dialect.contains("postgres")) {
                    jdbcTemplate.execute("ALTER SEQUENCE " + table + "_id_seq RESTART WITH 1");
                } else if (dialect.contains("h2")) {
                    jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN id RESTART WITH 1");
                }
            } catch (Exception ex) {
                LOGGER.warn("Unable to reset identity for table {} on {}: {}", table, productName, ex.getMessage());
            }
        }
    }
}
