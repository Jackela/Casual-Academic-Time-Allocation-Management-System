package com.usyd.catams.controller;

import com.usyd.catams.dto.response.TimesheetsConfigResponse;
import com.usyd.catams.service.TimesheetsConfigService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/timesheets", produces = MediaType.APPLICATION_JSON_VALUE)
public class TimesheetsConfigController {

    private final TimesheetsConfigService service;

    public TimesheetsConfigController(TimesheetsConfigService service) {
        this.service = service;
    }

    @GetMapping("/config")
    public TimesheetsConfigResponse getConfig() {
        return service.getUiConstraints();
    }
}

