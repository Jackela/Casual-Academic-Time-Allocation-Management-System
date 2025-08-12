package com.usyd.catams.mapper;

import com.usyd.catams.dto.response.ApprovalActionResponse;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.User;
import com.usyd.catams.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Mapper for approval DTO conversions.
 */
@Component
public class ApprovalMapper {

    private final UserRepository userRepository;

    public ApprovalMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Convert Approval to ApprovalActionResponse with enriched fields.
     */
    public ApprovalActionResponse toResponse(Approval approval) {
        if (approval == null) return null;
        User approver = userRepository.findById(approval.getApproverId()).orElse(null);
        String approverName = approver != null ? approver.getName() : "Unknown User";
        String responseComment = approval.getAction() == com.usyd.catams.enums.ApprovalAction.SUBMIT_FOR_APPROVAL
                ? null : approval.getComment();
        ApprovalActionResponse response = new ApprovalActionResponse(
                approval.getTimesheetId(),
                approval.getAction(),
                approval.getNewStatus(),
                approval.getApproverId(),
                approverName,
                responseComment,
                approval.getTimestamp() == null ? java.time.LocalDateTime.now() : approval.getTimestamp()
        );
        response.setNextSteps(ApprovalActionResponse.generateNextStepsForStatus(approval.getNewStatus()));
        return response;
    }
}
