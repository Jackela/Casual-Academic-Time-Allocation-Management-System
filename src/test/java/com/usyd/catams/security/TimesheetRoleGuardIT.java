package com.usyd.catams.security;

import com.usyd.catams.enums.TimesheetTaskType;
import com.usyd.catams.enums.TutorQualification;
import com.usyd.catams.integration.IntegrationTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ensures role guard-rails: Tutor cannot create timesheets (ADMIN/LECTURER only).
 */
class TimesheetRoleGuardIT extends IntegrationTestBase {

    @Test
    @DisplayName("Tutor cannot create timesheet (403)")
    void tutorCannotCreateTimesheet() throws Exception {
        seedTestUsers();
        // Minimal valid payload
        String monday = LocalDate.of(2025, 8, 11).toString();
        String payload = "{" +
                "\"tutorId\":2," +
                "\"courseId\":1," +
                "\"weekStartDate\":\"" + monday + "\"," +
                "\"description\":\"Test\"," +
                "\"taskType\":\"" + TimesheetTaskType.TUTORIAL.name() + "\"," +
                "\"qualification\":\"" + TutorQualification.STANDARD.name() + "\"," +
                "\"deliveryHours\":1.0," +
                "\"sessionDate\":\"" + monday + "\"" +
                "}";

        mockMvc.perform(post("/api/timesheets")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", tutorToken)
                .content(payload))
            .andExpect(status().is4xxClientError());
    }
}
