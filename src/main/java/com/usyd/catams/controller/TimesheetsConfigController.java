package com.usyd.catams.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class TimesheetsConfigController {

    @GetMapping(path = "/api/timesheets/config", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> getUiConstraints() {
        Map<String, Object> root = new HashMap<>();

        Map<String, Object> hours = new HashMap<>();
        hours.put("min", 0.1d);
        hours.put("max", 10.0d);
        hours.put("step", 0.1d);

        Map<String, Object> weekStart = new HashMap<>();
        weekStart.put("mondayOnly", true);

        root.put("hours", hours);
        root.put("weekStart", weekStart);
        root.put("currency", "AUD");

        return root;
    }
}

