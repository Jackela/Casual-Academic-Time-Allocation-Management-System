package com.usyd.catams.service;

import com.usyd.catams.enums.ApprovalStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service for tracking approval workflow metrics and performance.
 * 
 * Provides comprehensive monitoring for dual workflow paths:
 * - Legacy workflow usage and performance
 * - Enhanced workflow adoption and success rates
 * - Business KPIs for approval process efficiency
 * 
 * @author Development Team
 * @since 2.0
 */
@Service
public class WorkflowMetricsService {

    private final MeterRegistry meterRegistry;
    
    // Workflow counters (single-path)
    private Counter workflowTransitionCounter;
    private Counter tutorApprovalCounter;
    private Counter lecturerAndTutorApprovalCounter;
    private Counter finalApprovalCounter;
    
    // Performance timers
    private Timer approvalCompletionTimer;
    private Timer tutorReviewTimer;
    private Timer lecturerApprovalTimer;
    private Timer hrApprovalTimer;
    
    // Current state gauges
    private final AtomicInteger pendingTutorReviewCount = new AtomicInteger(0);
    private final AtomicInteger approvedByTutorCount = new AtomicInteger(0);
    private final AtomicInteger approvedByLecturerAndTutorCount = new AtomicInteger(0);
    
    // Error tracking
    private Counter workflowTransitionErrorCounter;

    @Autowired
    public WorkflowMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void initializeMetrics() {
        // Workflow usage metrics (single-path)
        workflowTransitionCounter = Counter.builder("approval.workflow.transitions")
                .description("All workflow transitions")
                .register(meterRegistry);

        // State transition counters
        tutorApprovalCounter = Counter.builder("approval.milestone.tutor_approval")
                .description("Timesheets approved by tutor")
                .register(meterRegistry);

        lecturerAndTutorApprovalCounter = Counter.builder("approval.milestone.lecturer_and_tutor_approval")
                .description("Timesheets approved by both lecturer and tutor")
                .register(meterRegistry);
                
        finalApprovalCounter = Counter.builder("approval.transition.final_confirmed")
                .description("Timesheets reaching final confirmation")
                .tag("status", "final_confirmed")
                .register(meterRegistry);

        // Performance timers
        approvalCompletionTimer = Timer.builder("approval.workflow.completion.time")
                .description("Total time from submission to final approval")
                .register(meterRegistry);
                
        tutorReviewTimer = Timer.builder("approval.step.tutor_review.time")
                .description("Time spent in tutor review stage")
                .register(meterRegistry);
                
        lecturerApprovalTimer = Timer.builder("approval.step.lecturer_approval.time")
                .description("Time spent waiting for lecturer approval")
                .register(meterRegistry);
                
        hrApprovalTimer = Timer.builder("approval.step.hr_approval.time")
                .description("Time spent in HR approval stage")
                .register(meterRegistry);

        // Current state gauges
        Gauge.builder("approval.state.pending_tutor_confirmation", this, service -> pendingTutorReviewCount.get())
                .description("Current number of timesheets pending tutor confirmation")
                .register(meterRegistry);
                
        Gauge.builder("approval.state.tutor_confirmed", this, service -> approvedByTutorCount.get())
                .description("Current number of timesheets confirmed by tutor (awaiting lecturer)")
                .register(meterRegistry);
                
        Gauge.builder("approval.state.lecturer_confirmed", this, service -> approvedByLecturerAndTutorCount.get())
                .description("Current number of timesheets confirmed by lecturer (awaiting HR)")
                .register(meterRegistry);

        // Error tracking
        workflowTransitionErrorCounter = Counter.builder("approval.workflow.errors")
                .description("Number of workflow transition errors")
                .register(meterRegistry);
                
    }

    /**
     * Record workflow usage based on the approval status transition.
     * Automatically determines workflow type and increments appropriate counters.
     */
    public void recordWorkflowUsage(ApprovalStatus fromStatus, ApprovalStatus toStatus) {
        // Record transition
        workflowTransitionCounter.increment();

        // Record milestones
        if (toStatus == ApprovalStatus.TUTOR_CONFIRMED) {
            tutorApprovalCounter.increment();
        } else if (toStatus == ApprovalStatus.LECTURER_CONFIRMED) {
            lecturerAndTutorApprovalCounter.increment();
        } else if (toStatus == ApprovalStatus.FINAL_CONFIRMED) {
            finalApprovalCounter.increment();
        }
    }

    /**
     * Record timing for approval process completion.
     */
    public void recordApprovalCompletion(Duration completionTime) {
        approvalCompletionTimer.record(completionTime);
    }

    /**
     * Record timing for specific approval steps.
     */
    public void recordStepTiming(String stepName, Duration stepTime) {
        switch (stepName) {
            case "tutor_review":
                tutorReviewTimer.record(stepTime);
                break;
            case "lecturer_approval":
                lecturerApprovalTimer.record(stepTime);
                break;
            case "hr_approval":
                hrApprovalTimer.record(stepTime);
                break;
        }
    }

    /**
     * Update current state counts for real-time monitoring.
     */
    public void updateCurrentStateCounts(ApprovalStatus status, int delta) {
        switch (status) {
            case PENDING_TUTOR_CONFIRMATION:
                pendingTutorReviewCount.addAndGet(delta);
                break;
            case TUTOR_CONFIRMED:
                approvedByTutorCount.addAndGet(delta);
                break;
            case LECTURER_CONFIRMED:
                approvedByLecturerAndTutorCount.addAndGet(delta);
                break;
            case DRAFT:
            case MODIFICATION_REQUESTED:
            case FINAL_CONFIRMED:
            case REJECTED:
            default:
                // No gauge updates for these statuses
                break;
        }
    }

    /**
     * Record workflow errors for monitoring and alerting.
     */
    public void recordWorkflowError(String errorType) {
        Counter.builder("approval.workflow.errors")
                .tag("error_type", errorType)
                .description("Number of workflow transition errors")
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record invalid state transition attempts.
     */
    public void recordInvalidTransition(ApprovalStatus fromStatus, String attemptedAction) {
        Counter.builder("approval.transition.invalid")
                .tag("from_status", fromStatus.toString())
                .tag("attempted_action", attemptedAction)
                .description("Number of invalid state transition attempts")
                .register(meterRegistry)
                .increment();
    }

    /**
     * Get current workflow usage statistics.
     */
    public WorkflowStats getCurrentWorkflowStats() {
        return WorkflowStats.builder()
                .legacyWorkflowCount(0L)
                .enhancedWorkflowCount((long) workflowTransitionCounter.count())
                .pendingTutorReview(pendingTutorReviewCount.get())
                .pendingHrReview(0)
                .approvedByTutor(approvedByTutorCount.get())
                .approvedByLecturerAndTutor(approvedByLecturerAndTutorCount.get())
                .totalErrors((long) workflowTransitionErrorCounter.count())
                .build();
    }

    // Helper methods for workflow type detection
    // Removed legacy/enhanced classification and validation helpers to enforce SSOT single workflow

    /**
     * Data class for workflow statistics.
     */
    public static class WorkflowStats {
        private final long legacyWorkflowCount;
        private final long enhancedWorkflowCount;
        private final int pendingTutorReview;
        private final int pendingHrReview;
        private final int approvedByTutor;
        private final int approvedByLecturerAndTutor;
        private final long totalErrors;

        private WorkflowStats(Builder builder) {
            this.legacyWorkflowCount = builder.legacyWorkflowCount;
            this.enhancedWorkflowCount = builder.enhancedWorkflowCount;
            this.pendingTutorReview = builder.pendingTutorReview;
            this.pendingHrReview = builder.pendingHrReview;
            this.approvedByTutor = builder.approvedByTutor;
            this.approvedByLecturerAndTutor = builder.approvedByLecturerAndTutor;
            this.totalErrors = builder.totalErrors;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public long getLegacyWorkflowCount() { return legacyWorkflowCount; }
        public long getEnhancedWorkflowCount() { return enhancedWorkflowCount; }
        public int getPendingTutorReview() { return pendingTutorReview; }
        public int getPendingHrReview() { return pendingHrReview; }
        public int getApprovedByTutor() { return approvedByTutor; }
        public int getApprovedByLecturerAndTutor() { return approvedByLecturerAndTutor; }
        public long getTotalErrors() { return totalErrors; }

        public double getEnhancedWorkflowAdoptionRate() {
            long total = legacyWorkflowCount + enhancedWorkflowCount;
            return total > 0 ? (double) enhancedWorkflowCount / total * 100 : 0;
        }

        public static class Builder {
            private long legacyWorkflowCount;
            private long enhancedWorkflowCount;
            private int pendingTutorReview;
            private int pendingHrReview;
            private int approvedByTutor;
            private int approvedByLecturerAndTutor;
            private long totalErrors;

            public Builder legacyWorkflowCount(long legacyWorkflowCount) {
                this.legacyWorkflowCount = legacyWorkflowCount;
                return this;
            }

            public Builder enhancedWorkflowCount(long enhancedWorkflowCount) {
                this.enhancedWorkflowCount = enhancedWorkflowCount;
                return this;
            }

            public Builder pendingTutorReview(int pendingTutorReview) {
                this.pendingTutorReview = pendingTutorReview;
                return this;
            }

            public Builder pendingHrReview(int pendingHrReview) {
                this.pendingHrReview = pendingHrReview;
                return this;
            }

            public Builder approvedByTutor(int approvedByTutor) {
                this.approvedByTutor = approvedByTutor;
                return this;
            }

            public Builder approvedByLecturerAndTutor(int approvedByLecturerAndTutor) {
                this.approvedByLecturerAndTutor = approvedByLecturerAndTutor;
                return this;
            }

            public Builder totalErrors(long totalErrors) {
                this.totalErrors = totalErrors;
                return this;
            }

            public WorkflowStats build() {
                return new WorkflowStats(this);
            }
        }
    }
}