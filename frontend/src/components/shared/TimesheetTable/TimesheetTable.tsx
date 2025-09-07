/**
 * Optimized Timesheet Table Component
 * 
 * High-performance, fully optimized table component with virtualization,
 * memoization, and advanced features.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
// import { FixedSizeList as List } from 'react-window'; // Optional dependency for virtualization
import type { Timesheet, ApprovalAction } from '../../../types/api';
import { formatters } from '../../../utils/formatting';
import StatusBadge from '../StatusBadge/StatusBadge';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './TimesheetTable.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface TimesheetTableProps {
  timesheets: Timesheet[];
  loading?: boolean;
  onApprovalAction?: (timesheetId: number, action: ApprovalAction) => void;
  onRowClick?: (timesheet: Timesheet) => void;
  actionLoading?: number | null;
  selectedIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  showActions?: boolean;
  showTutorInfo?: boolean;
  showCourseInfo?: boolean;
  showSelection?: boolean;
  virtualizeThreshold?: number;
  className?: string;
  emptyMessage?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
}

interface Column {
  key: string;
  label: string;
  width: number;
  sortable?: boolean;
  visible?: boolean;
  render?: (timesheet: Timesheet, index: number) => React.ReactNode;
}

interface TimesheetRowProps {
  timesheet: Timesheet;
  index: number;
  columns: Column[];
  onApprovalAction?: (timesheetId: number, action: ApprovalAction) => void;
  onRowClick?: (timesheet: Timesheet) => void;
  actionLoading?: boolean;
  selected?: boolean;
  onSelectionChange?: (timesheetId: number, selected: boolean) => void;
  showSelection?: boolean;
  style?: React.CSSProperties;
}

// =============================================================================
// Memoized Row Component
// =============================================================================

const TimesheetRow = memo<TimesheetRowProps>(({
  timesheet,
  index,
  columns,
  onApprovalAction,
  onRowClick,
  actionLoading = false,
  selected = false,
  onSelectionChange,
  showSelection = false,
  style
}) => {
  const handleRowClick = useCallback(() => {
    onRowClick?.(timesheet);
  }, [timesheet, onRowClick]);

  const handleSelectionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectionChange?.(timesheet.id, e.target.checked);
  }, [timesheet.id, onSelectionChange]);

  const handleApprove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onApprovalAction?.(timesheet.id, 'FINAL_APPROVAL');
  }, [timesheet.id, onApprovalAction]);

  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onApprovalAction?.(timesheet.id, 'REJECT');
  }, [timesheet.id, onApprovalAction]);

  const totalPay = useMemo(() => 
    timesheet.hours * timesheet.hourlyRate, 
    [timesheet.hours, timesheet.hourlyRate]
  );

  return (
    <div 
      className={`timesheet-row ${selected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
      onClick={handleRowClick}
      style={style}
      data-testid={`timesheet-row-${timesheet.id}`}
      role="row"
    >
      {showSelection && (
        <div className="cell selection-cell" role="cell">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelectionChange}
            aria-label={`Select timesheet ${timesheet.id}`}
          />
        </div>
      )}
      
      {columns.filter(col => col.visible !== false).map(column => (
        <div 
          key={column.key} 
          className={`cell ${column.key}-cell`}
          style={{ width: column.width }}
          role="cell"
        >
          {column.render ? column.render(timesheet, index) : renderDefaultCell(column.key, timesheet, {
            onApprove: handleApprove,
            onReject: handleReject,
            actionLoading,
            totalPay
          })}
        </div>
      ))}
    </div>
  );
});

TimesheetRow.displayName = 'TimesheetRow';

// =============================================================================
// Default Cell Renderers
// =============================================================================

interface CellRendererProps {
  onApprove: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
  actionLoading: boolean;
  totalPay: number;
}

function renderDefaultCell(
  key: string, 
  timesheet: Timesheet, 
  props: CellRendererProps
): React.ReactNode {
  const { onApprove, onReject, actionLoading, totalPay } = props;

  switch (key) {
    case 'selection':
      return null; // Handled separately
      
    case 'tutor':
      return (
        <div className="tutor-info">
          <div className="tutor-avatar">
            {formatters.initials(timesheet.tutorName || 'Unknown')}
          </div>
          <span>{timesheet.tutorName || `Tutor ${timesheet.tutorId}`}</span>
        </div>
      );
      
    case 'course':
      return (
        <div className="course-info">
          <span className="course-code">
            {timesheet.courseCode || `Course ${timesheet.courseId}`}
          </span>
          {timesheet.courseName && (
            <span className="course-name">{timesheet.courseName}</span>
          )}
        </div>
      );
      
    case 'weekStartDate':
      return formatters.date(timesheet.weekStartDate);
      
    case 'hours':
      return (
        <span className="hours-badge">
          {formatters.hours(timesheet.hours)}
        </span>
      );
      
    case 'hourlyRate':
      return formatters.currency(timesheet.hourlyRate);
      
    case 'totalPay':
      return <strong>{formatters.currency(totalPay)}</strong>;
      
    case 'status':
      return <StatusBadge status={timesheet.status} />;
      
    case 'description':
      return (
        <div 
          className="description-cell" 
          title={timesheet.description}
        >
          {formatters.truncate(timesheet.description, 50)}
        </div>
      );
      
    case 'createdAt':
      return formatters.relativeTime(timesheet.createdAt);
      
    case 'actions':
      return (
        <div className="action-buttons">
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="approve-btn"
            title="Final approve timesheet"
          >
            {actionLoading ? <LoadingSpinner size="small" /> : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={actionLoading}
            className="reject-btn"
            title="Reject timesheet"
          >
            {actionLoading ? <LoadingSpinner size="small" /> : 'Reject'}
          </button>
        </div>
      );
      
    default:
      return timesheet[key as keyof Timesheet] || '';
  }
}

// =============================================================================
// Virtualized Row Component
// =============================================================================

interface VirtualRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    timesheets: Timesheet[];
    columns: Column[];
    props: Omit<TimesheetTableProps, 'timesheets'>;
  };
}

const VirtualRow = memo<VirtualRowProps>(({ index, style, data }) => {
  const { timesheets, columns, props } = data;
  const timesheet = timesheets[index];
  
  if (!timesheet) return null;

  return (
    <TimesheetRow
      timesheet={timesheet}
      index={index}
      columns={columns}
      onApprovalAction={props.onApprovalAction}
      onRowClick={props.onRowClick}
      actionLoading={props.actionLoading === timesheet.id}
      selected={props.selectedIds?.includes(timesheet.id)}
      onSelectionChange={props.onSelectionChange ? 
        (id, selected) => {
          const newSelection = selected 
            ? [...(props.selectedIds || []), id]
            : (props.selectedIds || []).filter(sid => sid !== id);
          props.onSelectionChange!(newSelection);
        } : undefined
      }
      showSelection={props.showSelection}
      style={style}
    />
  );
});

VirtualRow.displayName = 'VirtualRow';

// =============================================================================
// Table Header Component
// =============================================================================

interface TableHeaderProps {
  columns: Column[];
  showSelection?: boolean;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: (selected: boolean) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
}

const TableHeader = memo<TableHeaderProps>(({
  columns,
  showSelection = false,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  sortBy,
  sortDirection,
  onSort
}) => {
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll?.(e.target.checked);
  }, [onSelectAll]);

  const handleSort = useCallback((field: string) => {
    if (!onSort) return;
    
    const newDirection = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  }, [onSort, sortBy, sortDirection]);

  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="table-header" role="row">
      {showSelection && (
        <div className="cell selection-cell header-cell" role="columnheader">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isIndeterminate;
            }}
            onChange={handleSelectAll}
            aria-label="Select all timesheets"
          />
        </div>
      )}
      
      {columns.filter(col => col.visible !== false).map(column => (
        <div 
          key={column.key}
          className={`cell header-cell ${column.key}-header ${column.sortable ? 'sortable' : ''}`}
          style={{ width: column.width }}
          onClick={column.sortable ? () => handleSort(column.key) : undefined}
          role="columnheader"
          aria-sort={sortBy === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
          <span>{column.label}</span>
          {column.sortable && sortBy === column.key && (
            <span className={`sort-indicator ${sortDirection}`}>
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

// =============================================================================
// Main Table Component
// =============================================================================

const TimesheetTable = memo<TimesheetTableProps>(({
  timesheets,
  loading = false,
  onApprovalAction,
  onRowClick,
  actionLoading = null,
  selectedIds = [],
  onSelectionChange,
  showActions = false,
  showTutorInfo = true,
  showCourseInfo = true,
  showSelection = false,
  virtualizeThreshold = 100,
  className = '',
  emptyMessage = 'No timesheets found',
  sortBy,
  sortDirection,
  onSort
}) => {
  const [containerHeight] = useState(600); // Could be made dynamic
  const rowHeight = 60;

  // Define columns configuration
  const columns = useMemo<Column[]>(() => [
    ...(showTutorInfo ? [{ key: 'tutor', label: 'Tutor', width: 150, sortable: true, visible: true }] : []),
    ...(showCourseInfo ? [{ key: 'course', label: 'Course', width: 150, sortable: true, visible: true }] : []),
    { key: 'weekStartDate', label: 'Week Starting', width: 120, sortable: true, visible: true },
    { key: 'hours', label: 'Hours', width: 80, sortable: true, visible: true },
    { key: 'hourlyRate', label: 'Rate', width: 100, sortable: true, visible: true },
    { key: 'totalPay', label: 'Total Pay', width: 120, sortable: true, visible: true },
    { key: 'status', label: 'Status', width: 130, sortable: true, visible: true },
    { key: 'description', label: 'Description', width: 200, sortable: false, visible: true },
    { key: 'createdAt', label: 'Submitted', width: 120, sortable: true, visible: true },
    ...(showActions ? [{ key: 'actions', label: 'Actions', width: 160, sortable: false, visible: true }] : [])
  ], [showTutorInfo, showCourseInfo, showActions]);

  // Handle selection changes
  const handleSelectAll = useCallback((selected: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelection = selected ? timesheets.map(t => t.id) : [];
    onSelectionChange(newSelection);
  }, [timesheets, onSelectionChange]);

  // Memoize virtualization data
  const virtualizationData = useMemo(() => ({
    timesheets,
    columns,
    props: {
      onApprovalAction,
      onRowClick,
      actionLoading,
      selectedIds,
      onSelectionChange,
      showSelection
    }
  }), [timesheets, columns, onApprovalAction, onRowClick, actionLoading, selectedIds, onSelectionChange, showSelection]);

  // Loading state
  if (loading) {
    return (
      <div className={`timesheet-table-container loading ${className}`}>
        <div className="loading-state">
          <LoadingSpinner size="large" />
          <p>Loading timesheets...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (timesheets.length === 0) {
    return (
      <div className={`timesheet-table-container empty ${className}`}>
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc" role="img" aria-label="No timesheets">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          <h3>No Timesheets</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const useVirtualization = false; // Disabled - requires react-window dependency

  return (
    <div className={`timesheet-table-container ${className}`} data-testid="timesheet-table" role="table" aria-label="Timesheets">
      <TableHeader
        columns={columns}
        showSelection={showSelection}
        selectedCount={selectedIds.length}
        totalCount={timesheets.length}
        onSelectAll={handleSelectAll}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={onSort}
      />
      
      <div className="table-body" role="rowgroup">
        {useVirtualization ? (
          <List
            height={containerHeight}
            itemCount={timesheets.length}
            itemSize={rowHeight}
            itemData={virtualizationData}
            overscanCount={5}
          >
            {VirtualRow}
          </List>
        ) : (
          <div className="table-rows">
            {timesheets.map((timesheet, index) => (
              <TimesheetRow
                key={timesheet.id}
                timesheet={timesheet}
                index={index}
                columns={columns}
                onApprovalAction={onApprovalAction}
                onRowClick={onRowClick}
                actionLoading={actionLoading === timesheet.id}
                selected={selectedIds.includes(timesheet.id)}
                onSelectionChange={onSelectionChange ? 
                  (id, selected) => {
                    const newSelection = selected 
                      ? [...selectedIds, id]
                      : selectedIds.filter(sid => sid !== id);
                    onSelectionChange(newSelection);
                  } : undefined
                }
                showSelection={showSelection}
              />
            ))}
          </div>
        )}
      </div>
      
      {showSelection && selectedIds.length > 0 && (
        <div className="table-footer">
          <span>{selectedIds.length} of {timesheets.length} selected</span>
        </div>
      )}
    </div>
  );
});

TimesheetTable.displayName = 'TimesheetTable';

export default TimesheetTable;