package com.usyd.catams.dto.request;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class TimesheetCreateRequestTest {

    @Test
    @DisplayName("isWeekStartDateMonday returns true only for Monday")
    void isWeekStartDateMonday() {
        LocalDate monday = LocalDate.of(2025, 8, 11); // Monday
        LocalDate tuesday = monday.plusDays(1);

        TimesheetCreateRequest reqMon = new TimesheetCreateRequest(2L, 1L, monday,
                new BigDecimal("1.0"), "desc");
        TimesheetCreateRequest reqTue = new TimesheetCreateRequest(2L, 1L, tuesday,
                new BigDecimal("1.0"), "desc");

        assertThat(monday.getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(reqMon.isWeekStartDateMonday()).isTrue();
        assertThat(reqTue.isWeekStartDateMonday()).isFalse();
    }
}

