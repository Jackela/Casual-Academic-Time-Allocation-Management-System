package com.usyd.catams.testutils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Test date helpers for deterministic week calculations.
 */
public final class TestDates {

    private TestDates() {}

    /**
     * Returns the Monday of the week containing the provided date.
     * If the date is already a Monday, returns the same date.
     */
    public static LocalDate mondayOf(LocalDate date) {
        if (date == null) return null;
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}

