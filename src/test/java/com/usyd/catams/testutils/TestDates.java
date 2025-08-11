package com.usyd.catams.testutils;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * Test date utilities for consistent week-based calculations.
 */
public final class TestDates {

    private TestDates() {}

    /**
     * Returns the Monday of the week for the provided date.
     */
    public static LocalDate mondayOf(LocalDate date) {
        if (date == null) {
            throw new IllegalArgumentException("date must not be null");
        }
        return date.with(DayOfWeek.MONDAY);
    }

    /**
     * Returns the Monday of the current week.
     */
    public static LocalDate currentMonday() {
        return mondayOf(LocalDate.now());
    }

    /**
     * Returns the Monday that is N weeks from now (negative for past).
     */
    public static LocalDate mondayWeeksFromNow(int weeks) {
        return currentMonday().plusWeeks(weeks);
    }
}


