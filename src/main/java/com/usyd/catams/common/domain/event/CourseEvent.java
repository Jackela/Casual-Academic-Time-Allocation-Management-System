package com.usyd.catams.common.domain.event;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Course domain events for the CATAMS system
 * 
 * These events represent significant course-related business occurrences that other
 * services or components need to be aware of. When extracted to microservices, these
 * events will be published to message queues for cross-service communication.
 * 
 * Event Types:
 * - CourseCreatedEvent: New course created
 * - CourseUpdatedEvent: Course information modified
 * - CourseActivatedEvent: Course activated for use
 * - CourseDeactivatedEvent: Course deactivated
 * - CourseBudgetUpdatedEvent: Course budget modified
 * - CourseTutorAssignedEvent: Tutor assigned to course
 * - CourseTutorUnassignedEvent: Tutor removed from course
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public abstract class CourseEvent extends AbstractDomainEvent {
    private static final long serialVersionUID = 1L;
    
    private static final String AGGREGATE_TYPE = "COURSE";
    
    protected final String courseCode;
    protected final String courseName;
    protected final Long lecturerId;
    protected final String semester;
    
    protected CourseEvent(String courseId, String courseCode, String courseName,
                         Long lecturerId, String semester, String triggeredBy, String correlationId) {
        super(courseId, AGGREGATE_TYPE, triggeredBy, correlationId, null);
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.lecturerId = lecturerId;
        this.semester = semester;
    }
    
    public String getCourseCode() { return courseCode; }
    public String getCourseName() { return courseName; }
    public Long getLecturerId() { return lecturerId; }
    public String getSemester() { return semester; }
    
    /**
     * Event fired when a new course is created
     */
        public static class CourseCreatedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final BigDecimal budgetAllocated;
        private final boolean isActive;
        
        public CourseCreatedEvent(String courseId, String courseCode, String courseName,
                                 Long lecturerId, String semester, BigDecimal budgetAllocated,
                                 boolean isActive, String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.budgetAllocated = budgetAllocated;
            this.isActive = isActive;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_CREATED";
        }
        
        public BigDecimal getBudgetAllocated() { return budgetAllocated; }
        public boolean isActive() { return isActive; }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("budgetAllocated", budgetAllocated);
            metadata.put("isActive", isActive);
            metadata.put("setupRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when course information is updated
     */
        public static class CourseUpdatedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final String previousCourseName;
        private final String previousSemester;
        private final Long previousLecturerId;
        
        public CourseUpdatedEvent(String courseId, String courseCode,
                                 String previousCourseName, String newCourseName,
                                 String previousSemester, String newSemester,
                                 Long previousLecturerId, Long newLecturerId,
                                 String triggeredBy, String correlationId) {
            super(courseId, courseCode, newCourseName, newLecturerId, newSemester, triggeredBy, correlationId);
            this.previousCourseName = previousCourseName;
            this.previousSemester = previousSemester;
            this.previousLecturerId = previousLecturerId;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_UPDATED";
        }
        
        public String getPreviousCourseName() { return previousCourseName; }
        public String getPreviousSemester() { return previousSemester; }
        public Long getPreviousLecturerId() { return previousLecturerId; }
        
        public boolean hasNameChanged() {
            return !java.util.Objects.equals(previousCourseName, courseName);
        }
        
        public boolean hasSemesterChanged() {
            return !java.util.Objects.equals(previousSemester, semester);
        }
        
        public boolean hasLecturerChanged() {
            return !java.util.Objects.equals(previousLecturerId, lecturerId);
        }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("nameChanged", hasNameChanged());
            metadata.put("semesterChanged", hasSemesterChanged());
            metadata.put("lecturerChanged", hasLecturerChanged());
            if (hasLecturerChanged()) {
                metadata.put("accessControlUpdateRequired", true);
            }
            return metadata;
        }
    }
    
    /**
     * Event fired when a course is activated
     */
        public static class CourseActivatedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final String activationReason;
        
        public CourseActivatedEvent(String courseId, String courseCode, String courseName,
                                   Long lecturerId, String semester, String activationReason,
                                   String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.activationReason = activationReason;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_ACTIVATED";
        }
        
        public String getActivationReason() { return activationReason; }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("activationReason", activationReason);
            metadata.put("timesheetCreationEnabled", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when a course is deactivated
     */
        public static class CourseDeactivatedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final String deactivationReason;
        private final boolean hasPendingTimesheets;
        
        public CourseDeactivatedEvent(String courseId, String courseCode, String courseName,
                                     Long lecturerId, String semester, String deactivationReason,
                                     boolean hasPendingTimesheets, String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.deactivationReason = deactivationReason;
            this.hasPendingTimesheets = hasPendingTimesheets;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_DEACTIVATED";
        }
        
        public String getDeactivationReason() { return deactivationReason; }
        public boolean hasPendingTimesheets() { return hasPendingTimesheets; }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("deactivationReason", deactivationReason);
            metadata.put("hasPendingTimesheets", hasPendingTimesheets);
            if (hasPendingTimesheets) {
                metadata.put("timesheetCleanupRequired", true);
            }
            return metadata;
        }
    }
    
    /**
     * Event fired when course budget is updated
     */
        public static class CourseBudgetUpdatedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final BigDecimal previousBudgetAllocated;
        private final BigDecimal newBudgetAllocated;
        private final BigDecimal previousBudgetUsed;
        private final BigDecimal currentBudgetUsed;
        private final String budgetChangeReason;
        
        public CourseBudgetUpdatedEvent(String courseId, String courseCode, String courseName,
                                       Long lecturerId, String semester,
                                       BigDecimal previousBudgetAllocated, BigDecimal newBudgetAllocated,
                                       BigDecimal previousBudgetUsed, BigDecimal currentBudgetUsed,
                                       String budgetChangeReason, String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.previousBudgetAllocated = previousBudgetAllocated;
            this.newBudgetAllocated = newBudgetAllocated;
            this.previousBudgetUsed = previousBudgetUsed;
            this.currentBudgetUsed = currentBudgetUsed;
            this.budgetChangeReason = budgetChangeReason;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_BUDGET_UPDATED";
        }
        
        public BigDecimal getPreviousBudgetAllocated() { return previousBudgetAllocated; }
        public BigDecimal getNewBudgetAllocated() { return newBudgetAllocated; }
        public BigDecimal getPreviousBudgetUsed() { return previousBudgetUsed; }
        public BigDecimal getCurrentBudgetUsed() { return currentBudgetUsed; }
        public String getBudgetChangeReason() { return budgetChangeReason; }
        
        public BigDecimal getBudgetChange() {
            return newBudgetAllocated.subtract(previousBudgetAllocated);
        }
        
        public boolean isBudgetIncrease() {
            return getBudgetChange().compareTo(BigDecimal.ZERO) > 0;
        }
        
        public boolean isBudgetDecrease() {
            return getBudgetChange().compareTo(BigDecimal.ZERO) < 0;
        }
        
        public BigDecimal getNewBudgetRemaining() {
            return newBudgetAllocated.subtract(currentBudgetUsed);
        }
        
        public boolean isNewBudgetExceeded() {
            return currentBudgetUsed.compareTo(newBudgetAllocated) > 0;
        }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("previousBudgetAllocated", previousBudgetAllocated);
            metadata.put("newBudgetAllocated", newBudgetAllocated);
            metadata.put("budgetChange", getBudgetChange());
            metadata.put("isBudgetIncrease", isBudgetIncrease());
            metadata.put("isBudgetDecrease", isBudgetDecrease());
            metadata.put("budgetChangeReason", budgetChangeReason);
            metadata.put("isNewBudgetExceeded", isNewBudgetExceeded());
            if (isNewBudgetExceeded()) {
                metadata.put("budgetAlertRequired", true);
            }
            return metadata;
        }
    }
    
    /**
     * Event fired when a tutor is assigned to work on a course
     */
        public static class CourseTutorAssignedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final Long tutorId;
        private final String tutorName;
        private final String assignmentReason;
        
        public CourseTutorAssignedEvent(String courseId, String courseCode, String courseName,
                                       Long lecturerId, String semester, Long tutorId,
                                       String tutorName, String assignmentReason,
                                       String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.tutorId = tutorId;
            this.tutorName = tutorName;
            this.assignmentReason = assignmentReason;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_TUTOR_ASSIGNED";
        }
        
        public Long getTutorId() { return tutorId; }
        public String getTutorName() { return tutorName; }
        public String getAssignmentReason() { return assignmentReason; }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("tutorId", tutorId);
            metadata.put("tutorName", tutorName);
            metadata.put("assignmentReason", assignmentReason);
            metadata.put("accessGrantRequired", true);
            metadata.put("welcomeNotificationRequired", true);
            return metadata;
        }
    }
    
    /**
     * Event fired when a tutor is removed from a course
     */
        public static class CourseTutorUnassignedEvent extends CourseEvent {
            private static final long serialVersionUID = 1L;
        
        private final Long tutorId;
        private final String tutorName;
        private final String unassignmentReason;
        private final boolean hasPendingTimesheets;
        
        public CourseTutorUnassignedEvent(String courseId, String courseCode, String courseName,
                                         Long lecturerId, String semester, Long tutorId,
                                         String tutorName, String unassignmentReason,
                                         boolean hasPendingTimesheets, String triggeredBy, String correlationId) {
            super(courseId, courseCode, courseName, lecturerId, semester, triggeredBy, correlationId);
            this.tutorId = tutorId;
            this.tutorName = tutorName;
            this.unassignmentReason = unassignmentReason;
            this.hasPendingTimesheets = hasPendingTimesheets;
        }
        
        @Override
        public String getEventType() {
            return "COURSE_TUTOR_UNASSIGNED";
        }
        
        public Long getTutorId() { return tutorId; }
        public String getTutorName() { return tutorName; }
        public String getUnassignmentReason() { return unassignmentReason; }
        public boolean hasPendingTimesheets() { return hasPendingTimesheets; }
        
        @Override
        public Map<String, java.io.Serializable> getMetadata() {
            Map<String, java.io.Serializable> metadata = new java.util.HashMap<>(super.getMetadata());
            metadata.put("tutorId", tutorId);
            metadata.put("tutorName", tutorName);
            metadata.put("unassignmentReason", unassignmentReason);
            metadata.put("hasPendingTimesheets", hasPendingTimesheets);
            metadata.put("accessRevocationRequired", true);
            if (hasPendingTimesheets) {
                metadata.put("timesheetHandlingRequired", true);
            }
            return metadata;
        }
    }
}