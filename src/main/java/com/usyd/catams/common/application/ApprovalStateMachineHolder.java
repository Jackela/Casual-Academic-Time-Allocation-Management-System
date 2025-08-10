package com.usyd.catams.common.application;

import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;

/**
 * Lightweight static holder to expose canTransition for entity-level validation
 * without creating tight coupling to Spring-managed beans or using exceptions
 * for control flow inside entities.
 */
public final class ApprovalStateMachineHolder {
    private static final ApprovalStateMachine INSTANCE = new ApprovalStateMachine();

    private ApprovalStateMachineHolder() {}

    public static boolean canTransition(ApprovalStatus from, ApprovalAction action, ApprovalStatus to) {
        if (from == null || action == null || to == null) return false;
        if (!INSTANCE.canTransition(from, action)) return false;
        return INSTANCE.getNextStatus(from, action) == to;
    }
}



