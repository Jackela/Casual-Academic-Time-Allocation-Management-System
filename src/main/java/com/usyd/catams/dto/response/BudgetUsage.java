package com.usyd.catams.dto.response;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Budget usage information DTO for LECTURER and ADMIN dashboard summaries
 * 
 * Provides financial metrics including total budget, used budget, 
 * remaining budget, and utilization percentage
 */
public class BudgetUsage {

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal totalBudget;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal usedBudget;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal remainingBudget;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal utilizationPercentage;

    public BudgetUsage() {}

    public BudgetUsage(BigDecimal totalBudget, BigDecimal usedBudget, 
                      BigDecimal remainingBudget, BigDecimal utilizationPercentage) {
        this.totalBudget = totalBudget;
        this.usedBudget = usedBudget;
        this.remainingBudget = remainingBudget;
        this.utilizationPercentage = utilizationPercentage;
    }

    public BigDecimal getTotalBudget() {
        return totalBudget;
    }

    public void setTotalBudget(BigDecimal totalBudget) {
        this.totalBudget = totalBudget;
    }

    public BigDecimal getUsedBudget() {
        return usedBudget;
    }

    public void setUsedBudget(BigDecimal usedBudget) {
        this.usedBudget = usedBudget;
    }

    public BigDecimal getRemainingBudget() {
        return remainingBudget;
    }

    public void setRemainingBudget(BigDecimal remainingBudget) {
        this.remainingBudget = remainingBudget;
    }

    public BigDecimal getUtilizationPercentage() {
        return utilizationPercentage;
    }

    public void setUtilizationPercentage(BigDecimal utilizationPercentage) {
        this.utilizationPercentage = utilizationPercentage;
    }
}