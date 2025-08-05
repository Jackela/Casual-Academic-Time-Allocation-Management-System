package com.usyd.catams.dto.response;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Workload analysis DTO for dashboard performance metrics
 * 
 * Provides insights into work patterns and capacity utilization
 * Some fields are only applicable to LECTURER/ADMIN views
 */
public class WorkloadAnalysis {

    @NotNull
    private BigDecimal currentWeekHours;

    private BigDecimal previousWeekHours;

    @NotNull
    private BigDecimal averageWeeklyHours;

    private BigDecimal peakWeekHours;

    // Only populated for LECTURER/ADMIN roles
    private Integer totalTutors;

    // Only populated for LECTURER/ADMIN roles
    private Integer activeTutors;

    public WorkloadAnalysis() {}

    public WorkloadAnalysis(BigDecimal currentWeekHours, BigDecimal previousWeekHours,
                           BigDecimal averageWeeklyHours, BigDecimal peakWeekHours,
                           Integer totalTutors, Integer activeTutors) {
        this.currentWeekHours = currentWeekHours;
        this.previousWeekHours = previousWeekHours;
        this.averageWeeklyHours = averageWeeklyHours;
        this.peakWeekHours = peakWeekHours;
        this.totalTutors = totalTutors;
        this.activeTutors = activeTutors;
    }

    public BigDecimal getCurrentWeekHours() {
        return currentWeekHours;
    }

    public void setCurrentWeekHours(BigDecimal currentWeekHours) {
        this.currentWeekHours = currentWeekHours;
    }

    public BigDecimal getPreviousWeekHours() {
        return previousWeekHours;
    }

    public void setPreviousWeekHours(BigDecimal previousWeekHours) {
        this.previousWeekHours = previousWeekHours;
    }

    public BigDecimal getAverageWeeklyHours() {
        return averageWeeklyHours;
    }

    public void setAverageWeeklyHours(BigDecimal averageWeeklyHours) {
        this.averageWeeklyHours = averageWeeklyHours;
    }

    public BigDecimal getPeakWeekHours() {
        return peakWeekHours;
    }

    public void setPeakWeekHours(BigDecimal peakWeekHours) {
        this.peakWeekHours = peakWeekHours;
    }

    public Integer getTotalTutors() {
        return totalTutors;
    }

    public void setTotalTutors(Integer totalTutors) {
        this.totalTutors = totalTutors;
    }

    public Integer getActiveTutors() {
        return activeTutors;
    }

    public void setActiveTutors(Integer activeTutors) {
        this.activeTutors = activeTutors;
    }
}