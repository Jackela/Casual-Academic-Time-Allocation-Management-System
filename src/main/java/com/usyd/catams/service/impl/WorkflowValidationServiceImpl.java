package com.usyd.catams.service.impl;

import com.usyd.catams.entity.Course;
import com.usyd.catams.entity.Timesheet;
import com.usyd.catams.entity.User;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.UserRole;
import com.usyd.catams.repository.CourseRepository;
import com.usyd.catams.service.WorkflowValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class WorkflowValidationServiceImpl implements WorkflowValidationService {

    @Autowired
    private CourseRepository courseRepository;

    @Override
    public void validateApprovalAction(User user, Timesheet timesheet, ApprovalAction action) {
        
        // Rule: General validation for any action
        if (user == null || timesheet == null || action == null) {
            throw new IllegalArgumentException("User, timesheet, and action must not be null.");
        }

        // Rule: Based on user role
        switch (user.getRole()) {
            case TUTOR:
                // Tutors can only submit for approval or request modification on their own timesheets
                if (action != ApprovalAction.SUBMIT_FOR_APPROVAL && action != ApprovalAction.REQUEST_MODIFICATION) {
                    throw new SecurityException("User role " + user.getRole() + " cannot perform action " + action);
                }
                if (!timesheet.getTutorId().equals(user.getId())) {
                    throw new SecurityException("Tutor can only act on their own timesheets.");
                }
                break;
            
            case LECTURER:
                // Lecturers can approve or reject timesheets for their courses
                if (action != ApprovalAction.APPROVE && action != ApprovalAction.REJECT && action != ApprovalAction.REQUEST_MODIFICATION) {
                     throw new SecurityException("User role " + user.getRole() + " cannot perform action " + action);
                }
                // Get the course to validate the lecturer owns it
                Course course = courseRepository.findById(timesheet.getCourseId())
                    .orElseThrow(() -> new IllegalArgumentException("Course not found for timesheet"));
                
                if (!course.getLecturerId().equals(user.getId())) {
                    throw new SecurityException("Lecturer can only act on timesheets for their own courses.");
                }
                break;

            case ADMIN:
                // Admins can perform any action on any timesheet
                break;
                
            default:
                throw new SecurityException("Unknown user role: " + user.getRole());
        }
    }
}
