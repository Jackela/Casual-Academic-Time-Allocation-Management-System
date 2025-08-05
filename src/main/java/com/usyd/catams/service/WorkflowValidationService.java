package com.usyd.catams.service;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;

/**
 * Service interface for validating workflow actions.
 * This service provides methods to check if a user is authorized to perform
 * a specific approval action on a timesheet based on business rules.
 */
public interface WorkflowValidationService {

    /**
     * Validates if a user is authorized to perform a specific approval action on a timesheet.
     *
     * @param user      The user performing the action.
     * @param timesheet The timesheet on which the action is being performed.
     * @param action    The approval action to be validated.
     * @throws SecurityException if the user is not authorized to perform the action.
     */
    void validateApprovalAction(User user, Timesheet timesheet, ApprovalAction action);
}
