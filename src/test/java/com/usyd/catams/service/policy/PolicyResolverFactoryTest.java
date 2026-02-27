package com.usyd.catams.service.policy;

import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1PolicyProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tests for PolicyResolverFactory.
 * 
 * @author Development Team
 * @since 1.0
 */
@DisplayName("PolicyResolverFactory Tests")
class PolicyResolverFactoryTest {

    private PolicyResolverFactory factory;
    private PolicyResolver primaryResolver;
    private PolicyResolver fallbackResolver;

    @BeforeEach
    void setUp() {
        primaryResolver = mock(PolicyResolver.class);
        fallbackResolver = mock(PolicyResolver.class);
        
        when(primaryResolver.canResolve(any())).thenReturn(true);
        when(fallbackResolver.canResolve(any())).thenReturn(true);
    }

    @Test
    @DisplayName("should create factory with ordered resolvers")
    void shouldCreateFactoryWithOrderedResolvers() {
        // Given
        List<PolicyResolver> resolvers = Arrays.asList(primaryResolver, fallbackResolver);

        // When
        factory = new PolicyResolverFactory(resolvers);

        // Then
        assertThat(factory).isNotNull();
    }

    @Test
    @DisplayName("should use first resolver that can resolve")
    void shouldUseFirstResolverThatCanResolve() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        when(primaryResolver.canResolve(any())).thenReturn(true);
        Schedule1PolicyProvider.RatePolicy expectedPolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
        when(primaryResolver.resolve(any())).thenReturn(expectedPolicy);
        
        factory = new PolicyResolverFactory(Arrays.asList(primaryResolver, fallbackResolver));
        PolicyRequest request = createRequest();

        // When
        Schedule1PolicyProvider.RatePolicy result = factory.resolve(request);

        // Then
        assertThat(result).isEqualTo(expectedPolicy);
        verify(primaryResolver).resolve(request);
        verify(fallbackResolver, never()).resolve(any());
    }

    @Test
    @DisplayName("should fallback to next resolver when primary cannot resolve")
    void shouldFallbackToNextResolver() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        when(primaryResolver.canResolve(any())).thenReturn(false);
        Schedule1PolicyProvider.RatePolicy expectedPolicy = mock(Schedule1PolicyProvider.RatePolicy.class);
        when(fallbackResolver.resolve(any())).thenReturn(expectedPolicy);
        
        factory = new PolicyResolverFactory(Arrays.asList(primaryResolver, fallbackResolver));
        PolicyRequest request = createRequest();

        // When
        Schedule1PolicyProvider.RatePolicy result = factory.resolve(request);

        // Then
        assertThat(result).isEqualTo(expectedPolicy);
        verify(primaryResolver, never()).resolve(any());
        verify(fallbackResolver).resolve(request);
    }

    @Test
    @DisplayName("should throw exception when no resolver can resolve")
    void shouldThrowExceptionWhenNoResolverCanResolve() {
        // Given
        when(primaryResolver.canResolve(any())).thenReturn(false);
        when(fallbackResolver.canResolve(any())).thenReturn(false);
        
        factory = new PolicyResolverFactory(Arrays.asList(primaryResolver, fallbackResolver));
        PolicyRequest request = createRequest();

        // Then
        assertThatThrownBy(() -> factory.resolve(request))
            .isInstanceOf(Schedule1PolicyProvider.RatePolicyNotFoundException.class);
    }

    @Test
    @DisplayName("should handle empty resolver list")
    void shouldHandleEmptyResolverList() {
        // Given
        factory = new PolicyResolverFactory(Collections.emptyList());
        PolicyRequest request = createRequest();

        // Then
        assertThatThrownBy(() -> factory.resolve(request))
            .isInstanceOf(Schedule1PolicyProvider.RatePolicyNotFoundException.class);
    }

    @Test
    @DisplayName("should propagate exception from resolver")
    void shouldPropagateExceptionFromResolver() throws Schedule1PolicyProvider.RatePolicyNotFoundException {
        // Given
        when(primaryResolver.canResolve(any())).thenReturn(true);
        when(primaryResolver.resolve(any()))
            .thenThrow(new Schedule1PolicyProvider.RatePolicyNotFoundException("Policy not found"));
        
        factory = new PolicyResolverFactory(Arrays.asList(primaryResolver));
        PolicyRequest request = createRequest();

        // Then
        assertThatThrownBy(() -> factory.resolve(request))
            .isInstanceOf(Schedule1PolicyProvider.RatePolicyNotFoundException.class)
            .hasMessageContaining("Policy not found");
    }

    private PolicyRequest createRequest() {
        return new PolicyRequest("TU1", TutorQualification.STANDARD, LocalDate.of(2024, 7, 8));
    }
}
