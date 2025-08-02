package com.usyd.catams.mapper;

import com.usyd.catams.dto.response.PagedTimesheetResponse;
import com.usyd.catams.dto.response.TimesheetResponse;
import com.usyd.catams.entity.Timesheet;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper utility for converting between Timesheet entities and DTOs.
 * 
 * This mapper handles the conversion logic between domain entities
 * and API response DTOs, ensuring proper data transformation.
 */
@Component
public class TimesheetMapper {

    /**
     * Convert a Timesheet entity to TimesheetResponse DTO.
     * 
     * @param timesheet the timesheet entity
     * @return the response DTO
     */
    public TimesheetResponse toResponse(Timesheet timesheet) {
        if (timesheet == null) {
            return null;
        }

        return new TimesheetResponse(
            timesheet.getId(),
            timesheet.getTutorId(),
            timesheet.getCourseId(),
            timesheet.getWeekStartDate(),
            timesheet.getHours(),
            timesheet.getHourlyRate(),
            timesheet.getDescription(),
            timesheet.getStatus(),
            timesheet.getCreatedAt(),
            timesheet.getUpdatedAt(),
            timesheet.getCreatedBy()
        );
    }

    /**
     * Convert a list of Timesheet entities to TimesheetResponse DTOs.
     * 
     * @param timesheets the list of timesheet entities
     * @return the list of response DTOs
     */
    public List<TimesheetResponse> toResponseList(List<Timesheet> timesheets) {
        if (timesheets == null) {
            return null;
        }

        return timesheets.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Convert a Spring Data Page of Timesheet entities to PagedTimesheetResponse DTO.
     * 
     * @param page the Spring Data Page
     * @return the paginated response DTO
     */
    public PagedTimesheetResponse toPagedResponse(Page<Timesheet> page) {
        if (page == null) {
            return new PagedTimesheetResponse();
        }

        List<TimesheetResponse> content = toResponseList(page.getContent());

        return new PagedTimesheetResponse(
            content,
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isFirst(),
            page.isLast()
        );
    }

    /**
     * Create a minimal TimesheetResponse for cases where full entity data isn't available.
     * This is useful for summary responses or when certain fields should be filtered out.
     * 
     * @param id the timesheet ID
     * @param tutorId the tutor ID
     * @param courseId the course ID
     * @param weekStartDate the week start date
     * @param hours the hours worked
     * @param hourlyRate the hourly rate
     * @param status the approval status
     * @return the minimal response DTO
     */
    public TimesheetResponse toMinimalResponse(Long id, Long tutorId, Long courseId,
                                             java.time.LocalDate weekStartDate,
                                             java.math.BigDecimal hours,
                                             java.math.BigDecimal hourlyRate,
                                             com.usyd.catams.enums.ApprovalStatus status) {
        TimesheetResponse response = new TimesheetResponse();
        response.setId(id);
        response.setTutorId(tutorId);
        response.setCourseId(courseId);
        response.setWeekStartDate(weekStartDate);
        response.setHours(hours);
        response.setHourlyRate(hourlyRate);
        response.setStatus(status);
        
        // Calculate total pay
        if (hours != null && hourlyRate != null) {
            response.setTotalPay(hours.multiply(hourlyRate));
        }
        
        // Set computed fields based on status
        if (status != null) {
            response.setIsEditable(status.isEditable());
            response.setCanBeApproved(status.isPending());
        }

        return response;
    }

    /**
     * Update an existing TimesheetResponse with additional computed fields.
     * This is useful when you need to add calculated fields after initial mapping.
     * 
     * @param response the response to update
     * @return the updated response
     */
    public TimesheetResponse enrichResponse(TimesheetResponse response) {
        if (response == null) {
            return null;
        }

        // Recalculate computed fields
        if (response.getHours() != null && response.getHourlyRate() != null) {
            response.setTotalPay(response.getHours().multiply(response.getHourlyRate()));
        }

        if (response.getStatus() != null) {
            response.setIsEditable(response.getStatus().isEditable());
            response.setCanBeApproved(response.getStatus().isPending());
        }

        return response;
    }
}