package com.usyd.catams.config;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Embedded PostgreSQL configuration for local E2E profile.
 * DbC: This configuration is only active under profile "e2e-local" and avoids Docker/H2,
 * keeping parity with production PostgreSQL engine semantics.
 */
@Configuration
@Profile("e2e-local")
public class EmbeddedPostgresConfig {

    /**
     * Provide a DataSource backed by an embedded PostgreSQL instance.
     * DbC: Caller is responsible for JPA DDL auto settings; this bean uses a transient database.
     */
    @Bean(destroyMethod = "close")
    public DataSource dataSource() throws Exception {
        EmbeddedPostgres pg = EmbeddedPostgres.start();

        // Ensure target database exists
        createDatabaseIfMissing(pg, "catams_e2e");

        String jdbcUrl = pg.getJdbcUrl("postgres", "catams_e2e");
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        ds.setUsername("postgres");
        ds.setPassword("postgres");
        ds.setMaximumPoolSize(10);
        ds.setAutoCommit(true);
        return ds;
    }

    private void createDatabaseIfMissing(EmbeddedPostgres pg, String dbName) throws SQLException {
        try (Connection c = pg.getPostgresDatabase().getConnection();
             Statement st = c.createStatement()) {
            st.execute("CREATE DATABASE " + dbName);
        } catch (SQLException e) {
            // If already exists, ignore; else rethrow
            if (e.getMessage() == null || !e.getMessage().toLowerCase().contains("already exists")) {
                throw e;
            }
        }
    }
}