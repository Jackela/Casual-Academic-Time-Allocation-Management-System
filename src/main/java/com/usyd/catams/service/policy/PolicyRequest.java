package com.usyd.catams.service.policy;

import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.service.Schedule1PolicyProvider;

import java.time.LocalDate;

/**
 * Request object for policy resolution.
 * 
 * Encapsulates all parameters needed to resolve a rate policy.
 * 
 * @param rateCode the rate code to look up
 * @param qualification the tutor qualification
 * @param sessionDate the session date for effective date lookup
 * 
 * @author Development Team
 * @since 1.0
 */
public record PolicyRequest(
    String rateCode,
    TutorQualification qualification,
    LocalDate sessionDate
) {
    /**
     * Create a request with qualification defaulting to STANDARD if null.
     */
    public PolicyRequest {
        if (qualification == null) {
            qualification = TutorQualification.STANDARD;
        }
    }
}
