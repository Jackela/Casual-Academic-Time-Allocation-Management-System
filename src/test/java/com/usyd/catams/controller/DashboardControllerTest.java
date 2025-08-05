package com.usyd.catams.controller;

import com.usyd.catams.dto.response.DashboardSummaryResponse;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DashboardController
 * 
 * Tests controller logic in isolation, focusing on:
 * - User ID extraction from Authentication
 * - Role extraction from Authentication  
 * - Date range building logic
 * - Request parameter validation
 */
@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;
    
    @Mock
    private Authentication authentication;
    
    @InjectMocks
    private DashboardController dashboardController;
    
    private User mockUser;
    private DashboardSummaryResponse mockResponse;
    
    @BeforeEach
    void setUp() {
        // Create mock user
        mockUser = new User();
        mockUser.setId(2L);
        mockUser.setEmail("lecturer@university.edu.au");
        mockUser.setRole(UserRole.LECTURER);
        mockUser.setIsActive(true);
        
        // Create mock response
        mockResponse = new DashboardSummaryResponse(
            2, 1, new BigDecimal("18.5"), new BigDecimal("832.50"), 
            null, Collections.emptyList(), Collections.emptyList(), null
        );
    }
    
    @Test
    @DisplayName("Should extract user ID from User principal in Authentication")
    void shouldExtractUserIdFromUserPrincipal() {
        // Given
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(eq(2L), eq(UserRole.LECTURER), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        ResponseEntity<DashboardSummaryResponse> response = dashboardController.getDashboardSummary(
            null, null, null, null, authentication
        );
        
        // Then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(dashboardService).getDashboardSummary(
            eq(2L), // Should extract correct user ID
            eq(UserRole.LECTURER),
            any(), any(), any()
        );
    }
    
    @Test
    @DisplayName("Should fall back to parsing username when principal is not User")
    void shouldFallbackToParsingUsernameForNonUserPrincipal() {
        // Given - Authentication with string principal (user ID as username)
        when(authentication.getPrincipal()).thenReturn("2");
        when(authentication.getName()).thenReturn("2");
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(eq(2L), eq(UserRole.LECTURER), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        ResponseEntity<DashboardSummaryResponse> response = dashboardController.getDashboardSummary(
            null, null, null, null, authentication
        );
        
        // Then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(dashboardService).getDashboardSummary(
            eq(2L), // Should parse username as user ID
            eq(UserRole.LECTURER),
            any(), any(), any()
        );
    }
    
    @Test
    @DisplayName("Should use fallback user ID when username is not numeric")
    void shouldUseFallbackWhenUsernameNotNumeric() {
        // Given - Authentication with email as username (non-numeric)
        when(authentication.getPrincipal()).thenReturn("not-a-user-object");
        when(authentication.getName()).thenReturn("lecturer@university.edu.au");
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(eq(1L), eq(UserRole.LECTURER), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        ResponseEntity<DashboardSummaryResponse> response = dashboardController.getDashboardSummary(
            null, null, null, null, authentication
        );
        
        // Then
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        verify(dashboardService).getDashboardSummary(
            eq(1L), // Should use fallback ID
            eq(UserRole.LECTURER),
            any(), any(), any()
        );
    }
    
    @Test
    @DisplayName("Should extract TUTOR role correctly from Authentication")
    void shouldExtractTutorRole() {
        // Given
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_TUTOR")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(any(), eq(UserRole.TUTOR), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        dashboardController.getDashboardSummary(null, null, null, null, authentication);
        
        // Then
        verify(dashboardService).getDashboardSummary(
            any(), 
            eq(UserRole.TUTOR), // Should extract TUTOR role
            any(), any(), any()
        );
    }
    
    @Test
    @DisplayName("Should extract ADMIN role correctly from Authentication")
    void shouldExtractAdminRole() {
        // Given
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(any(), eq(UserRole.ADMIN), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        dashboardController.getDashboardSummary(null, null, null, null, authentication);
        
        // Then
        verify(dashboardService).getDashboardSummary(
            any(), 
            eq(UserRole.ADMIN), // Should extract ADMIN role
            any(), any(), any()
        );
    }
    
    @Test
    @DisplayName("Should build current semester date range by default")
    void shouldBuildCurrentSemesterDateRangeByDefault() {
        // Given
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(any(), any(), any(), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        dashboardController.getDashboardSummary(null, null, null, null, authentication);
        
        // Then - Should call service with current semester dates (August 2025 = Semester 2)
        verify(dashboardService).getDashboardSummary(
            any(), any(), any(),
            eq(LocalDate.of(2025, 7, 1)),  // Semester 2 start
            eq(LocalDate.of(2025, 11, 30)) // Semester 2 end
        );
    }
    
    @Test
    @DisplayName("Should use custom date range when provided")
    void shouldUseCustomDateRangeWhenProvided() {
        // Given
        LocalDate startDate = LocalDate.of(2025, 8, 1);
        LocalDate endDate = LocalDate.of(2025, 8, 31);
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(any(), any(), any(), eq(startDate), eq(endDate)))
            .thenReturn(mockResponse);
        
        // When
        dashboardController.getDashboardSummary(null, null, startDate, endDate, authentication);
        
        // Then
        verify(dashboardService).getDashboardSummary(
            any(), any(), any(),
            eq(startDate),  // Should use provided start date
            eq(endDate)     // Should use provided end date
        );
    }
    
    @Test
    @DisplayName("Should pass courseId filter to service when provided")
    void shouldPassCourseIdFilterWhenProvided() {
        // Given
        Long courseId = 1L;
        when(authentication.getPrincipal()).thenReturn(mockUser);
        doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_LECTURER")))
            .when(authentication).getAuthorities();
        when(dashboardService.getDashboardSummary(any(), any(), eq(Optional.of(courseId)), any(), any()))
            .thenReturn(mockResponse);
        
        // When
        dashboardController.getDashboardSummary(courseId, null, null, null, authentication);
        
        // Then
        verify(dashboardService).getDashboardSummary(
            any(), any(),
            eq(Optional.of(courseId)), // Should pass courseId as Optional
            any(), any()
        );
    }
}
