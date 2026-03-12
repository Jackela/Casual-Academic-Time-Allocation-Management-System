package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;

public interface TimesheetAuthorizationService {

    boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId);

    boolean canUserEditTimesheet(Long timesheetId, Long requesterId);
}
