package com.usyd.catams.testutils;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;

/**
 * Assertion helpers for tests to avoid brittle comparisons.
 */
public final class TestAssertions {

    private TestAssertions() {}

    /**
     * Asserts two BigDecimal values are numerically equal (ignores scale).
     */
    public static void assertBigDecimalEquals(BigDecimal expected, BigDecimal actual) {
        if (expected == null && actual == null) {
            return;
        }
        if (expected == null || actual == null) {
            throw new AssertionError("One of the BigDecimal values is null");
        }
        assertEquals(0, actual.compareTo(expected),
            () -> "Expected numerical equality but was expected=" + expected + ", actual=" + actual);
    }
}


