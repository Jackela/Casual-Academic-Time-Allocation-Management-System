package com.usyd.catams.workflow;

import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import com.usyd.catams.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("e2e-local")
public class ModificationRequestedWorkflowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private TimesheetRepository timesheetRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testModificationRequestedWorkflow() throws Exception {
        var lecturerUser = userRepository.findByEmail("lecturer@example.com").orElseThrow();
        var tutorUser = userRepository.findByEmail("tutor@example.com").orElseThrow();

        String lecturerToken = jwtTokenProvider.generateToken(lecturerUser.getId(), lecturerUser.getEmail(), lecturerUser.getRole().name());
        String tutorToken = jwtTokenProvider.generateToken(tutorUser.getId(), tutorUser.getEmail(), tutorUser.getRole().name());

        // STEP 1: Lecturer views pending approvals
        System.out.println("\n=== STEP 1: Lecturer views TUTOR_CONFIRMED timesheets ===");
        MvcResult lecturerList = mockMvc.perform(get("/api/timesheets/pending-final-approval")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isOk())
                .andReturn();

        String lecturerResponse = lecturerList.getResponse().getContentAsString();
        System.out.println("Lecturer pending approvals response: " + lecturerResponse);
        assertThat(lecturerResponse).contains("TUTOR_CONFIRMED");

        // Find a TUTOR_CONFIRMED timesheet
        List<Timesheet> tutorConfirmedTimesheets = timesheetRepository.findAll().stream()
                .filter(ts -> ts.getStatus() == ApprovalStatus.TUTOR_CONFIRMED)
                .toList();
        assertThat(tutorConfirmedTimesheets).isNotEmpty();
        Timesheet targetTimesheet = tutorConfirmedTimesheets.get(0);
        Long timesheetId = targetTimesheet.getId();

        System.out.println("✅ Found TUTOR_CONFIRMED timesheet ID: " + timesheetId);
        System.out.println("   Description: " + targetTimesheet.getDescription());
        System.out.println("   Course ID: " + targetTimesheet.getCourseId());

        // STEP 2: Lecturer requests modification
        System.out.println("\n=== STEP 2: Lecturer clicks 'Request Changes' button ===");
        String requestModificationPayload = """
                {
                    "action": "REQUEST_MODIFICATION",
                    "timesheetId": %d,
                    "comment": "Please clarify the description and provide more details about the hours breakdown."
                }
                """.formatted(timesheetId);

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + lecturerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestModificationPayload))
                .andExpect(status().isOk());

        System.out.println("✅ POST /api/approvals returned 200 OK");

        // STEP 3: Verify status changed to MODIFICATION_REQUESTED
        System.out.println("\n=== STEP 3: Verify timesheet status changed ===");
        Timesheet updatedTimesheet = timesheetRepository.findById(timesheetId).orElseThrow();
        assertThat(updatedTimesheet.getStatus()).isEqualTo(ApprovalStatus.MODIFICATION_REQUESTED);
        System.out.println("✅ Status changed to: " + updatedTimesheet.getStatus());

        // STEP 4: Verify timesheet disappeared from Lecturer's pending list
        System.out.println("\n=== STEP 4: Verify timesheet disappeared from Lecturer's pending list ===");
        MvcResult lecturerListAfter = mockMvc.perform(get("/api/timesheets/pending-final-approval")
                        .header("Authorization", "Bearer " + lecturerToken))
                .andExpect(status().isOk())
                .andReturn();

        String lecturerResponseAfter = lecturerListAfter.getResponse().getContentAsString();
        assertThat(lecturerResponseAfter).doesNotContain("\"id\":" + timesheetId);
        System.out.println("✅ Timesheet removed from Lecturer's pending list");

        // STEP 5: Tutor views their pending confirmations
        System.out.println("\n=== STEP 5: Tutor logs in and checks their list ===");
        MvcResult tutorList = mockMvc.perform(get("/api/timesheets")
                        .header("Authorization", "Bearer " + tutorToken))
                .andExpect(status().isOk())
                .andReturn();

        String tutorResponse = tutorList.getResponse().getContentAsString();
        System.out.println("Tutor timesheets response: " + tutorResponse);
        assertThat(tutorResponse).contains("MODIFICATION_REQUESTED");
        assertThat(tutorResponse).contains("\"id\":" + timesheetId);
        System.out.println("✅ Timesheet appears in Tutor's list with MODIFICATION_REQUESTED status");

        // STEP 6: Tutor resubmits for approval
        System.out.println("\n=== STEP 6: Tutor clicks 'Submit' button to resubmit ===");
        String submitForApprovalPayload = """
                {
                    "action": "SUBMIT_FOR_APPROVAL",
                    "timesheetId": %d,
                    "comment": "Updated description with detailed hours breakdown as requested."
                }
                """.formatted(timesheetId);

        mockMvc.perform(post("/api/approvals")
                        .header("Authorization", "Bearer " + tutorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submitForApprovalPayload))
                .andExpect(status().isOk());

        System.out.println("✅ POST /api/approvals returned 200 OK");

        // STEP 7: Verify status changed back to PENDING_TUTOR_CONFIRMATION
        System.out.println("\n=== STEP 7: Verify status transitioned back to PENDING_TUTOR_CONFIRMATION ===");
        Timesheet finalTimesheet = timesheetRepository.findById(timesheetId).orElseThrow();
        assertThat(finalTimesheet.getStatus()).isEqualTo(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        System.out.println("✅ Final status: " + finalTimesheet.getStatus());

        // SUMMARY
        System.out.println("\n" + "=".repeat(60));
        System.out.println("MODIFICATION_REQUESTED WORKFLOW AUDIT COMPLETE");
        System.out.println("=".repeat(60));
        System.out.println("✅ TUTOR_CONFIRMED → MODIFICATION_REQUESTED: SUCCESS");
        System.out.println("✅ MODIFICATION_REQUESTED → PENDING_TUTOR_CONFIRMATION: SUCCESS");
        System.out.println("✅ Lecturer UI: Timesheet removed from pending list");
        System.out.println("✅ Tutor UI: Timesheet appears with MODIFICATION_REQUESTED");
        System.out.println("✅ Tutor Action: Submit button transitions back to PENDING");
        System.out.println("=".repeat(60));
    }
}
