package com.usyd.catams.common.infrastructure.event;

import com.usyd.catams.common.domain.event.DomainEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Domain Event Publisher with dual-mode capability
 * 
 * This publisher supports both synchronous and asynchronous event publishing,
 * with the ability to switch between monolith mode (Spring ApplicationEventPublisher)
 * and microservices mode (message queue publishing) through configuration.
 * 
 * Current Implementation:
 * - Monolith Mode: Uses Spring's ApplicationEventPublisher for in-process events
 * - Future Microservices Mode: Will integrate with message queues (RabbitMQ, Kafka)
 * 
 * Design Features:
 * - Dual publishing modes (sync/async)
 * - Event filtering and routing
 * - Error handling and retry logic
 * - Event serialization for external publishing
 * - Correlation ID propagation
 * - Event audit logging
 * 
 * @author Development Team
 * @since 2.0 - Microservices-Ready Architecture
 */
@Service
public class DomainEventPublisher {
    
    private static final Logger logger = LoggerFactory.getLogger(DomainEventPublisher.class);
    
    private final ApplicationEventPublisher applicationEventPublisher;
    private final EventPublishingConfiguration config;
    
    public DomainEventPublisher(ApplicationEventPublisher applicationEventPublisher,
                               EventPublishingConfiguration config) {
        this.applicationEventPublisher = applicationEventPublisher;
        this.config = config;
    }
    
    /**
     * Publish a single domain event synchronously
     * 
     * @param event The domain event to publish
     * @throws EventPublishingException if publishing fails
     */
    public void publish(DomainEvent event) {
        if (event == null) {
            logger.warn("Attempted to publish null event");
            return;
        }
        
        try {
            logEventPublishing(event);
            
            if (shouldPublishEvent(event)) {
                if (config.isMonolithMode()) {
                    publishToSpringContext(event);
                } else {
                    publishToMessageQueue(event);
                }
                
                logEventPublished(event);
            } else {
                logger.debug("Event filtered out: {} {}", event.getEventType(), event.getEventId());
            }
            
        } catch (Exception e) {
            logger.error("Failed to publish event: {} {}", event.getEventType(), event.getEventId(), e);
            throw new EventPublishingException("Failed to publish event: " + event.getEventId(), e);
        }
    }
    
    /**
     * Publish a single domain event asynchronously
     * 
     * @param event The domain event to publish
     * @return CompletableFuture that completes when publishing is done
     */
    public CompletableFuture<Void> publishAsync(DomainEvent event) {
        return CompletableFuture.runAsync(() -> publish(event));
    }
    
    /**
     * Publish multiple domain events synchronously
     * 
     * @param events List of domain events to publish
     * @throws EventPublishingException if any publishing fails
     */
    public void publishAll(List<DomainEvent> events) {
        if (events == null || events.isEmpty()) {
            return;
        }
        
        logger.info("Publishing {} events", events.size());
        
        for (DomainEvent event : events) {
            publish(event);
        }
        
        logger.info("Successfully published {} events", events.size());
    }
    
    /**
     * Publish multiple domain events asynchronously
     * 
     * @param events List of domain events to publish
     * @return CompletableFuture that completes when all publishing is done
     */
    public CompletableFuture<Void> publishAllAsync(List<DomainEvent> events) {
        if (events == null || events.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }
        
        CompletableFuture<?>[] futures = events.stream()
            .map(this::publishAsync)
            .toArray(CompletableFuture[]::new);
            
        return CompletableFuture.allOf(futures);
    }
    
    /**
     * Publish event with retry logic
     * 
     * @param event The domain event to publish
     * @param maxRetries Maximum number of retry attempts
     * @return true if publishing succeeded, false otherwise
     */
    public boolean publishWithRetry(DomainEvent event, int maxRetries) {
        int attempts = 0;
        Exception lastException = null;
        
        while (attempts <= maxRetries) {
            try {
                publish(event);
                return true;
                
            } catch (Exception e) {
                lastException = e;
                attempts++;
                
                if (attempts <= maxRetries) {
                    long delay = calculateRetryDelay(attempts);
                    logger.warn("Publishing attempt {} failed for event {}, retrying in {}ms", 
                        attempts, event.getEventId(), delay, e);
                    
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    logger.error("All {} publishing attempts failed for event {}", 
                        maxRetries + 1, event.getEventId(), lastException);
                }
            }
        }
        
        return false;
    }
    
    // =================== Internal Publishing Methods ===================
    
    /**
     * Publish event to Spring application context (monolith mode)
     */
    private void publishToSpringContext(DomainEvent event) {
        applicationEventPublisher.publishEvent(event);
        logger.debug("Published event to Spring context: {} {}", 
            event.getEventType(), event.getEventId());
    }
    
    /**
     * Publish event to external message queue (microservices mode)
     * This is a placeholder for future microservices implementation
     */
    private void publishToMessageQueue(DomainEvent event) {
        // TODO: Implement message queue publishing (RabbitMQ, Kafka, etc.)
        // This would include:
        // 1. Serialize event to JSON
        // 2. Determine routing key based on event type
        // 3. Publish to appropriate exchange/topic
        // 4. Handle publishing confirmation
        
        logger.warn("Message queue publishing not yet implemented for event: {} {}", 
            event.getEventType(), event.getEventId());
            
        // For now, fallback to Spring context
        publishToSpringContext(event);
    }
    
    // =================== Event Filtering and Validation ===================
    
    /**
     * Check if event should be published based on configuration and filters
     */
    private boolean shouldPublishEvent(DomainEvent event) {
        // Check if event is publishable
        if (!event.isPublishable()) {
            return false;
        }
        
        // Check event type filters
        if (config.hasEventTypeFilters() && !config.isEventTypeAllowed(event.getEventType())) {
            return false;
        }
        
        // Check aggregate type filters
        if (config.hasAggregateTypeFilters() && !config.isAggregateTypeAllowed(event.getAggregateType())) {
            return false;
        }
        
        // Additional business logic filters can be added here
        
        return true;
    }
    
    // =================== Logging and Monitoring ===================
    
    private void logEventPublishing(DomainEvent event) {
        logger.info("Publishing event: type={}, aggregateId={}, eventId={}, correlationId={}", 
            event.getEventType(), event.getAggregateId(), event.getEventId(), event.getCorrelationId());
    }
    
    private void logEventPublished(DomainEvent event) {
        logger.debug("Successfully published event: {} {}", 
            event.getEventType(), event.getEventId());
    }
    
    // =================== Utility Methods ===================
    
    /**
     * Calculate exponential backoff delay for retry attempts
     */
    private long calculateRetryDelay(int attempt) {
        return Math.min(1000L * (1L << (attempt - 1)), 10000L); // Max 10 seconds
    }
    
    // =================== Configuration Methods ===================
    
    /**
     * Check if publisher is in monolith mode
     */
    public boolean isMonolithMode() {
        return config.isMonolithMode();
    }
    
    /**
     * Check if async publishing is enabled
     */
    public boolean isAsyncEnabled() {
        return config.isAsyncEnabled();
    }
    
    /**
     * Get current publishing statistics
     */
    public EventPublishingStats getStats() {
        return config.getStats();
    }
}

/**
 * Exception thrown when event publishing fails
 */
class EventPublishingException extends RuntimeException {
    
    public EventPublishingException(String message) {
        super(message);
    }
    
    public EventPublishingException(String message, Throwable cause) {
        super(message, cause);
    }
}

/**
 * Configuration for event publishing behavior
 */
@Service
class EventPublishingConfiguration {
    
    private boolean monolithMode = true; // Default to monolith mode
    private boolean asyncEnabled = true;
    private java.util.Set<String> allowedEventTypes = java.util.Collections.emptySet();
    private java.util.Set<String> allowedAggregateTypes = java.util.Collections.emptySet();
    private final EventPublishingStats stats = new EventPublishingStats();
    
    public boolean isMonolithMode() { return monolithMode; }
    public void setMonolithMode(boolean monolithMode) { this.monolithMode = monolithMode; }
    
    public boolean isAsyncEnabled() { return asyncEnabled; }
    public void setAsyncEnabled(boolean asyncEnabled) { this.asyncEnabled = asyncEnabled; }
    
    public boolean hasEventTypeFilters() { return !allowedEventTypes.isEmpty(); }
    public boolean isEventTypeAllowed(String eventType) { 
        return allowedEventTypes.isEmpty() || allowedEventTypes.contains(eventType); 
    }
    public void setAllowedEventTypes(java.util.Set<String> allowedEventTypes) { 
        this.allowedEventTypes = allowedEventTypes; 
    }
    
    public boolean hasAggregateTypeFilters() { return !allowedAggregateTypes.isEmpty(); }
    public boolean isAggregateTypeAllowed(String aggregateType) { 
        return allowedAggregateTypes.isEmpty() || allowedAggregateTypes.contains(aggregateType); 
    }
    public void setAllowedAggregateTypes(java.util.Set<String> allowedAggregateTypes) { 
        this.allowedAggregateTypes = allowedAggregateTypes; 
    }
    
    public EventPublishingStats getStats() { return stats; }
}

/**
 * Statistics for event publishing
 */
class EventPublishingStats {
    private long totalEventsPublished = 0;
    private long totalEventsFailed = 0;
    private long totalEventsFiltered = 0;
    
    public void incrementPublished() { totalEventsPublished++; }
    public void incrementFailed() { totalEventsFailed++; }
    public void incrementFiltered() { totalEventsFiltered++; }
    
    public long getTotalEventsPublished() { return totalEventsPublished; }
    public long getTotalEventsFailed() { return totalEventsFailed; }
    public long getTotalEventsFiltered() { return totalEventsFiltered; }
    
    public double getSuccessRate() {
        long total = totalEventsPublished + totalEventsFailed;
        return total > 0 ? (double) totalEventsPublished / total : 0.0;
    }
}