package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;
import org.springframework.security.core.Authentication;

public interface TimesheetAuthorizationService {

    boolean canUserModifyTimesheet(Timesheet timesheet, Long requesterId);

    boolean canUserEditTimesheet(Long timesheetId, Long requesterId);

    boolean canUserEditTimesheetAuth(Long timesheetId, Authentication authentication);
}
