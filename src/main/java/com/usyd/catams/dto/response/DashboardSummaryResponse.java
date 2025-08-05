package com.usyd.catams.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * Dashboard summary response DTO conforming to OpenAPI specification
 * 
 * Contains aggregated metrics and insights based on user role and permissions.
 * BudgetUsage is only populated for LECTURER and ADMIN roles.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardSummaryResponse {

    @NotNull
    private Integer totalTimesheets;

    @NotNull  
    private Integer pendingApprovals;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal totalHours;

    @NotNull
    @DecimalMin("0.0") 
    private BigDecimal totalPay;

    // Only populated for LECTURER/ADMIN roles
    @Valid
    private BudgetUsage budgetUsage;

    @NotNull
    @Valid
    private List<RecentActivity> recentActivities;

    @NotNull
    @Valid
    private List<PendingItem> pendingItems;

    @NotNull
    @Valid
    private WorkloadAnalysis workloadAnalysis;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(Integer totalTimesheets, Integer pendingApprovals, 
                                   BigDecimal totalHours, BigDecimal totalPay,
                                   BudgetUsage budgetUsage, List<RecentActivity> recentActivities,
                                   List<PendingItem> pendingItems, WorkloadAnalysis workloadAnalysis) {
        this.totalTimesheets = totalTimesheets;
        this.pendingApprovals = pendingApprovals;
        this.totalHours = totalHours;
        this.totalPay = totalPay;
        this.budgetUsage = budgetUsage;
        this.recentActivities = recentActivities;
        this.pendingItems = pendingItems;
        this.workloadAnalysis = workloadAnalysis;
    }

    public Integer getTotalTimesheets() {
        return totalTimesheets;
    }

    public void setTotalTimesheets(Integer totalTimesheets) {
        this.totalTimesheets = totalTimesheets;
    }

    public Integer getPendingApprovals() {
        return pendingApprovals;
    }

    public void setPendingApprovals(Integer pendingApprovals) {
        this.pendingApprovals = pendingApprovals;
    }

    public BigDecimal getTotalHours() {
        return totalHours;
    }

    public void setTotalHours(BigDecimal totalHours) {
        this.totalHours = totalHours;
    }

    public BigDecimal getTotalPay() {
        return totalPay;
    }

    public void setTotalPay(BigDecimal totalPay) {
        this.totalPay = totalPay;
    }

    public BudgetUsage getBudgetUsage() {
        return budgetUsage;
    }

    public void setBudgetUsage(BudgetUsage budgetUsage) {
        this.budgetUsage = budgetUsage;
    }

    public List<RecentActivity> getRecentActivities() {
        return recentActivities;
    }

    public void setRecentActivities(List<RecentActivity> recentActivities) {
        this.recentActivities = recentActivities;
    }

    public List<PendingItem> getPendingItems() {
        return pendingItems;
    }

    public void setPendingItems(List<PendingItem> pendingItems) {
        this.pendingItems = pendingItems;
    }

    public WorkloadAnalysis getWorkloadAnalysis() {
        return workloadAnalysis;
    }

    public void setWorkloadAnalysis(WorkloadAnalysis workloadAnalysis) {
        this.workloadAnalysis = workloadAnalysis;
    }
}