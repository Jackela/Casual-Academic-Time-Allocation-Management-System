package com.usyd.catams.dto.response;

import com.usyd.catams.enums.PendingItemType;
import com.usyd.catams.enums.Priority;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Pending item DTO for dashboard task management
 * 
 * Represents items requiring user attention such as approvals,
 * modification responses, and system notifications
 */
public class PendingItem {

    @NotNull
    private Long id;

    @NotNull
    private PendingItemType type;

    @NotNull
    private String title;

    @NotNull
    private String description;

    @NotNull
    private Priority priority;

    private LocalDateTime dueDate;

    private Long timesheetId;

    public PendingItem() {}

    public PendingItem(Long id, PendingItemType type, String title, String description,
                      Priority priority, LocalDateTime dueDate, Long timesheetId) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.dueDate = dueDate;
        this.timesheetId = timesheetId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PendingItemType getType() {
        return type;
    }

    public void setType(PendingItemType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public LocalDateTime getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }

    public Long getTimesheetId() {
        return timesheetId;
    }

    public void setTimesheetId(Long timesheetId) {
        this.timesheetId = timesheetId;
    }
}