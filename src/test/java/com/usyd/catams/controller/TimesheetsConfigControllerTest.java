package com.usyd.catams.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TimesheetsConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnUiConstraintsForTimesheets() throws Exception {
        mockMvc.perform(get("/api/timesheets/config").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.hours.min").value(0.1))
                .andExpect(jsonPath("$.hours.max").value(10.0))
                .andExpect(jsonPath("$.hours.step").value(0.1))
                .andExpect(jsonPath("$.weekStart.mondayOnly").value(true))
                .andExpect(jsonPath("$.currency").value("AUD"));
    }
}

