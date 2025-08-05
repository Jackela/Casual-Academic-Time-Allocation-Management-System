
package com.usyd.catams.domain.rules.context;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;

public class TimesheetValidationContext {

    private final User creator;
    private final User tutor;
    private final Course course;
    private final LocalDate weekStartDate;
    private final BigDecimal hours;
    private final BigDecimal hourlyRate;
    private final String description;

    public TimesheetValidationContext(User creator, User tutor, Course course, LocalDate weekStartDate, BigDecimal hours, BigDecimal hourlyRate, String description) {
        this.creator = creator;
        this.tutor = tutor;
        this.course = course;
        this.weekStartDate = weekStartDate;
        this.hours = hours;
        this.hourlyRate = hourlyRate;
        this.description = description;
    }

    // Getters for all fields
    public User getCreator() { return creator; }
    public User getTutor() { return tutor; }
    public Course getCourse() { return course; }
    public LocalDate getWeekStartDate() { return weekStartDate; }
    public BigDecimal getHours() { return hours; }
    public BigDecimal getHourlyRate() { return hourlyRate; }
    public String getDescription() { return description; }
}
