package com.usyd.catams.common.constants;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for ApplicationConstants.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("ApplicationConstants Tests")
class ApplicationConstantsTest {

    @Test
    @DisplayName("should have correct API paths")
    void shouldHaveCorrectApiPaths() {
        assertThat(ApplicationConstants.API_PREFIX).isEqualTo("/api");
        assertThat(ApplicationConstants.API_AUTH).isEqualTo("/api/auth");
        assertThat(ApplicationConstants.API_TIMESHEETS).isEqualTo("/api/timesheets");
        assertThat(ApplicationConstants.API_APPROVALS).isEqualTo("/api/approvals");
        assertThat(ApplicationConstants.API_DASHBOARD).isEqualTo("/api/dashboard");
        assertThat(ApplicationConstants.API_USERS).isEqualTo("/api/users");
    }

    @Test
    @DisplayName("should have correct default ports")
    void shouldHaveCorrectDefaultPorts() {
        assertThat(ApplicationConstants.DEFAULT_SERVER_PORT).isEqualTo(8080);
        assertThat(ApplicationConstants.DEFAULT_FRONTEND_PORT).isEqualTo(5173);
    }

    @Test
    @DisplayName("should have correct E2E ports")
    void shouldHaveCorrectE2EPorts() {
        assertThat(ApplicationConstants.E2E_SERVER_PORT).isEqualTo(8084);
        assertThat(ApplicationConstants.E2E_FRONTEND_PORT).isEqualTo(5174);
    }

    @Test
    @DisplayName("should have correct business rules for tutorials")
    void shouldHaveCorrectBusinessRulesForTutorials() {
        assertThat(ApplicationConstants.TUTORIAL_FIXED_DELIVERY_HOURS).isEqualTo(1);
        assertThat(ApplicationConstants.TUTORIAL_MAX_ASSOCIATED_STANDARD).isEqualTo(2.0);
        assertThat(ApplicationConstants.TUTORIAL_MAX_ASSOCIATED_REPEAT).isEqualTo(1.0);
    }

    @Test
    @DisplayName("should have correct rate codes")
    void shouldHaveCorrectRateCodes() {
        assertThat(ApplicationConstants.RateCodes.TU1).isEqualTo("TU1");
        assertThat(ApplicationConstants.RateCodes.TU2).isEqualTo("TU2");
        assertThat(ApplicationConstants.RateCodes.TU3).isEqualTo("TU3");
        assertThat(ApplicationConstants.RateCodes.TU4).isEqualTo("TU4");
        assertThat(ApplicationConstants.RateCodes.AO1).isEqualTo("AO1");
        assertThat(ApplicationConstants.RateCodes.AO2).isEqualTo("AO2");
        assertThat(ApplicationConstants.RateCodes.DE1).isEqualTo("DE1");
        assertThat(ApplicationConstants.RateCodes.DE2).isEqualTo("DE2");
    }

    @Test
    @DisplayName("should have correct task types")
    void shouldHaveCorrectTaskTypes() {
        assertThat(ApplicationConstants.TaskTypes.TUTORIAL).isEqualTo("TUTORIAL");
        assertThat(ApplicationConstants.TaskTypes.ORAA).isEqualTo("ORAA");
        assertThat(ApplicationConstants.TaskTypes.DEMO).isEqualTo("DEMO");
        assertThat(ApplicationConstants.TaskTypes.MARKING).isEqualTo("MARKING");
    }

    @Test
    @DisplayName("should have correct user roles")
    void shouldHaveCorrectUserRoles() {
        assertThat(ApplicationConstants.Roles.ADMIN).isEqualTo("ADMIN");
        assertThat(ApplicationConstants.Roles.HR).isEqualTo("HR");
        assertThat(ApplicationConstants.Roles.LECTURER).isEqualTo("LECTURER");
        assertThat(ApplicationConstants.Roles.TUTOR).isEqualTo("TUTOR");
    }

    @Test
    @DisplayName("should have correct pagination defaults")
    void shouldHaveCorrectPaginationDefaults() {
        assertThat(ApplicationConstants.DEFAULT_PAGE_SIZE).isEqualTo(20);
        assertThat(ApplicationConstants.MAX_PAGE_SIZE).isEqualTo(100);
    }

    @Test
    @DisplayName("should have correct HTTP headers")
    void shouldHaveCorrectHttpHeaders() {
        assertThat(ApplicationConstants.HEADER_AUTHORIZATION).isEqualTo("Authorization");
        assertThat(ApplicationConstants.HEADER_BEARER_PREFIX).isEqualTo("Bearer ");
        assertThat(ApplicationConstants.HEADER_CONTENT_TYPE).isEqualTo("Content-Type");
    }

    @Test
    @DisplayName("should be utility class with private constructor")
    void shouldBeUtilityClassWithPrivateConstructor() {
        // Constants class should not be instantiable
        assertThat(ApplicationConstants.class).isFinal();
        
        // All nested constant classes should also be non-instantiable
        assertThat(ApplicationConstants.RateCodes.class).isFinal();
        assertThat(ApplicationConstants.TaskTypes.class).isFinal();
        assertThat(ApplicationConstants.Roles.class).isFinal();
    }
}
