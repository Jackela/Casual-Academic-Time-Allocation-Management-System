package com.usyd.catams.domain.rules;

import com.usyd.catams.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RuleEngine}.
 * Verifies that the engine correctly executes and composes business rules.
 */
@ExtendWith(MockitoExtension.class)
class RuleEngineTest {

    private RuleEngine ruleEngine;

    @Mock
    private Specification<Object> mockRule1;
    @Mock
    private Specification<Object> mockRule2;

    @BeforeEach
    void setUp() {
        ruleEngine = new RuleEngine();
        // Configure mocks to use real default methods for composition
        lenient().when(mockRule1.and(any())).thenCallRealMethod();
        lenient().when(mockRule1.or(any())).thenCallRealMethod();
        lenient().when(mockRule1.not()).thenCallRealMethod();
        lenient().when(mockRule2.and(any())).thenCallRealMethod();
        lenient().when(mockRule2.or(any())).thenCallRealMethod();
        lenient().when(mockRule2.not()).thenCallRealMethod();
    }

    /**
     * Tests that the engine executes a single rule.
     */
    @Test
    void execute_singleRule_shouldCallIsSatisfiedBy() {
        Object context = new Object();
        ruleEngine.execute(context, List.of(mockRule1));
        verify(mockRule1, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests that the engine executes multiple rules in sequence.
     */
    @Test
    void execute_multipleRules_shouldCallAllIsSatisfiedBy() {
        Object context = new Object();
        ruleEngine.execute(context, List.of(mockRule1, mockRule2));
        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests that the engine stops execution on the first failing rule (fail-fast).
     */
    @Test
    void execute_failingRule_shouldStopExecution() throws BusinessException {
        Object context = new Object();
        doThrow(new BusinessException("TEST_ERROR", "Rule 1 failed")).when(mockRule1).isSatisfiedBy(context);

        assertThatThrownBy(() -> ruleEngine.execute(context, List.of(mockRule1, mockRule2)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Rule 1 failed");

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, never()).isSatisfiedBy(context);
    }

    /**
     * Tests the logical AND composition of rules.
     */
    @Test
    void and_composition_shouldExecuteBothRules() {
        Object context = new Object();
        Specification<Object> combinedRule = mockRule1.and(mockRule2);
        ruleEngine.execute(context, List.of(combinedRule));

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests the logical AND composition with a failing first rule.
     */
    @Test
    void and_composition_failingFirstRule_shouldStopExecution() throws BusinessException {
        Object context = new Object();
        doThrow(new BusinessException("TEST_ERROR", "Rule 1 failed")).when(mockRule1).isSatisfiedBy(context);
        Specification<Object> combinedRule = mockRule1.and(mockRule2);

        assertThatThrownBy(() -> ruleEngine.execute(context, List.of(combinedRule)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Rule 1 failed");

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, never()).isSatisfiedBy(context);
    }

    /**
     * Tests the logical OR composition of rules (first rule passes).
     */
    @Test
    void or_composition_firstRulePasses_shouldNotExecuteSecondRule() {
        Object context = new Object();
        Specification<Object> combinedRule = mockRule1.or(mockRule2);
        ruleEngine.execute(context, List.of(combinedRule));

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, never()).isSatisfiedBy(context);
    }

    /**
     * Tests the logical OR composition of rules (first rule fails, second passes).
     */
    @Test
    void or_composition_firstRuleFailsSecondPasses_shouldExecuteSecondRule() throws BusinessException {
        Object context = new Object();
        doThrow(new BusinessException("TEST_ERROR", "Rule 1 failed")).when(mockRule1).isSatisfiedBy(context);
        Specification<Object> combinedRule = mockRule1.or(mockRule2);
        ruleEngine.execute(context, List.of(combinedRule));

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests the logical OR composition of rules (both rules fail).
     */
    @Test
    void or_composition_bothRulesFail_shouldThrowException() throws BusinessException {
        Object context = new Object();
        doThrow(new BusinessException("TEST_ERROR", "Rule 1 failed")).when(mockRule1).isSatisfiedBy(context);
        doThrow(new BusinessException("TEST_ERROR", "Rule 2 failed")).when(mockRule2).isSatisfiedBy(context);
        Specification<Object> combinedRule = mockRule1.or(mockRule2);

        assertThatThrownBy(() -> ruleEngine.execute(context, List.of(combinedRule)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Rule 2 failed"); // The last exception thrown

        verify(mockRule1, times(1)).isSatisfiedBy(context);
        verify(mockRule2, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests the logical NOT composition of rules (original rule passes).
     */
    @Test
    void not_composition_originalRulePasses_shouldThrowException() {
        Object context = new Object();
        Specification<Object> notRule = mockRule1.not();

        assertThatThrownBy(() -> ruleEngine.execute(context, List.of(notRule)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Specification was satisfied, but NOT was expected.");

        verify(mockRule1, times(1)).isSatisfiedBy(context);
    }

    /**
     * Tests the logical NOT composition of rules (original rule fails).
     */
    @Test
    void not_composition_originalRuleFails_shouldPass() throws BusinessException {
        Object context = new Object();
        doThrow(new BusinessException("TEST_ERROR", "Original rule failed")).when(mockRule1).isSatisfiedBy(context);
        Specification<Object> notRule = mockRule1.not();

        assertThatCode(() -> ruleEngine.execute(context, List.of(notRule))).doesNotThrowAnyException();

        verify(mockRule1, times(1)).isSatisfiedBy(context);
    }
}
