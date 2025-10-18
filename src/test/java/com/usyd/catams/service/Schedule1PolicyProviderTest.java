package com.usyd.catams.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TDD placeholder: defines the contract for Schedule1PolicyProvider.
 * This test intentionally references the yet-to-be-created provider so the build goes red.
 */
class Schedule1PolicyProviderTest {

    @Test
    void shouldResolvePolicyForTutorials() {
        Schedule1PolicyProvider provider = new Schedule1PolicyProvider(null, null);

        assertThat(provider).isNotNull();
    }
}
