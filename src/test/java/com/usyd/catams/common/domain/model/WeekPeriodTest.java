package com.usyd.catams.common.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.*;

import static org.assertj.core.api.Assertions.assertThat;

class WeekPeriodTest {

    @Test
    @DisplayName("isCurrentWeek/isPast/isFuture honor provided Clock")
    void clockAwarePredicates() {
        // Week starting Monday 2025-08-11
        LocalDate monday = LocalDate.of(2025, 8, 11);
        WeekPeriod wp = WeekPeriod.startingOn(monday);

        // Fix clock to Tuesday in that same week
        Clock tuesdayClock = Clock.fixed(Instant.parse("2025-08-12T00:00:00Z"), ZoneOffset.UTC);
        assertThat(wp.isCurrentWeek(tuesdayClock)).isTrue();
        assertThat(wp.isPast(tuesdayClock)).isFalse();
        assertThat(wp.isFuture(tuesdayClock)).isFalse();

        // Fix clock to Wednesday next week -> past
        Clock nextWeekClock = Clock.fixed(Instant.parse("2025-08-20T00:00:00Z"), ZoneOffset.UTC);
        assertThat(wp.isCurrentWeek(nextWeekClock)).isFalse();
        assertThat(wp.isPast(nextWeekClock)).isTrue();
        assertThat(wp.isFuture(nextWeekClock)).isFalse();

        // Fix clock to previous week -> future relative to that time
        Clock prevWeekClock = Clock.fixed(Instant.parse("2025-08-05T00:00:00Z"), ZoneOffset.UTC);
        assertThat(wp.isFuture(prevWeekClock)).isTrue();
        assertThat(wp.isCurrentWeek(prevWeekClock)).isFalse();
    }
}

