package com.usyd.catams.repository;

import com.usyd.catams.entity.Approval;
import com.usyd.catams.enums.ApprovalAction;
import com.usyd.catams.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Approval entity operations.
 * 
 * Provides data access methods for managing approval actions and
 * retrieving approval history for timesheets.
 */
@Repository
public interface ApprovalRepository extends JpaRepository<Approval, Long> {
    
    /**
     * Find all approval actions for a specific timesheet, ordered by timestamp.
     * 
     * @param timesheetId the timesheet ID
     * @return list of approval actions for the timesheet
     */
    List<Approval> findByTimesheetIdOrderByTimestampAsc(Long timesheetId);
    
    /**
     * Find all active approval actions for a specific timesheet.
     * 
     * @param timesheetId the timesheet ID
     * @return list of active approval actions
     */
    List<Approval> findByTimesheetIdAndIsActiveTrueOrderByTimestampAsc(Long timesheetId);
    
    /**
     * Find all approval actions performed by a specific approver.
     * 
     * @param approverId the approver's ID
     * @return list of approval actions by the approver
     */
    List<Approval> findByApproverIdOrderByTimestampDesc(Long approverId);
    
    /**
     * Find the most recent approval action for a timesheet.
     * 
     * @param timesheetId the timesheet ID
     * @return the most recent approval action, if any
     */
    Optional<Approval> findFirstByTimesheetIdOrderByTimestampDesc(Long timesheetId);
    
    /**
     * Find approval actions of a specific type for a timesheet.
     * 
     * @param timesheetId the timesheet ID
     * @param action the approval action type
     * @return list of matching approval actions
     */
    List<Approval> findByTimesheetIdAndAction(Long timesheetId, ApprovalAction action);
    
    /**
     * Find approval actions within a date range.
     * 
     * @param startDate start of the date range
     * @param endDate end of the date range
     * @return list of approval actions in the date range
     */
    List<Approval> findByTimestampBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Check if a specific approval action exists for a timesheet.
     * 
     * @param timesheetId the timesheet ID
     * @param action the approval action
     * @return true if the action exists for the timesheet
     */
    boolean existsByTimesheetIdAndAction(Long timesheetId, ApprovalAction action);
    
    /**
     * Get approval statistics for a specific approver.
     * 
     * @param approverId the approver's ID
     * @return count of different approval actions performed
     */
    @Query("SELECT a.action, COUNT(a) FROM Approval a WHERE a.approverId = :approverId GROUP BY a.action")
    List<Object[]> getApprovalStatisticsByApprover(@Param("approverId") Long approverId);
    
    /**
     * Find pending approvals that require action from a specific approver.
     * This finds timesheets that are in a pending state that the approver can act on.
     * 
     * @param approverId the approver's ID (used to determine which pending states they can act on)
     * @return list of approval records for timesheets awaiting this approver's action
     */
    @Query("SELECT a FROM Approval a WHERE a.id IN (" +
           "SELECT MAX(a2.id) FROM Approval a2 WHERE a2.timesheetId = a.timesheetId" +
           ") AND a.newStatus IN (:pendingStatuses)")
    List<Approval> findPendingApprovalsForStatuses(@Param("pendingStatuses") List<ApprovalStatus> pendingStatuses);
    
    /**
     * Get approval history summary for reporting.
     * 
     * @param timesheetId the timesheet ID
     * @return approval actions with approver information
     */
    @Query("SELECT a, u.name FROM Approval a " +
           "LEFT JOIN User u ON a.approverId = u.id " +
           "WHERE a.timesheetId = :timesheetId " +
           "ORDER BY a.timestamp ASC")
    List<Object[]> getApprovalHistoryWithApproverNames(@Param("timesheetId") Long timesheetId);
    
    /**
     * Count total approvals by action type within a date range.
     * 
     * @param startDate start of the date range
     * @param endDate end of the date range
     * @return count of approvals by action type
     */
    @Query("SELECT a.action, COUNT(a) FROM Approval a " +
           "WHERE a.timestamp BETWEEN :startDate AND :endDate " +
           "GROUP BY a.action")
    List<Object[]> countApprovalsByActionInDateRange(@Param("startDate") LocalDateTime startDate,
                                                    @Param("endDate") LocalDateTime endDate);
    
    /**
     * Find timesheets that have been pending for more than a specified number of days.
     * 
     * @param daysAgo number of days to look back
     * @param pendingStatuses list of pending statuses to check
     * @return list of approval records for overdue timesheets
     */
    @Query("SELECT a FROM Approval a WHERE a.id IN (" +
           "SELECT MAX(a2.id) FROM Approval a2 WHERE a2.timesheetId = a.timesheetId" +
           ") AND a.newStatus IN (:pendingStatuses) " +
           "AND a.timestamp < :cutoffDate")
    List<Approval> findOverdueApprovals(@Param("cutoffDate") LocalDateTime cutoffDate,
                                       @Param("pendingStatuses") List<ApprovalStatus> pendingStatuses);
    
    /**
     * Delete all approval records for a specific timesheet.
     * Used when a timesheet is deleted.
     * 
     * @param timesheetId the timesheet ID
     */
    void deleteByTimesheetId(Long timesheetId);
    
    /**
     * Find the current status of a timesheet based on its latest approval.
     * 
     * @param timesheetId the timesheet ID
     * @return the current approval status, if any approval exists
     */
    @Query("SELECT a.newStatus FROM Approval a " +
           "WHERE a.timesheetId = :timesheetId " +
           "ORDER BY a.timestamp DESC LIMIT 1")
    Optional<ApprovalStatus> findCurrentStatusByTimesheetId(@Param("timesheetId") Long timesheetId);
}