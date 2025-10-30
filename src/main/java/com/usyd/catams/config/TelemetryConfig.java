package com.usyd.catams.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.sdk.autoconfigure.AutoConfiguredOpenTelemetrySdk;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Initializes OpenTelemetry for the application and ensures trace/span identifiers reach log output.
 */
@Configuration
public class TelemetryConfig {

    public static final String TRACE_ID_REQUEST_ATTRIBUTE = "catams.traceId";
    public static final String SPAN_ID_REQUEST_ATTRIBUTE = "catams.spanId";

    @Bean
    @ConditionalOnMissingBean(OpenTelemetry.class)
    public OpenTelemetry openTelemetry() {
        return AutoConfiguredOpenTelemetrySdk.builder()
            .build()
            .getOpenTelemetrySdk();
    }

    @Bean
    public FilterRegistrationBean<TracePropagationFilter> tracePropagationFilter() {
        FilterRegistrationBean<TracePropagationFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new TracePropagationFilter());
        // Run late in the chain so upstream tracing instrumentation can populate the span first.
        registration.setOrder(Ordered.LOWEST_PRECEDENCE - 10);
        return registration;
    }

    static class TracePropagationFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

            SpanContext context = Span.current().getSpanContext();
            String traceId = context.isValid() ? context.getTraceId() : request.getHeader("X-Request-Id");
            if (!StringUtils.hasText(traceId)) {
                traceId = UUID.randomUUID().toString();
            }
            String spanId = context.isValid() ? context.getSpanId() : null;

            MDC.put("traceId", traceId);
            MDC.put("trace_id", traceId);
            if (StringUtils.hasText(spanId)) {
                MDC.put("spanId", spanId);
                MDC.put("span_id", spanId);
            }
            request.setAttribute(TRACE_ID_REQUEST_ATTRIBUTE, traceId);
            if (StringUtils.hasText(spanId)) {
                request.setAttribute(SPAN_ID_REQUEST_ATTRIBUTE, spanId);
            }

            try {
                filterChain.doFilter(request, response);
            } finally {
                MDC.remove("traceId");
                MDC.remove("trace_id");
                MDC.remove("spanId");
                MDC.remove("span_id");
            }
        }
    }
}
