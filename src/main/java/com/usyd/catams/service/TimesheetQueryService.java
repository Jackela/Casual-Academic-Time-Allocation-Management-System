package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TimesheetQueryService {

    Page<Timesheet> getTimesheets(Long tutorId,
                                  Long courseId,
                                  ApprovalStatus status,
                                  Long requesterId,
                                  Pageable pageable);

    Optional<Timesheet> getTimesheetById(Long timesheetId, Long requesterId);

    List<Timesheet> getTimesheetsByTutorAndDateRange(Long tutorId,
                                                     LocalDate startDate,
                                                     LocalDate endDate,
                                                     Long requesterId);

    boolean timesheetExists(Long tutorId, Long courseId, LocalDate weekStartDate);

    BigDecimal calculateTotalPay(Timesheet timesheet);

    List<Timesheet> getPendingTimesheetsForApprover(Long approverId);

    BigDecimal getTotalHoursByTutorAndCourse(Long tutorId, Long courseId, Long requesterId);

    BigDecimal getTotalApprovedBudgetUsedByCourse(Long courseId, Long requesterId);

    Page<Timesheet> getPendingApprovalTimesheets(Long requesterId, Pageable pageable);

    Page<Timesheet> getTimesheetsByTutor(Long tutorId, Pageable pageable);

    Page<Timesheet> getLecturerFinalApprovalQueue(Long requesterId, Pageable pageable);

    boolean isTutorialRepeatEligible(Long courseId, LocalDate sessionDate);
}
