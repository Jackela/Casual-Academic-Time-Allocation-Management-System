/**
 * Optimized Timesheet Table Component
 *
 * High-performance, fully optimized table component with virtualization,
 * memoization, and advanced features.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { Timesheet, ApprovalAction, TimesheetStatus } from '../../../types/api';
import { formatters } from '../../../utils/formatting';
import { secureLogger } from '../../../utils/secure-logger';
import StatusBadge from '../StatusBadge/StatusBadge';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './TimesheetTable.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export type ApprovalRole = 'LECTURER' | 'ADMIN' | 'HR';

export interface TimesheetTableProps {
  timesheets: Timesheet[];
  loading?: boolean;
  loadingMessage?: string;
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
  actionMode?: 'approval' | 'tutor';
  approvalRole?: ApprovalRole;
}

type DerivedColumnKey = 'tutor' | 'course' | 'totalPay' | 'actions' | 'selection';
type TimesheetColumnKey = keyof Timesheet | DerivedColumnKey;

interface Column {
  key: TimesheetColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  visible?: boolean;
  render?: (timesheet: Timesheet, index: number) => React.ReactNode;
}

const createColumn = <K extends TimesheetColumnKey>(
  column: { key: K } & Omit<Column, 'key'>
): Column => column;

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
  actionMode?: 'approval' | 'tutor';
  approvalRole?: ApprovalRole;
  style?: React.CSSProperties;
}

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
  actionMode = 'approval',
  approvalRole,
  style
}) => {
  const handleRowClick = useCallback(() => {
    onRowClick?.(timesheet);
  }, [timesheet, onRowClick]);

  const handleSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onSelectionChange?.(timesheet.id, event.target.checked);
  }, [timesheet.id, onSelectionChange]);

  const handleApprove = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const action = getApproveActionForRole(approvalRole);
    onApprovalAction?.(timesheet.id, action);
  }, [timesheet.id, onApprovalAction, approvalRole]);

  const handleReject = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onApprovalAction?.(timesheet.id, 'REJECT');
  }, [timesheet.id, onApprovalAction]);

  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onApprovalAction?.(timesheet.id, 'EDIT');
  }, [timesheet.id, onApprovalAction]);

  const handleSubmitDraft = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onApprovalAction?.(timesheet.id, 'SUBMIT_DRAFT');
  }, [timesheet.id, onApprovalAction]);

  const handleConfirm = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onApprovalAction?.(timesheet.id, 'TUTOR_CONFIRM');
  }, [timesheet.id, onApprovalAction]);

  const totalPay = useMemo(() => timesheet.hours * timesheet.hourlyRate, [timesheet.hours, timesheet.hourlyRate]);

  return (
    <tr
      className={`timesheet-row ${selected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
      onClick={handleRowClick}
      data-testid={`timesheet-row-${timesheet.id}`}
      style={style}
    >
      {showSelection && (
        <td className="cell selection-cell">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelectionChange}
            aria-label={`Select timesheet ${timesheet.id}`}
          />
        </td>
      )}

      {columns.filter(column => column.visible !== false).map(column => (
        <td
          key={column.key}
          className={`cell ${column.key}-cell`}
          style={{ width: column.width }}
        >
          {column.render
            ? column.render(timesheet, index)
            : renderDefaultCell(column.key, timesheet, {
                onApprove: handleApprove,
                onReject: handleReject,
                onEdit: handleEdit,
                onSubmitDraft: handleSubmitDraft,
                onConfirm: handleConfirm,
                actionLoading,
                totalPay,
                actionMode,
                approvalRole
              })}
        </td>
      ))}
    </tr>
  );
});

TimesheetRow.displayName = 'TimesheetRow';

interface CellRendererProps {
  onApprove: (event: React.MouseEvent) => void;
  onReject: (event: React.MouseEvent) => void;
  onEdit?: (event: React.MouseEvent) => void;
  onSubmitDraft?: (event: React.MouseEvent) => void;
  onConfirm?: (event: React.MouseEvent) => void;
  actionLoading: boolean;
  totalPay: number;
  actionMode: 'approval' | 'tutor';
  approvalRole?: ApprovalRole;
}

const APPROVE_ACTION_BY_ROLE: Record<ApprovalRole, ApprovalAction> = {
  LECTURER: 'LECTURER_CONFIRM',
  ADMIN: 'HR_CONFIRM',
  HR: 'HR_CONFIRM',
};

const ACTION_RULES: Record<ApprovalRole, { approve: TimesheetStatus[]; reject: TimesheetStatus[] }> = {
  LECTURER: {
    approve: ['TUTOR_CONFIRMED'],
    reject: ['TUTOR_CONFIRMED'],
  },
  ADMIN: {
    approve: ['LECTURER_CONFIRMED'],
    reject: ['LECTURER_CONFIRMED'],
  },
  HR: {
    approve: ['LECTURER_CONFIRMED'],
    reject: ['LECTURER_CONFIRMED'],
  },
};

function getApproveActionForRole(role?: ApprovalRole): ApprovalAction {
  if (!role) {
    return 'LECTURER_CONFIRM';
  }
  return APPROVE_ACTION_BY_ROLE[role];
}

function getActionPermissions(role: ApprovalRole | undefined, status: TimesheetStatus) {
  if (!role) {
    return {
      canApprove: true,
      canReject: true,
    };
  }

  const rules = ACTION_RULES[role];
  return {
    canApprove: rules.approve.includes(status),
    canReject: rules.reject.includes(status),
  };
}

const isTimesheetKey = (key: TimesheetColumnKey): key is keyof Timesheet => {
  return key !== 'tutor' && key !== 'course' && key !== 'totalPay' && key !== 'actions' && key !== 'selection';
};

function renderDefaultCell(
  key: TimesheetColumnKey,
  timesheet: Timesheet,
  props: CellRendererProps
): React.ReactNode {
  const { onApprove, onReject, onEdit, onSubmitDraft, onConfirm, actionLoading, totalPay, actionMode, approvalRole } = props;

  switch (key) {
    case 'selection':
      return null;

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
          <span className="course-code" data-testid={`course-code-${timesheet.id}`}>
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
        <span className="hours-badge" data-testid={`hours-badge-${timesheet.id}`}>
          {formatters.hours(timesheet.hours)}
        </span>
      );

    case 'hourlyRate':
      return formatters.currency(timesheet.hourlyRate);

    case 'totalPay':
      return <strong>{formatters.currency(totalPay)}</strong>;

    case 'status':
      return (
        <StatusBadge
          status={timesheet.status}
          dataTestId={`status-badge-${timesheet.id}`}
        />
      );

    case 'description':
      return (
        <div
          className="description-cell" data-testid={`description-cell-${timesheet.id}`}
          title={timesheet.description}
        >
          {formatters.truncate(timesheet.description, 50)}
        </div>
      );

    case 'createdAt':
      return formatters.relativeTime(timesheet.createdAt);

    case 'actions': {
      if (actionMode === 'tutor') {
        const isDraft = timesheet.status === 'DRAFT' || timesheet.status === 'MODIFICATION_REQUESTED' || timesheet.status === 'REJECTED';
        const canConfirm = timesheet.status === 'PENDING_TUTOR_CONFIRMATION';

        return (
          <div className="action-buttons tutor-actions" data-testid="action-buttons">
            <button
              type="button"
              onClick={onEdit}
              disabled={!onEdit}
              className="edit-btn"
              title="Edit timesheet"
              data-testid={`edit-btn-${timesheet.id}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onSubmitDraft}
              disabled={!onSubmitDraft || !isDraft}
              className="submit-btn"
              title="Submit draft for approval"
              data-testid={`submit-btn-${timesheet.id}`}
            >
              Submit
            </button>
            {canConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={!onConfirm}
                className="confirm-btn"
                title="Confirm submitted timesheet"
                data-testid={`confirm-btn-${timesheet.id}`}
              >
                Confirm
              </button>
            )}
          </div>
        );
      }

      const { canApprove, canReject } = getActionPermissions(approvalRole, timesheet.status);
      secureLogger.debug('[TimesheetTable] action permissions', { role: approvalRole, status: timesheet.status, canApprove, canReject });

      if (!canApprove && !canReject) {
        return (
          <div className="action-buttons no-actions" data-testid="action-buttons">
            <span aria-hidden="true">—</span>
          </div>
        );
      }

      return (
        <div className="action-buttons" data-testid="action-buttons">
          {canApprove && (
            <button
              onClick={onApprove}
              disabled={actionLoading}
              className="approve-btn"
              title="Final approve timesheet"
              data-testid={`approve-btn-${timesheet.id}`}
            >
              {actionLoading ? <LoadingSpinner size="small" /> : 'Final Approve'}
            </button>
          )}
          {canReject && (
            <button
              onClick={onReject}
              disabled={actionLoading}
              className="reject-btn"
              title="Reject timesheet"
              data-testid={`reject-btn-${timesheet.id}`}
            >
              {actionLoading ? <LoadingSpinner size="small" /> : 'Reject'}
            </button>
          )}
        </div>
      );
    }

    default: {
      if (isTimesheetKey(key)) {
        const value = timesheet[key];

        if (value === undefined || value === null) {
          return '';
        }

        if (typeof value === 'string' || typeof value === 'number') {
          return value;
        }

        return String(value);
      }

      return '';
    }
  }
}

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
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll?.(event.target.checked);
  }, [onSelectAll]);

  const handleSort = useCallback((field: string) => {
    if (!onSort) {
      return;
    }

    const nextDirection: 'asc' | 'desc' = sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, nextDirection);
  }, [onSort, sortBy, sortDirection]);

  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <thead>
      <tr className="table-header">
        {showSelection && (
          <th scope="col" className="cell selection-cell header-cell">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={input => {
                if (input) {
                  input.indeterminate = isIndeterminate;
                }
              }}
              onChange={handleSelectAll}
              aria-label="Select all timesheets"
            />
          </th>
        )}

        {columns.filter(column => column.visible !== false).map(column => {
          const isSorted = sortBy === column.key;
          const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

          return (
            <th
              key={column.key}
              scope="col"
              className={`cell header-cell ${column.key}-header ${column.sortable ? 'sortable' : ''}`}
              style={{ width: column.width }}
              aria-sort={ariaSort}
              onClick={column.sortable ? () => handleSort(column.key) : undefined}
            >
              <span>{column.label}</span>
              {column.sortable && (
                <span className="sort-indicator" aria-hidden="true">
                  {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                </span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

const TimesheetTable: React.FC<TimesheetTableProps> = ({
  timesheets,
  loading = false,
  loadingMessage = 'Loading data...',
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
  onSort,
  actionMode = 'approval',
  approvalRole
}) => {
  const columns = useMemo<Column[]>(() => {
    const dynamicColumns: Column[] = [];

    if (showTutorInfo) {
      dynamicColumns.push(createColumn({
        key: 'tutor',
        label: 'Tutor',
        width: 150,
        sortable: true,
        visible: true,
      }));
    }

    if (showCourseInfo) {
      dynamicColumns.push(createColumn({
        key: 'course',
        label: 'Course',
        width: 150,
        sortable: true,
        visible: true,
      }));
    }

    dynamicColumns.push(
      createColumn({
        key: 'weekStartDate',
        label: 'Week Starting',
        width: 140,
        sortable: true,
        visible: true,
      }),
      createColumn({
        key: 'hours',
        label: 'Hours',
        width: 100,
        sortable: true,
        visible: true,
      }),
      createColumn({
        key: 'hourlyRate',
        label: 'Rate',
        width: 110,
        sortable: true,
        visible: true,
      }),
      createColumn({
        key: 'totalPay',
        label: 'Total Pay',
        width: 130,
        sortable: true,
        visible: true,
      }),
      createColumn({
        key: 'status',
        label: 'Status',
        width: 150,
        sortable: true,
        visible: true,
      }),
      createColumn({
        key: 'description',
        label: 'Description',
        width: 220,
        sortable: false,
        visible: true,
      }),
      createColumn({
        key: 'createdAt',
        label: 'Submitted',
        width: 140,
        sortable: true,
        visible: true,
      }),
    );

    if (showActions) {
      dynamicColumns.push(createColumn({
        key: 'actions',
        label: 'Actions',
        width: 180,
        sortable: false,
        visible: true,
      }));
    }

    return dynamicColumns;
  }, [showTutorInfo, showCourseInfo, showActions]);

  const virtualizationEnabled = timesheets.length >= virtualizeThreshold;

  const handleSelectAll = useCallback((selected: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    const nextSelection = selected ? timesheets.map(t => t.id) : [];
    onSelectionChange(nextSelection);
  }, [timesheets, onSelectionChange]);

  if (loading) {
    return (
      <div className={`timesheet-table-container loading ${className}`}>
        <div className="loading-state" data-testid="loading-state">
          <LoadingSpinner size="large" />
          <p data-testid="loading-text">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className={`timesheet-table-container empty ${className}`}>
        <div className="empty-state" data-testid="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc" role="img" aria-label="No timesheets">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
          </svg>
          <h3 data-testid="empty-state-title">No Timesheets</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`timesheet-table-container ${className}`}
      data-testid="timesheet-table"
      data-virtualized={virtualizationEnabled ? 'true' : 'false'}
    >
      <table className="timesheet-table" data-testid="timesheets-table" role="table" aria-label="Timesheets">
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
        <tbody className="table-rows">
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
              onSelectionChange={onSelectionChange ? (id, selected) => {
                if (!onSelectionChange) {
                  return;
                }

                const nextSelection = selected
                  ? (selectedIds.includes(id) ? selectedIds : [...selectedIds, id])
                  : selectedIds.filter(existingId => existingId !== id);

                onSelectionChange(nextSelection);
              } : undefined}
              showSelection={showSelection}
              actionMode={actionMode}
              approvalRole={approvalRole}
            />
          ))}
        </tbody>
      </table>

      {showSelection && selectedIds.length > 0 && (
        <div className="table-footer">
          <span>{selectedIds.length} of {timesheets.length} selected</span>
        </div>
      )}
    </div>
  );
};

TimesheetTable.displayName = 'TimesheetTable';

export default TimesheetTable;

































