package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.TimesheetTaskType;
import java.math.BigDecimal;
import java.time.LocalDate;

public interface TimesheetCommandService {

    Timesheet createTimesheet(Long tutorId,
                              Long courseId,
                              LocalDate weekStartDate,
                              Schedule1CalculationResult calculation,
                              TimesheetTaskType taskType,
                              String description,
                              Long creatorId);

    String validateTimesheetCreation(Long tutorId,
                                     Long courseId,
                                     LocalDate weekStartDate,
                                     BigDecimal hours,
                                     BigDecimal hourlyRate,
                                     String description,
                                     Long creatorId);

    Timesheet updateTimesheet(Long timesheetId,
                              Schedule1CalculationResult calculation,
                              TimesheetTaskType taskType,
                              String description,
                              Long requesterId);

    void deleteTimesheet(Long timesheetId, Long requesterId);
}
