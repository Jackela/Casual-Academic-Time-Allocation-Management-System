package com.usyd.catams.common.domain.event;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Base interface for all domain events in the CATAMS system
 * 
 * Domain events represent significant business occurrences that other parts of the system
 * (or future microservices) might be interested in. This interface provides the foundation
 * for event-driven communication patterns.
 * 
 * Design Principles:
 * - Immutable event objects
 * - Self-contained with all necessary data
 * - Serializable for future message queue integration
 * - Timestamped for audit and ordering
 * - Uniquely identifiable for deduplication
 * 
 * Future Microservices Readiness:
 * - Events can be published to message queues (RabbitMQ, Kafka)
 * - JSON serializable for REST webhook notifications
 * - Contains correlation IDs for distributed tracing
 * - Supports eventual consistency patterns
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
public interface DomainEvent extends Serializable {
    
    /**
     * Get unique identifier for this event
     * Used for deduplication and correlation
     * 
     * @return UUID of the event
     */
    UUID getEventId();
    
    /**
     * Get the timestamp when this event occurred
     * 
     * @return LocalDateTime when event was created
     */
    LocalDateTime getOccurredAt();
    
    /**
     * Get the aggregate ID that this event relates to
     * This is the primary entity ID that was affected
     * 
     * @return ID of the affected aggregate/entity
     */
    String getAggregateId();
    
    /**
     * Get the type of aggregate this event relates to
     * Useful for routing and filtering events
     * 
     * @return Type of aggregate (e.g., "TIMESHEET", "USER", "COURSE")
     */
    String getAggregateType();
    
    /**
     * Get the event type/name for routing and handling
     * 
     * @return Event type identifier
     */
    String getEventType();
    
    /**
     * Get the version of this event schema
     * Important for backwards compatibility in distributed systems
     * 
     * @return Version number (e.g., "1.0", "2.1")
     */
    default String getEventVersion() {
        return "1.0";
    }
    
    /**
     * Get the ID of the user who triggered this event (if applicable)
     * 
     * @return User ID or null if system-generated
     */
    default String getTriggeredBy() {
        return null;
    }
    
    /**
     * Get correlation ID for tracing related operations
     * Useful for distributed tracing and debugging
     * 
     * @return Correlation ID or null
     */
    default String getCorrelationId() {
        return null;
    }
    
    /**
     * Check if this event should be published externally
     * Some events might be internal-only
     * 
     * @return true if event should be published to external systems
     */
    default boolean isPublishable() {
        return true;
    }
    
    /**
     * Get additional metadata for this event
     * Can include context information, trace data, etc.
     * 
     * @return Map of metadata key-value pairs
     */
    default java.util.Map<String, Object> getMetadata() {
        return java.util.Collections.emptyMap();
    }
}

/**
 * Abstract base class for domain events providing common functionality
 */
abstract class AbstractDomainEvent implements DomainEvent {
    
    private final UUID eventId;
    private final LocalDateTime occurredAt;
    private final String aggregateId;
    private final String aggregateType;
    private final String triggeredBy;
    private final String correlationId;
    private final java.util.Map<String, Object> metadata;
    
    protected AbstractDomainEvent(String aggregateId, String aggregateType) {
        this(aggregateId, aggregateType, null, null, java.util.Collections.emptyMap());
    }
    
    protected AbstractDomainEvent(String aggregateId, String aggregateType, 
                                 String triggeredBy, String correlationId,
                                 java.util.Map<String, Object> metadata) {
        this.eventId = UUID.randomUUID();
        this.occurredAt = LocalDateTime.now();
        this.aggregateId = Objects.requireNonNull(aggregateId, "Aggregate ID cannot be null");
        this.aggregateType = Objects.requireNonNull(aggregateType, "Aggregate type cannot be null");
        this.triggeredBy = triggeredBy;
        this.correlationId = correlationId;
        this.metadata = metadata != null ? java.util.Collections.unmodifiableMap(metadata) : java.util.Collections.emptyMap();
    }
    
    @Override
    public UUID getEventId() {
        return eventId;
    }
    
    @Override
    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }
    
    @Override
    public String getAggregateId() {
        return aggregateId;
    }
    
    @Override
    public String getAggregateType() {
        return aggregateType;
    }
    
    @Override
    public String getTriggeredBy() {
        return triggeredBy;
    }
    
    @Override
    public String getCorrelationId() {
        return correlationId;
    }
    
    @Override
    public java.util.Map<String, Object> getMetadata() {
        return metadata;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AbstractDomainEvent that = (AbstractDomainEvent) o;
        return Objects.equals(eventId, that.eventId);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(eventId);
    }
    
    @Override
    public String toString() {
        return String.format("%s{eventId=%s, aggregateId=%s, aggregateType=%s, occurredAt=%s}", 
            getClass().getSimpleName(), eventId, aggregateId, aggregateType, occurredAt);
    }
}