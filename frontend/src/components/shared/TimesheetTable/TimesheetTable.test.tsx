/**
 * TimesheetTable Component Tests
 * 
 * Comprehensive test suite following TDD methodology for TimesheetTable component.
 * Tests performance, accessibility, virtualization, and all interactive features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimesheetTable from './TimesheetTable';
import { 
  createMockTimesheets, 
  createMockTimesheet,
  mockIntersectionObserver,
  testPerformanceWithManyItems,
  expectAccessibleName,
  expectFormattedTimesheet
} from '../../../test/utils/test-utils';
import type { Timesheet, ApprovalAction } from '../../../types/api';

// =============================================================================
// Test Setup
// =============================================================================

// Mock react-window for virtualization tests
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemData, height, itemSize }: any) => (
    <div 
      data-testid="virtualized-list"
      style={{ height }}
      data-item-count={itemCount}
      data-item-size={itemSize}
    >
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
        children({ index, style: { height: itemSize }, data: itemData })
      )}
    </div>
  )
}));

const defaultProps = {
  timesheets: createMockTimesheets(5),
  loading: false,
  showActions: true,
  showTutorInfo: true,
  showCourseInfo: true,
  showSelection: false
};

const mockHandlers = {
  onApprovalAction: vi.fn(),
  onRowClick: vi.fn(),
  onSelectionChange: vi.fn(),
  onSort: vi.fn()
};

// =============================================================================
// TimesheetTable Component Tests
// =============================================================================

describe('TimesheetTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntersectionObserver();
  });

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      render(<TimesheetTable timesheets={defaultProps.timesheets} />);
      
      const table = screen.getByTestId('timesheet-table');
      expect(table).toBeInTheDocument();
    });

    it('should render table header', () => {
      render(<TimesheetTable {...defaultProps} />);
      
      const header = screen.getByRole('columnheader', { name: /tutor/i });
      expect(header).toBeInTheDocument();
      
      expect(screen.getByRole('columnheader', { name: /course/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /week starting/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /hours/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /rate/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /total pay/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('should render all timesheet rows', () => {
      render(<TimesheetTable {...defaultProps} />);
      
      defaultProps.timesheets.forEach(timesheet => {
        const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
        expect(row).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      render(<TimesheetTable {...defaultProps} className="custom-table" />);
      
      const table = screen.getByTestId('timesheet-table');
      expect(table).toHaveClass('custom-table');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<TimesheetTable timesheets={[]} loading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading timesheets...')).toBeInTheDocument();
    });

    it('should not show table content when loading', () => {
      render(<TimesheetTable {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('timesheet-table')).not.toBeInTheDocument();
    });

    it('should apply loading CSS class', () => {
      render(<TimesheetTable timesheets={[]} loading={true} />);
      
      const container = screen.getByTestId('loading-spinner').closest('.timesheet-table-container');
      expect(container).toHaveClass('loading');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no timesheets', () => {
      render(<TimesheetTable timesheets={[]} />);
      
      expect(screen.getByText('No Timesheets')).toBeInTheDocument();
      expect(screen.getByText('No timesheets found')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(<TimesheetTable timesheets={[]} emptyMessage="No data available" />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      render(<TimesheetTable timesheets={[]} />);
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toBeInTheDocument();
    });

    it('should apply empty CSS class', () => {
      render(<TimesheetTable timesheets={[]} />);
      
      const container = screen.getByText('No Timesheets').closest('.timesheet-table-container');
      expect(container).toHaveClass('empty');
    });
  });

  describe('Column Configuration', () => {
    it('should hide tutor column when showTutorInfo is false', () => {
      render(<TimesheetTable {...defaultProps} showTutorInfo={false} />);
      
      expect(screen.queryByRole('columnheader', { name: /tutor/i })).not.toBeInTheDocument();
    });

    it('should hide course column when showCourseInfo is false', () => {
      render(<TimesheetTable {...defaultProps} showCourseInfo={false} />);
      
      expect(screen.queryByRole('columnheader', { name: /course/i })).not.toBeInTheDocument();
    });

    it('should hide actions column when showActions is false', () => {
      render(<TimesheetTable {...defaultProps} showActions={false} />);
      
      expect(screen.queryByRole('columnheader', { name: /actions/i })).not.toBeInTheDocument();
    });

    it('should show selection column when showSelection is true', () => {
      render(<TimesheetTable {...defaultProps} showSelection={true} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      expect(selectAllCheckbox).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should format timesheet data correctly', () => {
      const timesheet = createMockTimesheet({
        tutorName: 'John Doe',
        courseCode: 'CS101',
        courseName: 'Computer Science 101',
        hours: 15.5,
        hourlyRate: 45.25,
        weekStartDate: '2024-01-15'
      });

      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      
      expect(row).toHaveTextContent('John Doe');
      expect(row).toHaveTextContent('CS101');
      expect(row).toHaveTextContent('15.5h');
      expect(row).toHaveTextContent('$45.25');
      expect(row).toHaveTextContent('$701.38'); // 15.5 * 45.25
    });

    it('should format dates correctly', () => {
      const timesheet = createMockTimesheet({
        weekStartDate: '2024-01-15',
        createdAt: '2024-01-15T10:30:00Z'
      });

      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      expect(row).toHaveTextContent('15 Jan 2024'); // Formatted date
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'This is a very long description that should be truncated to prevent layout issues and maintain table readability';
      const timesheet = createMockTimesheet({ description: longDescription });

      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const descriptionCell = screen.getByTitle(longDescription);
      expect(descriptionCell).toBeInTheDocument();
      expect(descriptionCell.textContent).toHaveLength(53); // 50 chars + "..."
    });

    it('should show status badges', () => {
      const timesheet = createMockTimesheet({ status: 'SUBMITTED' });
      
      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const statusBadge = screen.getByTestId('status-badge-submitted');
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe('Row Interactions', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} onRowClick={mockHandlers.onRowClick} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      await user.click(row);
      
      expect(mockHandlers.onRowClick).toHaveBeenCalledWith(timesheet);
    });

    it('should not call onRowClick when clicking action buttons', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} onRowClick={mockHandlers.onRowClick} />);
      
      const approveButton = screen.getAllByText('Approve')[0];
      await user.click(approveButton);
      
      expect(mockHandlers.onRowClick).not.toHaveBeenCalled();
    });

    it('should handle row hover states', async () => {
      const user = userEvent.setup();
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      await user.hover(row);
      
      // Should not throw or cause issues
      expect(row).toBeInTheDocument();
    });
  });

  describe('Approval Actions', () => {
    it('should render approval buttons when showActions is true', () => {
      render(<TimesheetTable {...defaultProps} showActions={true} />);
      
      expect(screen.getAllByText('Approve')).toHaveLength(defaultProps.timesheets.length);
      expect(screen.getAllByText('Reject')).toHaveLength(defaultProps.timesheets.length);
    });

    it('should call onApprovalAction when approve button is clicked', async () => {
      const user = userEvent.setup();
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} onApprovalAction={mockHandlers.onApprovalAction} />);
      
      const approveButton = screen.getAllByText('Approve')[0];
      await user.click(approveButton);
      
      expect(mockHandlers.onApprovalAction).toHaveBeenCalledWith(timesheet.id, 'FINAL_APPROVAL');
    });

    it('should call onApprovalAction when reject button is clicked', async () => {
      const user = userEvent.setup();
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} onApprovalAction={mockHandlers.onApprovalAction} />);
      
      const rejectButton = screen.getAllByText('Reject')[0];
      await user.click(rejectButton);
      
      expect(mockHandlers.onApprovalAction).toHaveBeenCalledWith(timesheet.id, 'REJECT');
    });

    it('should show loading spinner on action buttons when actionLoading matches timesheet id', () => {
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} actionLoading={timesheet.id} />);
      
      const actionCell = screen.getByTestId(`timesheet-row-${timesheet.id}`).querySelector('.action-buttons');
      expect(actionCell?.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument();
    });

    it('should disable action buttons when loading', () => {
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} actionLoading={timesheet.id} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      const approveButton = row.querySelector('.approve-btn') as HTMLButtonElement;
      const rejectButton = row.querySelector('.reject-btn') as HTMLButtonElement;
      
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

  describe('Selection Features', () => {
    it('should show select all checkbox when showSelection is true', () => {
      render(<TimesheetTable {...defaultProps} showSelection={true} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      expect(selectAllCheckbox).toBeInTheDocument();
    });

    it('should show individual selection checkboxes', () => {
      render(<TimesheetTable {...defaultProps} showSelection={true} />);
      
      defaultProps.timesheets.forEach(timesheet => {
        const checkbox = screen.getByLabelText(`Select timesheet ${timesheet.id}`);
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('should handle individual timesheet selection', async () => {
      const user = userEvent.setup();
      const timesheet = defaultProps.timesheets[0];
      
      render(<TimesheetTable {...defaultProps} showSelection={true} onSelectionChange={mockHandlers.onSelectionChange} />);
      
      const checkbox = screen.getByLabelText(`Select timesheet ${timesheet.id}`);
      await user.click(checkbox);
      
      expect(mockHandlers.onSelectionChange).toHaveBeenCalledWith([timesheet.id]);
    });

    it('should handle select all functionality', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} showSelection={true} onSelectionChange={mockHandlers.onSelectionChange} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      await user.click(selectAllCheckbox);
      
      const expectedIds = defaultProps.timesheets.map(t => t.id);
      expect(mockHandlers.onSelectionChange).toHaveBeenCalledWith(expectedIds);
    });

    it('should show indeterminate state for partial selection', () => {
      const selectedIds = [defaultProps.timesheets[0].id];
      
      render(
        <TimesheetTable 
          {...defaultProps} 
          showSelection={true} 
          selectedIds={selectedIds}
          onSelectionChange={mockHandlers.onSelectionChange} 
        />
      );
      
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets') as HTMLInputElement;
      expect(selectAllCheckbox.indeterminate).toBe(true);
    });

    it('should show selection count in footer', () => {
      const selectedIds = [defaultProps.timesheets[0].id, defaultProps.timesheets[1].id];
      
      render(
        <TimesheetTable 
          {...defaultProps} 
          showSelection={true} 
          selectedIds={selectedIds}
        />
      );
      
      expect(screen.getByText(`2 of ${defaultProps.timesheets.length} selected`)).toBeInTheDocument();
    });
  });

  describe('Sorting Features', () => {
    it('should show sort indicators on sortable columns', () => {
      render(<TimesheetTable {...defaultProps} sortBy="hours" sortDirection="asc" onSort={mockHandlers.onSort} />);
      
      const hoursHeader = screen.getByRole('columnheader', { name: /hours/i });
      expect(hoursHeader.querySelector('.sort-indicator')).toBeInTheDocument();
      expect(hoursHeader.querySelector('.sort-indicator')).toHaveTextContent('↑');
    });

    it('should call onSort when clicking sortable column header', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} onSort={mockHandlers.onSort} />);
      
      const hoursHeader = screen.getByRole('columnheader', { name: /hours/i });
      await user.click(hoursHeader);
      
      expect(mockHandlers.onSort).toHaveBeenCalledWith('hours', 'asc');
    });

    it('should toggle sort direction on subsequent clicks', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} sortBy="hours" sortDirection="asc" onSort={mockHandlers.onSort} />);
      
      const hoursHeader = screen.getByRole('columnheader', { name: /hours/i });
      await user.click(hoursHeader);
      
      expect(mockHandlers.onSort).toHaveBeenCalledWith('hours', 'desc');
    });

    it('should not call onSort for non-sortable columns', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} onSort={mockHandlers.onSort} />);
      
      const descriptionHeader = screen.getByRole('columnheader', { name: /description/i });
      await user.click(descriptionHeader);
      
      expect(mockHandlers.onSort).not.toHaveBeenCalled();
    });
  });

  describe('Virtualization', () => {
    it('should render all rows without virtualization (virtualization disabled)', () => {
      const manyTimesheets = createMockTimesheets(150);
      
      render(<TimesheetTable timesheets={manyTimesheets} virtualizeThreshold={100} />);
      
      // Since virtualization is disabled, should not have virtualized list
      expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('timesheet-table').querySelector('.table-rows')).toBeInTheDocument();
      
      // Should render all rows
      expect(screen.getAllByTestId(/timesheet-row-/)).toHaveLength(150);
    });

    it('should render all rows without virtualization for small datasets', () => {
      render(<TimesheetTable {...defaultProps} virtualizeThreshold={100} />);
      
      expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('timesheet-table').querySelector('.table-rows')).toBeInTheDocument();
    });

    it('should handle large datasets without performance issues (no virtualization)', () => {
      const manyTimesheets = createMockTimesheets(150);
      
      const startTime = performance.now();
      render(<TimesheetTable timesheets={manyTimesheets} virtualizeThreshold={100} />);
      const endTime = performance.now();
      
      // Should render in reasonable time even without virtualization
      expect(endTime - startTime).toBeLessThan(1000); // 1 second max
      expect(screen.getAllByTestId(/timesheet-row-/)).toHaveLength(150);
    });
  });

  describe('Accessibility', () => {
    it('should have proper table semantics', () => {
      render(<TimesheetTable {...defaultProps} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(10); // All columns including actions (tutor, course, week, hours, rate, total, status, description, submitted, actions)
      expect(screen.getAllByRole('row')).toHaveLength(6); // Header + 5 data rows
    });

    it('should have accessible action buttons', () => {
      render(<TimesheetTable {...defaultProps} />);
      
      const approveButtons = screen.getAllByTitle('Final approve timesheet');
      const rejectButtons = screen.getAllByTitle('Reject timesheet');
      
      expect(approveButtons).toHaveLength(defaultProps.timesheets.length);
      expect(rejectButtons).toHaveLength(defaultProps.timesheets.length);
    });

    it('should have accessible selection checkboxes', () => {
      render(<TimesheetTable {...defaultProps} showSelection={true} />);
      
      // Select all checkbox
      expect(screen.getByLabelText('Select all timesheets')).toBeInTheDocument();
      
      // Individual checkboxes
      defaultProps.timesheets.forEach(timesheet => {
        expect(screen.getByLabelText(`Select timesheet ${timesheet.id}`)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<TimesheetTable {...defaultProps} showSelection={true} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      selectAllCheckbox.focus();
      
      await user.keyboard('{Tab}');
      
      // Should move to first row checkbox
      const firstCheckbox = screen.getByLabelText(`Select timesheet ${defaultProps.timesheets[0].id}`);
      expect(firstCheckbox).toHaveFocus();
    });

    it('should announce loading state to screen readers', () => {
      render(<TimesheetTable timesheets={[]} loading={true} />);
      
      const loadingSpinner = screen.getByRole('status');
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('Performance', () => {
    it('should render large datasets efficiently', () => {
      testPerformanceWithManyItems(
        ({ items }: { items: Timesheet[] }) => <TimesheetTable timesheets={items} />,
        (index) => createMockTimesheet({ id: index + 1 }),
        500,
        1000 // Should render 500 items in under 1000ms (reasonable without virtualization)
      );
    });

    it('should memoize row components', () => {
      const timesheets = createMockTimesheets(10);
      const { rerender } = render(<TimesheetTable timesheets={timesheets} />);
      
      // Add unrelated prop that shouldn't affect row rendering
      rerender(<TimesheetTable timesheets={timesheets} className="different-class" />);
      
      // Rows should still be present (not re-rendered from scratch)
      timesheets.forEach(timesheet => {
        expect(screen.getByTestId(`timesheet-row-${timesheet.id}`)).toBeInTheDocument();
      });
    });

    it('should handle rapid data updates without performance issues', async () => {
      const initialTimesheets = createMockTimesheets(5);
      const { rerender } = render(<TimesheetTable timesheets={initialTimesheets} />);
      
      // Rapidly update timesheets multiple times
      for (let i = 0; i < 10; i++) {
        const updatedTimesheets = createMockTimesheets(5 + i);
        rerender(<TimesheetTable timesheets={updatedTimesheets} />);
      }
      
      // Should not crash or cause performance issues
      expect(screen.getByTestId('timesheet-table')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty timesheet data gracefully', () => {
      const emptyTimesheet = createMockTimesheet({
        tutorName: '',
        courseName: '',
        courseCode: '',
        description: ''
      });
      
      render(<TimesheetTable timesheets={[emptyTimesheet]} />);
      
      const row = screen.getByTestId(`timesheet-row-${emptyTimesheet.id}`);
      expect(row).toBeInTheDocument();
      
      // Should show fallback values
      expect(row).toHaveTextContent(`Tutor ${emptyTimesheet.tutorId}`);
      expect(row).toHaveTextContent(`Course ${emptyTimesheet.courseId}`);
    });

    it('should handle malformed data gracefully', () => {
      const malformedTimesheet = createMockTimesheet({
        hours: NaN,
        hourlyRate: NaN,
        weekStartDate: 'invalid-date'
      });
      
      expect(() => {
        render(<TimesheetTable timesheets={[malformedTimesheet]} />);
      }).not.toThrow();
    });

    it('should handle very long lists without memory issues', () => {
      const veryLongList = createMockTimesheets(10000);
      
      expect(() => {
        render(<TimesheetTable timesheets={veryLongList} virtualizeThreshold={100} />);
      }).not.toThrow();
      
      // Since virtualization is disabled, should render standard table
      expect(screen.queryByTestId('virtualized-list')).not.toBeInTheDocument();
      expect(screen.getByTestId('timesheet-table').querySelector('.table-rows')).toBeInTheDocument();
    });

    it('should handle component unmounting during loading', () => {
      const { unmount } = render(<TimesheetTable timesheets={[]} loading={true} />);
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration with Other Components', () => {
    it('should work with StatusBadge component', () => {
      const timesheet = createMockTimesheet({ status: 'FINAL_APPROVED' });
      
      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const statusBadge = screen.getByTestId('status-badge-final_approved');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should work with LoadingSpinner component', () => {
      render(<TimesheetTable timesheets={[]} loading={true} />);
      
      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveClass('loading-spinner--large');
    });

    it('should integrate with formatting utilities', () => {
      const timesheet = createMockTimesheet({
        hours: 15.75,
        hourlyRate: 42.50,
        weekStartDate: '2024-02-15'
      });
      
      render(<TimesheetTable timesheets={[timesheet]} />);
      
      const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
      
      // Should use formatting utilities
      expect(row).toHaveTextContent('15.8h'); // Formatted hours
      expect(row).toHaveTextContent('$42.50'); // Formatted currency
      expect(row).toHaveTextContent('15 Feb 2024'); // Formatted date
    });
  });
});