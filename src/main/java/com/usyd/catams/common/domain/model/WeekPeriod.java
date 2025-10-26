package com.usyd.catams.common.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;

import java.io.Serializable;
import java.time.DayOfWeek;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Objects;

/**
 * Value Object representing a work week period in the CATAMS system.
 * 
 * This class encapsulates a week period starting from Monday and ending on Sunday,
 * which is the standard work week format for timesheet submissions. It ensures
 * that week periods always start on Monday and provides utilities for week-based
 * calculations and validations.
 * 
 * @author Development Team
 * @since 1.0
 */
@Embeddable
public class WeekPeriod implements Serializable, Comparable<WeekPeriod> {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * The start date of the week period (always a Monday)
     */
    @NotNull(message = "Week start date cannot be null")
    @Column(name = "weekStartDate", nullable = false)
    private LocalDate weekStartDate;
    
    /**
     * Default constructor for JPA
     */
    protected WeekPeriod() {
        this.weekStartDate = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
    
    /**
     * Creates a WeekPeriod instance with the specified start date
     * 
     * @param startDate the start date, will be adjusted to the Monday of that week if necessary
     * @throws IllegalArgumentException if start date is null
     */
    public WeekPeriod(LocalDate startDate) {
        validateStartDate(startDate);
        if (startDate.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Date must be a Monday");
        }
        setWeekStartDate(startDate);
    }

    /**
     * Unsafe factory used only by entities when they need to stage invalid values for later validation.
     * DbC: callers must ensure subsequent validation is performed (e.g., Timesheet.validateBusinessRules).
     */
    public static WeekPeriod unsafe(LocalDate date) {
        if (date == null) {
            throw new IllegalArgumentException("Week start date cannot be null");
        }
        WeekPeriod wp = new WeekPeriod();
        wp.setWeekStartDate(date);
        return wp;
    }
    
    /**
     * Sets the week start date (for JPA)
     */
    private void setWeekStartDate(LocalDate weekStartDate) {
        this.weekStartDate = weekStartDate;
    }
    
    /**
     * Factory method to create a WeekPeriod for the current week
     * 
     * @return a WeekPeriod representing the current week
     */
    public static WeekPeriod current() {
        return new WeekPeriod(LocalDate.now());
    }

    /**
     * Factory method to create a WeekPeriod for the current week using a specific clock.
     * Note: caller must ensure the resulting date is a Monday; intended for tests using a Monday-fixed clock.
     */
    public static WeekPeriod current(Clock clock) {
        Objects.requireNonNull(clock, "clock");
        return new WeekPeriod(LocalDate.now(clock));
    }
    
    /**
     * Factory method to create a WeekPeriod for a specific date
     * The week period will start on the Monday of the week containing the specified date
     * 
     * @param date the date within the desired week
     * @return a WeekPeriod for the week containing the specified date
     */
    public static WeekPeriod containing(LocalDate date) {
        return new WeekPeriod(date);
    }
    
    /**
     * Factory method to create a WeekPeriod starting exactly on the specified Monday
     * 
     * @param monday the Monday to start the week period
     * @return a WeekPeriod starting on the specified Monday
     * @throws IllegalArgumentException if the date is not a Monday
     */
    public static WeekPeriod startingOn(LocalDate monday) {
        if (monday == null) {
            throw new IllegalArgumentException("Monday date cannot be null");
        }
        if (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("Date must be a Monday");
        }
        return new WeekPeriod(monday);
    }
    
    /**
     * Gets the start date of the week period (always a Monday)
     * 
     * @return the start date
     */
    public LocalDate getStartDate() {
        return weekStartDate;
    }
    
    /**
     * Gets the end date of the week period (always a Sunday)
     * 
     * @return the end date
     */
    public LocalDate getEndDate() {
        return weekStartDate.plusDays(6);
    }
    
    /**
     * Checks if the specified date falls within this week period
     * 
     * @param date the date to check
     * @return true if the date is within this week period
     */
    public boolean contains(LocalDate date) {
        if (date == null) {
            return false;
        }
        return !date.isBefore(weekStartDate) && !date.isAfter(getEndDate());
    }
    
    /**
     * Gets the previous week period
     * 
     * @return a WeekPeriod representing the previous week
     */
    public WeekPeriod previous() {
        return new WeekPeriod(weekStartDate.minusWeeks(1));
    }
    
    /**
     * Gets the next week period
     * 
     * @return a WeekPeriod representing the next week
     */
    public WeekPeriod next() {
        return new WeekPeriod(weekStartDate.plusWeeks(1));
    }
    
    /**
     * Gets a week period that is the specified number of weeks from this one
     * 
     * @param weeks the number of weeks to add (can be negative)
     * @return a WeekPeriod offset by the specified number of weeks
     */
    public WeekPeriod plusWeeks(long weeks) {
        return new WeekPeriod(weekStartDate.plusWeeks(weeks));
    }
    
    /**
     * Gets a week period that is the specified number of weeks before this one
     * 
     * @param weeks the number of weeks to subtract
     * @return a WeekPeriod offset by the specified number of weeks before
     */
    public WeekPeriod minusWeeks(long weeks) {
        return new WeekPeriod(weekStartDate.minusWeeks(weeks));
    }
    
    /**
     * Checks if this week period is before another week period
     * 
     * @param other the other week period to compare with
     * @return true if this week period is before the other
     */
    public boolean isBefore(WeekPeriod other) {
        if (other == null) {
            return false;
        }
        return this.weekStartDate.isBefore(other.weekStartDate);
    }
    
    /**
     * Checks if this week period is after another week period
     * 
     * @param other the other week period to compare with
     * @return true if this week period is after the other
     */
    public boolean isAfter(WeekPeriod other) {
        if (other == null) {
            return false;
        }
        return this.weekStartDate.isAfter(other.weekStartDate);
    }
    
    /**
     * Checks if this is the current week
     * 
     * @return true if this week period contains today's date
     */
    public boolean isCurrentWeek() {
        return contains(LocalDate.now());
    }

    /**
     * Returns true if this week period contains today's date from the provided clock.
     */
    public boolean isCurrentWeek(Clock clock) {
        Objects.requireNonNull(clock, "clock");
        return contains(LocalDate.now(clock));
    }
    
    /**
     * Checks if this week period is in the past
     * 
     * @return true if this week period's end date is before today
     */
    public boolean isPast() {
        return getEndDate().isBefore(LocalDate.now());
    }

    /**
     * Returns true if this week period ended before 'today' from the provided clock.
     */
    public boolean isPast(Clock clock) {
        Objects.requireNonNull(clock, "clock");
        return getEndDate().isBefore(LocalDate.now(clock));
    }
    
    /**
     * Checks if this week period is in the future
     * 
     * @return true if this week period's start date is after today
     */
    public boolean isFuture() {
        return getStartDate().isAfter(LocalDate.now());
    }

    /**
     * Returns true if this week period starts after 'today' from the provided clock.
     */
    public boolean isFuture(Clock clock) {
        Objects.requireNonNull(clock, "clock");
        return getStartDate().isAfter(LocalDate.now(clock));
    }
    
    /**
     * Gets the week number within the year (ISO week numbering)
     * 
     * @return the week number
     */
    public int getWeekOfYear() {
        return weekStartDate.get(java.time.temporal.WeekFields.ISO.weekOfYear());
    }
    
    /**
     * Gets the year this week period belongs to (ISO week-based year)
     * 
     * @return the year
     */
    public int getYear() {
        return weekStartDate.get(java.time.temporal.WeekFields.ISO.weekBasedYear());
    }
    
    /**
     * Formats the week period as a string range
     * 
     * @return formatted string like "2024-01-01 to 2024-01-07"
     */
    public String toDateRangeString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        return weekStartDate.format(formatter) + " to " + getEndDate().format(formatter);
    }
    
    /**
     * Formats the week period as a short string
     * 
     * @return formatted string like "Week of 2024-01-01"
     */
    public String toShortString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        return "Week of " + weekStartDate.format(formatter);
    }
    
    /**
     * Formats the week period for display purposes
     * 
     * @return formatted string like "Jan 1-7, 2024"
     */
    public String toDisplayString() {
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM");
        String month = weekStartDate.format(monthFormatter);
        int startDay = weekStartDate.getDayOfMonth();
        int endDay = getEndDate().getDayOfMonth();
        int year = weekStartDate.getYear();
        
        if (weekStartDate.getMonth() == getEndDate().getMonth()) {
            return String.format("%s %d-%d, %d", month, startDay, endDay, year);
        } else {
            String endMonth = getEndDate().format(monthFormatter);
            return String.format("%s %d - %s %d, %d", month, startDay, endMonth, endDay, year);
        }
    }
    
    /**
     * Validates that the start date is not null
     * 
     * @param startDate the start date to validate
     * @throws IllegalArgumentException if start date is null
     */
    private void validateStartDate(LocalDate startDate) {
        if (startDate == null) {
            throw new IllegalArgumentException("Week start date cannot be null");
        }
    }
    
    /**
     * Adjusts the given date to the Monday of that week
     * 
     * @param date the date to adjust
     * @return the Monday of the week containing the given date
     */
    // removed adjustToMonday - no longer used after enforcing strict Monday constraint    
    @Override
    public int compareTo(WeekPeriod other) {
        if (other == null) {
            return 1;
        }
        return this.weekStartDate.compareTo(other.weekStartDate);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WeekPeriod that = (WeekPeriod) o;
        return Objects.equals(weekStartDate, that.weekStartDate);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(weekStartDate);
    }
    
    @Override
    public String toString() {
        return toShortString();
    }
}
