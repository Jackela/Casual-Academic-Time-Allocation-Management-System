package com.usyd.catams.dto.response;

import com.usyd.catams.enums.ActivityType;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Recent activity DTO for dashboard activity feeds
 * 
 * Represents user activities and system events relevant to the authenticated user
 */
public class RecentActivity {

    @NotNull
    private Long id;

    @NotNull
    private ActivityType type;

    @NotNull
    private String description;

    @NotNull
    private LocalDateTime timestamp;

    private Long timesheetId;

    private Long userId;

    private String userName;

    public RecentActivity() {}

    public RecentActivity(Long id, ActivityType type, String description, LocalDateTime timestamp,
                         Long timesheetId, Long userId, String userName) {
        this.id = id;
        this.type = type;
        this.description = description;
        this.timestamp = timestamp;
        this.timesheetId = timesheetId;
        this.userId = userId;
        this.userName = userName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ActivityType getType() {
        return type;
    }

    public void setType(ActivityType type) {
        this.type = type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Long getTimesheetId() {
        return timesheetId;
    }

    public void setTimesheetId(Long timesheetId) {
        this.timesheetId = timesheetId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }
}