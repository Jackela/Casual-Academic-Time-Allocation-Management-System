package com.usyd.catams.service.impl;

import com.usyd.catams.dto.TimesheetSummaryData;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    TimesheetRepository timesheetRepository;

    @Mock
    CourseRepository courseRepository;

    @Test
    @DisplayName("Tutor workload analysis uses Clock-based current week boundaries")
    void tutorWorkloadUsesClock() {
        // Clock fixed to Wednesday 2025-08-13; Monday is 2025-08-11
        Clock fixed = Clock.fixed(Instant.parse("2025-08-13T00:00:00Z"), ZoneOffset.UTC);

        // Stub repository summary calls to avoid NPEs
        when(timesheetRepository.findTimesheetSummaryByTutor(any(), any(), any()))
                .thenReturn(new TimesheetSummaryData(0L, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, 0L));

        DashboardServiceImpl svc = new DashboardServiceImpl(timesheetRepository, courseRepository, fixed);

        LocalDate start = LocalDate.of(2025, 8, 1);
        LocalDate end = LocalDate.of(2025, 8, 31);

        svc.getDashboardSummary(2L, UserRole.TUTOR, Optional.empty(), start, end);

        // Capture one of the current-week summary calls
        ArgumentCaptor<Long> tutorIdCap = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<LocalDate> startCap = ArgumentCaptor.forClass(LocalDate.class);
        ArgumentCaptor<LocalDate> endCap = ArgumentCaptor.forClass(LocalDate.class);

        verify(timesheetRepository, atLeastOnce())
                .findTimesheetSummaryByTutor(tutorIdCap.capture(), startCap.capture(), endCap.capture());

        // Verify at least one call used the Clock-derived Monday 2025-08-11 and Sunday 2025-08-17
        LocalDate expectedStart = LocalDate.of(2025, 8, 11);
        LocalDate expectedEnd = LocalDate.of(2025, 8, 17);
        boolean found = false;
        for (int i = 0; i < startCap.getAllValues().size(); i++) {
            if (expectedStart.equals(startCap.getAllValues().get(i)) && expectedEnd.equals(endCap.getAllValues().get(i))) {
                found = true;
                break;
            }
        }
        assertThat(found).isTrue();
    }
}

