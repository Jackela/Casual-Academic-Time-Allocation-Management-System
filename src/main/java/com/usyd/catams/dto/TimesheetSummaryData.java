package com.usyd.catams.dto;

import java.math.BigDecimal;

/**
 * DTO for efficient timesheet data aggregation in repository queries
 * 
 * Used as projection target for @Query aggregation methods to minimize
 * memory usage and improve performance by avoiding full entity loading
 */
public class TimesheetSummaryData {

    private final Long totalTimesheets;
    private final BigDecimal totalHours;
    private final BigDecimal totalPay;
    private final Long pendingApprovals;

    public TimesheetSummaryData(Long totalTimesheets, BigDecimal totalHours, 
                               BigDecimal totalPay, Long pendingApprovals) {
        this.totalTimesheets = totalTimesheets != null ? totalTimesheets : 0L;
        this.totalHours = totalHours != null ? totalHours : BigDecimal.ZERO;
        this.totalPay = totalPay != null ? totalPay : BigDecimal.ZERO;
        this.pendingApprovals = pendingApprovals != null ? pendingApprovals : 0L;
    }

    public Long getTotalTimesheets() {
        return totalTimesheets;
    }

    public BigDecimal getTotalHours() {
        return totalHours;
    }

    public BigDecimal getTotalPay() {
        return totalPay;
    }

    public Long getPendingApprovals() {
        return pendingApprovals;
    }
}