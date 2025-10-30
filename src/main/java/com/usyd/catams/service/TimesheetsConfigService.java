package com.usyd.catams.service;

import com.usyd.catams.dto.response.TimesheetsConfigResponse;
import org.springframework.stereotype.Service;

@Service
public class TimesheetsConfigService {

    // Default policy aligned to Schedule 1 validation used by quote/create
    private static final double HOURS_MIN = 0.1;
    private static final double HOURS_MAX = 10.0;
    private static final double HOURS_STEP = 0.1; // one decimal precision
    private static final boolean MONDAY_ONLY = true;
    private static final String CURRENCY = "AUD";

    public TimesheetsConfigResponse getUiConstraints() {
        TimesheetsConfigResponse.Hours hours = new TimesheetsConfigResponse.Hours(HOURS_MIN, HOURS_MAX, HOURS_STEP);
        TimesheetsConfigResponse.WeekStart week = new TimesheetsConfigResponse.WeekStart(MONDAY_ONLY);
        return new TimesheetsConfigResponse(hours, week, CURRENCY);
    }
}

