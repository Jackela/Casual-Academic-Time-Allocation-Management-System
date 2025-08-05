package com.usyd.catams.service.impl;

import com.usyd.catams.application.ApprovalApplicationService;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.service.ApprovalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Legacy implementation of ApprovalService that delegates to ApprovalApplicationService.
 * 
 * This class serves as a bridge during the DDD refactoring transition.
 * Controllers and other services that still reference ApprovalServiceImpl
 * will continue to work while we gradually migrate to direct usage of
 * ApprovalApplicationService in the application layer.
 * 
 * @deprecated Use ApprovalApplicationService directly instead
 */
@Service
@Primary
@Deprecated
public class ApprovalServiceImpl implements ApprovalService {

    private final ApprovalApplicationService approvalApplicationService;

    @Autowired
    public ApprovalServiceImpl(ApprovalApplicationService approvalApplicationService) {
        this.approvalApplicationService = approvalApplicationService;
    }

    @Override
    public Approval submitForApproval(Long timesheetId, String comment, Long requesterId) {
        return approvalApplicationService.submitForApproval(timesheetId, comment, requesterId);
    }

    @Override
    public Approval performApprovalAction(Long timesheetId, ApprovalAction action, String comment, Long requesterId) {
        return approvalApplicationService.performApprovalAction(timesheetId, action, comment, requesterId);
    }

    @Override
    public List<Approval> getApprovalHistory(Long timesheetId, Long requesterId) {
        return approvalApplicationService.getApprovalHistory(timesheetId, requesterId);
    }

    @Override
    public List<Timesheet> getPendingApprovalsForUser(Long approverId) {
        return approvalApplicationService.getPendingApprovalsForUser(approverId);
    }

    @Override
    public boolean canUserPerformAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        return approvalApplicationService.canUserPerformAction(timesheet, action, requesterId);
    }

    @Override
    public ApprovalStatus getCurrentApprovalStatus(Long timesheetId) {
        return approvalApplicationService.getCurrentApprovalStatus(timesheetId);
    }

    @Override
    public void validateApprovalAction(Timesheet timesheet, ApprovalAction action, Long requesterId) {
        approvalApplicationService.validateApprovalAction(timesheet, action, requesterId);
    }

    @Override
    public List<Object[]> getApprovalStatistics(Long approverId, Long requesterId) {
        return approvalApplicationService.getApprovalStatistics(approverId, requesterId);
    }
}