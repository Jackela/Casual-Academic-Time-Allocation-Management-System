package com.usyd.catams.application;

import com.usyd.catams.common.domain.event.TimesheetEvent;
import com.usyd.catams.common.infrastructure.event.DomainEventPublisher;
import com.usyd.catams.entity.Approval;
import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.repository.TimesheetRepository;
import com.usyd.catams.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for domain event publishing in ApprovalApplicationService.
 * 
 * @author Development Team
 * @since 1.0
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalApplicationService Event Publishing Tests")
class ApprovalApplicationServiceEventTest {

    @Mock
    private TimesheetRepository timesheetRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private CourseRepository courseRepository;
    
    @Mock
    private com.usyd.catams.domain.service.ApprovalDomainService approvalDomainService;
    
    @Mock
    private DomainEventPublisher eventPublisher;
    
    private ApprovalApplicationService service;
    
    @BeforeEach
    void setUp() {
        service = new ApprovalApplicationService(
            timesheetRepository, 
            userRepository, 
            courseRepository, 
            approvalDomainService,
            eventPublisher
        );
    }

    @Test
    @DisplayName("should publish TimesheetApprovalProcessedEvent when submitting for approval")
    void shouldPublishEventWhenSubmittingForApproval() {
        // Given
        Timesheet timesheet = createTimesheet(ApprovalStatus.DRAFT);
        User requester = createUser(1L, UserRole.TUTOR);
        Course course = createCourse();
        
        when(timesheetRepository.findById(1L)).thenReturn(Optional.of(timesheet));
        when(userRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        
        // When
        service.submitForApproval(1L, "Submitting for approval", 1L);
        
        // Then
        ArgumentCaptor<TimesheetEvent> eventCaptor = ArgumentCaptor.forClass(TimesheetEvent.class);
        verify(eventPublisher).publish(eventCaptor.capture());
        
        TimesheetEvent event = eventCaptor.getValue();
        assertThat(event).isInstanceOf(TimesheetEvent.TimesheetApprovalProcessedEvent.class);
        
        TimesheetEvent.TimesheetApprovalProcessedEvent approvalEvent = 
            (TimesheetEvent.TimesheetApprovalProcessedEvent) event;
        assertThat(approvalEvent.getAction()).isEqualTo(ApprovalAction.SUBMIT_FOR_APPROVAL);
        assertThat(approvalEvent.getPreviousStatus()).isEqualTo(ApprovalStatus.DRAFT);
    }

    @Test
    @DisplayName("should publish event when confirming by tutor")
    void shouldPublishEventWhenConfirmingByTutor() {
        // Given
        Timesheet timesheet = createTimesheet(ApprovalStatus.PENDING_TUTOR_CONFIRMATION);
        User requester = createUser(1L, UserRole.TUTOR);
        Course course = createCourse();
        
        when(timesheetRepository.findById(1L)).thenReturn(Optional.of(timesheet));
        when(userRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        
        // When
        service.performApprovalAction(1L, ApprovalAction.TUTOR_CONFIRM, "Confirmed", 1L);
        
        // Then
        verify(eventPublisher).publish(any(TimesheetEvent.TimesheetApprovalProcessedEvent.class));
    }

    @Test
    @DisplayName("should include all relevant data in published event")
    void shouldIncludeAllRelevantDataInPublishedEvent() {
        // Given
        Timesheet timesheet = createTimesheet(ApprovalStatus.DRAFT);
        User requester = createUser(1L, UserRole.TUTOR);
        Course course = createCourse();
        String comment = "Please review this timesheet";
        
        when(timesheetRepository.findById(1L)).thenReturn(Optional.of(timesheet));
        when(userRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        
        // When
        service.submitForApproval(1L, comment, 1L);
        
        // Then
        ArgumentCaptor<TimesheetEvent.TimesheetApprovalProcessedEvent> eventCaptor = 
            ArgumentCaptor.forClass(TimesheetEvent.TimesheetApprovalProcessedEvent.class);
        verify(eventPublisher).publish(eventCaptor.capture());
        
        TimesheetEvent.TimesheetApprovalProcessedEvent event = eventCaptor.getValue();
        assertThat(event.getAggregateId()).isEqualTo("1");
        assertThat(event.getTutorId()).isEqualTo(1L);
        assertThat(event.getCourseId()).isEqualTo(1L);
        assertThat(event.getApproverId()).isEqualTo(1L);
        assertThat(event.getComments()).isEqualTo(comment);
        assertThat(event.getAggregateType()).isEqualTo("TIMESHEET");
    }

    @Test
    @DisplayName("should not publish event when validation fails")
    void shouldNotPublishEventWhenValidationFails() {
        // Given
        when(timesheetRepository.findById(1L)).thenReturn(Optional.empty());
        
        // When/Then
        try {
            service.submitForApproval(1L, "test", 1L);
        } catch (Exception ignored) {
            // Expected
        }
        
        // Then
        verify(eventPublisher, never()).publish(any());
    }

    private Timesheet createTimesheet(ApprovalStatus status) {
        Timesheet timesheet = new Timesheet();
        timesheet.setId(1L);
        timesheet.setTutorId(1L);
        timesheet.setCourseId(1L);
        timesheet.setWeekStartDate(LocalDate.of(2024, 7, 8));
        timesheet.setStatus(status);
        timesheet.setDeliveryHours(BigDecimal.ONE);
        timesheet.setHourlyRate(new BigDecimal("50.00"));
        return timesheet;
    }
    
    private User createUser(Long id, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setName("Test User");
        return user;
    }
    
    private Course createCourse() {
        Course course = new Course();
        course.setId(1L);
        course.setName("Test Course");
        return course;
    }
}
