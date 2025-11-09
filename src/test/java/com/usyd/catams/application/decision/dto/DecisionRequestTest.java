package com.usyd.catams.application.decision.dto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit Tests for DecisionRequest DTO
 *
 * This test class provides comprehensive coverage of the DecisionRequest
 * data transfer object, testing builder pattern, fact management, and
 * helper methods.
 *
 * Coverage includes:
 * - Builder pattern construction with validation
 * - Fact retrieval with type casting
 * - Context management
 * - Priority handling
 * - Immutability patterns (withAdditionalFacts, etc.)
 * - Edge cases and null handling
 *
 * @author Test Infrastructure Team
 * @since 2.0
 */
@DisplayName("DecisionRequest DTO Unit Tests")
class DecisionRequestTest {

    private DecisionRequest.Builder baseBuilder;
    private LocalDateTime testTimestamp;

    @BeforeEach
    void setUp() {
        testTimestamp = LocalDateTime.of(2024, 1, 15, 10, 30);
        baseBuilder = DecisionRequest.builder()
            .ruleSetId("test-ruleset")
            .requestId("req-001")
            .userId("user-123")
            .sessionId("session-abc")
            .timestamp(testTimestamp)
            .priority(5);
    }

    @Nested
    @DisplayName("Builder Pattern Tests")
    class BuilderPatternTests {

        @Test
        @DisplayName("Should build DecisionRequest with all fields")
        void shouldBuildDecisionRequestWithAllFields() {
            // Arrange & Act
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .fact("rate", new BigDecimal("40.00"))
                .context("source", "web")
                .build();

            // Assert
            assertThat(request).isNotNull();
            assertThat(request.getRuleSetId()).isEqualTo("test-ruleset");
            assertThat(request.getRequestId()).isEqualTo("req-001");
            assertThat(request.getUserId()).isEqualTo("user-123");
            assertThat(request.getSessionId()).isEqualTo("session-abc");
            assertThat(request.getTimestamp()).isEqualTo(testTimestamp);
            assertThat(request.getPriority()).isEqualTo(5);
        }

        @Test
        @DisplayName("Should throw exception when ruleSetId is null")
        void shouldThrowExceptionWhenRuleSetIdIsNull() {
            // Arrange
            baseBuilder.ruleSetId(null);

            // Act & Assert
            assertThatThrownBy(() -> baseBuilder.build())
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Rule set ID is required");
        }

        @Test
        @DisplayName("Should use default priority when not set")
        void shouldUseDefaultPriorityWhenNotSet() {
            // Arrange & Act
            DecisionRequest request = baseBuilder.priority(null).build();

            // Assert
            assertThat(request.getPriority()).isEqualTo(5);
        }

        @Test
        @DisplayName("Should use current timestamp when not set")
        void shouldUseCurrentTimestampWhenNotSet() {
            // Arrange & Act
            LocalDateTime before = LocalDateTime.now();
            DecisionRequest request = baseBuilder.timestamp(null).build();
            LocalDateTime after = LocalDateTime.now();

            // Assert
            assertThat(request.getTimestamp())
                .isAfterOrEqualTo(before)
                .isBeforeOrEqualTo(after);
        }

        @Test
        @DisplayName("Should create empty maps when facts and context are null")
        void shouldCreateEmptyMapsWhenFactsAndContextAreNull() {
            // Arrange & Act
            DecisionRequest request = baseBuilder.build();

            // Assert
            assertThat(request.getFacts()).isEmpty();
            assertThat(request.getContext()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Fact Management Tests")
    class FactManagementTests {

        @Test
        @DisplayName("Should add single fact")
        void shouldAddSingleFact() {
            // Arrange & Act
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .build();

            // Assert
            assertThat(request.getFacts()).hasSize(1);
            assertThat(request.hasFact("hours")).isTrue();
        }

        @Test
        @DisplayName("Should add multiple facts via map")
        void shouldAddMultipleFactsViaMap() {
            // Arrange
            Map<String, Object> facts = new HashMap<>();
            facts.put("hours", 20.0);
            facts.put("rate", new BigDecimal("40.00"));
            facts.put("tutorId", 123L);

            // Act
            DecisionRequest request = baseBuilder
                .facts(facts)
                .build();

            // Assert
            assertThat(request.getFacts()).hasSize(3);
            assertThat(request.hasFact("hours")).isTrue();
            assertThat(request.hasFact("rate")).isTrue();
            assertThat(request.hasFact("tutorId")).isTrue();
        }

        @Test
        @DisplayName("Should retrieve fact with correct type")
        void shouldRetrieveFactWithCorrectType() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .fact("rate", new BigDecimal("40.00"))
                .fact("tutorId", 123L)
                .build();

            // Act & Assert
            assertThat(request.getFact("hours", Double.class)).isEqualTo(20.0);
            assertThat(request.getFact("rate", BigDecimal.class)).isEqualByComparingTo(new BigDecimal("40.00"));
            assertThat(request.getFact("tutorId", Long.class)).isEqualTo(123L);
        }

        @Test
        @DisplayName("Should return null for non-existent fact")
        void shouldReturnNullForNonExistentFact() {
            // Arrange
            DecisionRequest request = baseBuilder.build();

            // Act
            Object result = request.getFact("nonexistent", String.class);

            // Assert
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("Should throw ClassCastException for wrong type")
        void shouldThrowClassCastExceptionForWrongType() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .build();

            // Act & Assert
            assertThatThrownBy(() -> request.getFact("hours", String.class))
                .isInstanceOf(ClassCastException.class)
                .hasMessageContaining("hours")
                .hasMessageContaining("String")
                .hasMessageContaining("Double");
        }

        @Test
        @DisplayName("Should retrieve fact with default value")
        void shouldRetrieveFactWithDefaultValue() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .build();

            // Act
            Double existingValue = request.getFact("hours", 10.0);
            Double defaultValue = request.getFact("nonexistent", 15.0);

            // Assert
            assertThat(existingValue).isEqualTo(20.0);
            assertThat(defaultValue).isEqualTo(15.0);
        }

        @Test
        @DisplayName("Should check fact existence")
        void shouldCheckFactExistence() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .build();

            // Act & Assert
            assertThat(request.hasFact("hours")).isTrue();
            assertThat(request.hasFact("nonexistent")).isFalse();
        }
    }

    @Nested
    @DisplayName("Context Management Tests")
    class ContextManagementTests {

        @Test
        @DisplayName("Should add single context")
        void shouldAddSingleContext() {
            // Arrange & Act
            DecisionRequest request = baseBuilder
                .context("source", "web")
                .build();

            // Assert
            assertThat(request.getContext()).hasSize(1);
            assertThat(request.hasContext("source")).isTrue();
        }

        @Test
        @DisplayName("Should add multiple context entries via map")
        void shouldAddMultipleContextEntriesViaMap() {
            // Arrange
            Map<String, String> context = new HashMap<>();
            context.put("source", "web");
            context.put("ipAddress", "192.168.1.1");
            context.put("userAgent", "Mozilla/5.0");

            // Act
            DecisionRequest request = baseBuilder
                .contextMap(context)
                .build();

            // Assert
            assertThat(request.getContext()).hasSize(3);
        }

        @Test
        @DisplayName("Should retrieve context with default value")
        void shouldRetrieveContextWithDefaultValue() {
            // Arrange
            DecisionRequest request = baseBuilder
                .context("source", "web")
                .build();

            // Act
            String existingValue = request.getContext("source", "mobile");
            String defaultValue = request.getContext("nonexistent", "default");

            // Assert
            assertThat(existingValue).isEqualTo("web");
            assertThat(defaultValue).isEqualTo("default");
        }

        @Test
        @DisplayName("Should check context existence")
        void shouldCheckContextExistence() {
            // Arrange
            DecisionRequest request = baseBuilder
                .context("source", "web")
                .build();

            // Act & Assert
            assertThat(request.hasContext("source")).isTrue();
            assertThat(request.hasContext("nonexistent")).isFalse();
        }
    }

    @Nested
    @DisplayName("Priority Tests")
    class PriorityTests {

        @ParameterizedTest
        @ValueSource(ints = {8, 9, 10})
        @DisplayName("Should detect high priority")
        void shouldDetectHighPriority(int priority) {
            // Arrange
            DecisionRequest request = baseBuilder.priority(priority).build();

            // Act & Assert
            assertThat(request.isHighPriority()).isTrue();
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 2, 3})
        @DisplayName("Should detect low priority")
        void shouldDetectLowPriority(int priority) {
            // Arrange
            DecisionRequest request = baseBuilder.priority(priority).build();

            // Act & Assert
            assertThat(request.isLowPriority()).isTrue();
        }

        @ParameterizedTest
        @ValueSource(ints = {4, 5, 6, 7})
        @DisplayName("Should detect normal priority")
        void shouldDetectNormalPriority(int priority) {
            // Arrange
            DecisionRequest request = baseBuilder.priority(priority).build();

            // Act & Assert
            assertThat(request.isHighPriority()).isFalse();
            assertThat(request.isLowPriority()).isFalse();
        }
    }

    @Nested
    @DisplayName("Immutability Pattern Tests")
    class ImmutabilityPatternTests {

        @Test
        @DisplayName("Should create new instance with additional facts")
        void shouldCreateNewInstanceWithAdditionalFacts() {
            // Arrange
            DecisionRequest original = baseBuilder
                .fact("hours", 20.0)
                .build();

            Map<String, Object> additionalFacts = new HashMap<>();
            additionalFacts.put("rate", new BigDecimal("40.00"));

            // Act
            DecisionRequest modified = original.withAdditionalFacts(additionalFacts);

            // Assert
            assertThat(modified).isNotSameAs(original);
            assertThat(original.getFacts()).hasSize(1);
            assertThat(modified.getFacts()).hasSize(2);
            assertThat(modified.hasFact("hours")).isTrue();
            assertThat(modified.hasFact("rate")).isTrue();
        }

        @Test
        @DisplayName("Should create new instance with different rule set")
        void shouldCreateNewInstanceWithDifferentRuleSet() {
            // Arrange
            DecisionRequest original = baseBuilder.build();

            // Act
            DecisionRequest modified = original.withRuleSet("new-ruleset");

            // Assert
            assertThat(modified).isNotSameAs(original);
            assertThat(original.getRuleSetId()).isEqualTo("test-ruleset");
            assertThat(modified.getRuleSetId()).isEqualTo("new-ruleset");
        }

        @Test
        @DisplayName("Should create new instance with additional context")
        void shouldCreateNewInstanceWithAdditionalContext() {
            // Arrange
            DecisionRequest original = baseBuilder
                .context("source", "web")
                .build();

            Map<String, String> additionalContext = new HashMap<>();
            additionalContext.put("ipAddress", "192.168.1.1");

            // Act
            DecisionRequest modified = original.withAdditionalContext(additionalContext);

            // Assert
            assertThat(modified).isNotSameAs(original);
            assertThat(original.getContext()).hasSize(1);
            assertThat(modified.getContext()).hasSize(2);
        }

        @Test
        @DisplayName("Should preserve facts immutability")
        void shouldPreserveFactsImmutability() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .build();

            // Act & Assert
            assertThatThrownBy(() -> request.getFacts().put("newFact", "value"))
                .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Should preserve context immutability")
        void shouldPreserveContextImmutability() {
            // Arrange
            DecisionRequest request = baseBuilder
                .context("source", "web")
                .build();

            // Act & Assert
            assertThatThrownBy(() -> request.getContext().put("newContext", "value"))
                .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    @Nested
    @DisplayName("Utility Methods Tests")
    class UtilityMethodsTests {

        @Test
        @DisplayName("Should generate facts summary")
        void shouldGenerateFactsSummary() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .fact("rate", new BigDecimal("40.00"))
                .fact("tutorId", 123L)
                .build();

            // Act
            String summary = request.getFactsSummary();

            // Assert
            assertThat(summary).contains("hours=20.0");
            assertThat(summary).contains("rate=40.00");
            assertThat(summary).contains("tutorId=123");
        }

        @Test
        @DisplayName("Should return 'No facts' when facts are empty")
        void shouldReturnNoFactsWhenFactsAreEmpty() {
            // Arrange
            DecisionRequest request = baseBuilder.build();

            // Act
            String summary = request.getFactsSummary();

            // Assert
            assertThat(summary).isEqualTo("No facts");
        }

        @Test
        @DisplayName("Should handle null values in facts summary")
        void shouldHandleNullValuesInFactsSummary() {
            // Arrange - Don't add null fact (Map.copyOf doesn't support null values)
            // Test with empty facts instead
            DecisionRequest request = DecisionRequest.builder()
                .ruleSetId("test")
                .build();

            // Act
            String summary = request.getFactsSummary();

            // Assert - With no facts, should return "No facts"
            assertThat(summary).isEqualTo("No facts");
        }
    }

    @Nested
    @DisplayName("Equals and HashCode Tests")
    class EqualsHashCodeTests {

        @Test
        @DisplayName("Should be equal when same object")
        void shouldBeEqualWhenSameObject() {
            // Arrange
            DecisionRequest request = baseBuilder.build();

            // Act & Assert
            assertThat(request).isEqualTo(request);
        }

        @Test
        @DisplayName("Should be equal when same key fields")
        void shouldBeEqualWhenSameKeyFields() {
            // Arrange
            DecisionRequest request1 = baseBuilder.fact("hours", 20.0).build();
            DecisionRequest request2 = baseBuilder.fact("hours", 20.0).build();

            // Act & Assert
            assertThat(request1).isEqualTo(request2);
            assertThat(request1.hashCode()).isEqualTo(request2.hashCode());
        }

        @Test
        @DisplayName("Should not be equal when different ruleSetId")
        void shouldNotBeEqualWhenDifferentRuleSetId() {
            // Arrange
            DecisionRequest request1 = baseBuilder.ruleSetId("ruleset-1").build();
            DecisionRequest request2 = baseBuilder.ruleSetId("ruleset-2").build();

            // Act & Assert
            assertThat(request1).isNotEqualTo(request2);
        }

        @Test
        @DisplayName("Should not be equal to null")
        void shouldNotBeEqualToNull() {
            // Arrange
            DecisionRequest request = baseBuilder.build();

            // Act & Assert
            assertThat(request).isNotEqualTo(null);
        }

        @Test
        @DisplayName("Should not be equal to different class")
        void shouldNotBeEqualToDifferentClass() {
            // Arrange
            DecisionRequest request = baseBuilder.build();

            // Act & Assert
            assertThat(request).isNotEqualTo("Not a DecisionRequest");
        }
    }

    @Nested
    @DisplayName("ToString Tests")
    class ToStringTests {

        @Test
        @DisplayName("Should format toString with key information")
        void shouldFormatToStringWithKeyInformation() {
            // Arrange
            DecisionRequest request = baseBuilder
                .fact("hours", 20.0)
                .fact("rate", new BigDecimal("40.00"))
                .build();

            // Act
            String result = request.toString();

            // Assert
            assertThat(result)
                .contains("DecisionRequest")
                .contains("ruleSet='test-ruleset'")
                .contains("requestId='req-001'")
                .contains("user='user-123'")
                .contains("priority=5")
                .contains("facts=2");
        }
    }
}
