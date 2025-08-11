package com.usyd.catams.common.domain.event;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Abstract base class for domain events providing common functionality.
 * Immutable, serializable, and ready for distributed tracing.
 */
public abstract class AbstractDomainEvent implements DomainEvent, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final UUID eventId;
    private final LocalDateTime occurredAt;
    private final String aggregateId;
    private final String aggregateType;
    private final String triggeredBy;
    private final String correlationId;
    private final java.util.HashMap<String, Serializable> metadata;

    protected AbstractDomainEvent(String aggregateId, String aggregateType) {
        this(aggregateId, aggregateType, null, null, Map.of());
    }

    protected AbstractDomainEvent(String aggregateId, String aggregateType,
                                  String triggeredBy, String correlationId,
                                  Map<String, Serializable> metadata) {
        this.eventId = UUID.randomUUID();
        this.occurredAt = LocalDateTime.now();
        this.aggregateId = Objects.requireNonNull(aggregateId, "Aggregate ID cannot be null");
        this.aggregateType = Objects.requireNonNull(aggregateType, "Aggregate type cannot be null");
        this.triggeredBy = triggeredBy;
        this.correlationId = correlationId;
        this.metadata = metadata == null ? new java.util.HashMap<>() : new java.util.HashMap<>(metadata);
    }

    @Override
    public UUID getEventId() { return eventId; }

    @Override
    public LocalDateTime getOccurredAt() { return occurredAt; }

    @Override
    public String getAggregateId() { return aggregateId; }

    @Override
    public String getAggregateType() { return aggregateType; }

    @Override
    public String getTriggeredBy() { return triggeredBy; }

    @Override
    public String getCorrelationId() { return correlationId; }

    @Override
    public Map<String, Serializable> getMetadata() { return Map.copyOf(metadata); }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AbstractDomainEvent that = (AbstractDomainEvent) o;
        return Objects.equals(eventId, that.eventId);
    }

    @Override
    public int hashCode() { return Objects.hash(eventId); }

    @Override
    public String toString() {
        return String.format("%s{eventId=%s, aggregateId=%s, aggregateType=%s, occurredAt=%s}",
                getClass().getSimpleName(), eventId, aggregateId, aggregateType, occurredAt);
    }
}


