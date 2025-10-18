package com.usyd.catams.application;

import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.service.Schedule1CalculationResult;
import com.usyd.catams.service.TimesheetService;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Facade interface exposing the public Timesheet application operations.
 *
 * <p>This abstraction allows controllers and other application layers
 * to depend on a stable contract while the underlying implementation is
 * refactored into smaller services.</p>
 */
public interface TimesheetApplicationFacade extends TimesheetService {

    TimesheetResponse createTimesheetAndReturnDto(Long tutorId,
                                                  Long courseId,
                                                  LocalDate weekStartDate,
                                                  Schedule1CalculationResult calculation,
                                                  TimesheetTaskType taskType,
                                                  String description,
                                                  Long creatorId);

    PagedTimesheetResponse getTimesheetsAsDto(Long tutorId,
                                              Long courseId,
                                              ApprovalStatus status,
                                              Long requesterId,
                                              Pageable pageable);

    Optional<TimesheetResponse> getTimesheetByIdAsDto(Long id, Long requesterId);

    TimesheetResponse updateTimesheetAndReturnDto(Long timesheetId,
                                                  Schedule1CalculationResult calculation,
                                                  TimesheetTaskType taskType,
                                                  String description,
                                                  Long requesterId);

    PagedTimesheetResponse getTimesheetsByTutorAsDto(Long tutorId, Pageable pageable);

    PagedTimesheetResponse getPendingApprovalTimesheetsAsDto(Long requesterId, Pageable pageable);

    PagedTimesheetResponse getLecturerFinalApprovalQueueAsDto(Long requesterId, Pageable pageable);
}
