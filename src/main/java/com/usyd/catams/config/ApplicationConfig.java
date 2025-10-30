package com.usyd.catams.config;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.entity.Timesheet;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(TimesheetValidationProperties.class)
public class ApplicationConfig {
    public ApplicationConfig(TimesheetValidationProperties props) {
        // Bridge DI properties to entity static setter so existing domain helpers can access limits
        Timesheet.setValidationProperties(props);
        // Provide SSOT to validators that are not Spring-managed in tests
        com.usyd.catams.common.validation.ValidationSSOT.set(props);
    }
}


