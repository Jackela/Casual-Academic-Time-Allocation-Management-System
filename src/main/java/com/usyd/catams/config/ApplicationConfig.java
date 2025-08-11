package com.usyd.catams.config;

import com.usyd.catams.common.validation.TimesheetValidationProperties;
import com.usyd.catams.entity.Timesheet;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(TimesheetValidationProperties.class)
public class ApplicationConfig {
    public ApplicationConfig(TimesheetValidationProperties props) {
        // Bridge DI properties to entity static setter for legacy compatibility
        Timesheet.setValidationProperties(props);
    }
}


