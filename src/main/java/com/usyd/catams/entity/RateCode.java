package com.usyd.catams.entity;

import com.usyd.catams.enums.TimesheetTaskType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * Maps EA Schedule 1 rate metadata captured in {@code rate_code}.
 */
@Entity
@Table(name = "rate_code")
public class RateCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 16, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 20)
    private TimesheetTaskType taskType;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "default_associated_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal defaultAssociatedHours = BigDecimal.ZERO;

    @Column(name = "default_delivery_hours", nullable = false, precision = 5, scale = 2)
    private BigDecimal defaultDeliveryHours = BigDecimal.ZERO;

    @Column(name = "requires_phd", nullable = false)
    private boolean requiresPhd;

    @Column(name = "is_repeatable", nullable = false)
    private boolean repeatable;

    @Column(name = "ea_clause_reference", length = 64)
    private String eaClauseReference;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public TimesheetTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(TimesheetTaskType taskType) {
        this.taskType = taskType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getDefaultAssociatedHours() {
        return defaultAssociatedHours;
    }

    public void setDefaultAssociatedHours(BigDecimal defaultAssociatedHours) {
        this.defaultAssociatedHours = defaultAssociatedHours;
    }

    public BigDecimal getDefaultDeliveryHours() {
        return defaultDeliveryHours;
    }

    public void setDefaultDeliveryHours(BigDecimal defaultDeliveryHours) {
        this.defaultDeliveryHours = defaultDeliveryHours;
    }

    public boolean isRequiresPhd() {
        return requiresPhd;
    }

    public void setRequiresPhd(boolean requiresPhd) {
        this.requiresPhd = requiresPhd;
    }

    public boolean isRepeatable() {
        return repeatable;
    }

    public void setRepeatable(boolean repeatable) {
        this.repeatable = repeatable;
    }

    public String getEaClauseReference() {
        return eaClauseReference;
    }

    public void setEaClauseReference(String eaClauseReference) {
        this.eaClauseReference = eaClauseReference;
    }
}
