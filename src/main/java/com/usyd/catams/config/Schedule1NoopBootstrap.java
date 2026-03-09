package com.usyd.catams.config;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * No-op bootstrap marker for non-test profiles.
 */
@Component("schedule1TestBootstrap")
@Profile("!test")
public class Schedule1NoopBootstrap {
}
