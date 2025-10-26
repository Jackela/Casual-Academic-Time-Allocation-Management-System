package com.usyd.catams.controller;

import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardControllerClockTest {

    @Mock
    DashboardService dashboardService;

    @Mock
    Authentication authentication;

    @Test
    @DisplayName("Default semester uses injected Clock to derive dates")
    void defaultSemesterUsesInjectedClock() {
        // Fixed date in August 2025 (Semester 2)
        Clock fixed = Clock.fixed(Instant.parse("2025-08-15T00:00:00Z"), ZoneOffset.UTC);
        DashboardController controller = new DashboardController(dashboardService, fixed);

        // Stub auth: principal user with id, role LECTURER
        com.usyd.catams.entity.User user = new com.usyd.catams.entity.User();
        user.setId(2L);
        user.setEmail("lecturer@university.edu.au");
        user.setRole(UserRole.LECTURER);
        user.setIsActive(true);
        when(authentication.getPrincipal()).thenReturn(user);
        java.util.Collection<GrantedAuthority> authorities = java.util.List.of(new SimpleGrantedAuthority("ROLE_LECTURER"));
        doReturn(authorities).when(authentication).getAuthorities();

        DashboardSummaryResponse mockResp = new DashboardSummaryResponse(0,0, BigDecimal.ZERO, BigDecimal.ZERO, null, Collections.emptyList(), Collections.emptyList(), null);
        when(dashboardService.getDashboardSummary(anyLong(), any(), any(), any(), any())).thenReturn(mockResp);

        ResponseEntity<DashboardSummaryResponse> resp = controller.getDashboardSummary(null, null, null, null, authentication);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();

        ArgumentCaptor<LocalDate> startCap = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> endCap = ArgumentCaptor.forClass(LocalDate.class);
        verify(dashboardService).getDashboardSummary(eq(2L), eq(UserRole.LECTURER), any(), startCap.capture(), endCap.capture());

        assertThat(startCap.getValue()).isEqualTo(LocalDate.of(2025, 7, 1));
        assertThat(endCap.getValue()).isEqualTo(LocalDate.of(2025, 11, 30));
    }
}
