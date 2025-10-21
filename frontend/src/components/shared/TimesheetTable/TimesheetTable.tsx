/**
 * Optimized Timesheet Table Component
 *
 * High-performance, fully optimized table component with virtualization,
 * memoization, and advanced features.
 */

import React, { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Timesheet, ApprovalAction } from '../../../types/api';
import { formatters } from '../../../utils/formatting';
import StatusBadge from '../StatusBadge/StatusBadge';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import RelativeTime from '../RelativeTime';
import TimesheetActions from './TimesheetActions';
import './TimesheetTable.css';
import { useUiConstraints } from '../../../lib/config/ui-config';
import { isFeatureEnabled } from '../../../lib/config/feature-flags';
import { BREAKPOINT_TOKENS, resolveCssVarNumber } from '../../../lib/config/table-config';

type UiConstraintSnapshot = ReturnType<typeof useUiConstraints>;

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
  actionsDisabled?: boolean;
  actionsDisabledReason?: string;
  pagination?: TimesheetTablePagination;
}

interface TimesheetTablePagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 50, 100];

type DerivedColumnKey = 'tutor' | 'course' | 'totalPay' | 'actions' | 'selection' | 'details' | 'timeline';
type TimesheetColumnKey = keyof Timesheet | DerivedColumnKey;

interface Column {
  key: TimesheetColumnKey;
  label: string;
  width: number;
  sortable?: boolean;
  visible?: boolean;
  render?: (timesheet: Timesheet, index: number) => React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
}

const createColumn = <K extends TimesheetColumnKey>(
  column: { key: K } & Omit<Column, 'key'>
): Column => column;

const parseBreakpointFallback = (fallback?: string): number => {
  if (!fallback) {
    return 0;
  }
  const numeric = Number.parseFloat(fallback);
  return Number.isFinite(numeric) ? numeric : 0;
};

const defaultColumnLayoutClass = 'min-w-[8rem] !whitespace-nowrap !break-normal';
const columnLayoutClasses: Partial<Record<TimesheetColumnKey, string>> = {
  tutor: 'min-w-[14rem] !whitespace-nowrap !break-normal',
  course: 'min-w-[12rem] !whitespace-nowrap !break-normal',
  weekStartDate: 'min-w-[8rem] !whitespace-nowrap !break-normal',
  hours: 'min-w-[5rem] !whitespace-nowrap !break-normal !text-right',
  hourlyRate: 'min-w-[6.5rem] !whitespace-nowrap !break-normal !text-right',
  totalPay: 'min-w-[7.5rem] !whitespace-nowrap !break-normal !text-right',
  status: 'min-w-[9rem] !whitespace-nowrap !break-normal',
  lastUpdated: 'min-w-[9rem] !whitespace-nowrap !break-normal',
  description: 'min-w-[18rem] !whitespace-normal !break-words',
  timeline: 'min-w-[12rem] !whitespace-nowrap !break-normal',
  actions: 'min-w-[12rem] !whitespace-nowrap !break-normal',
  details: 'min-w-[6rem] !whitespace-nowrap !break-normal',
};
const selectionColumnLayoutClass = 'min-w-[3.5rem] !whitespace-nowrap !break-normal';
const baseCellPaddingClass = 'px-4 py-3 text-sm align-middle';
const numericColumnKeys: TimesheetColumnKey[] = ['hours', 'hourlyRate', 'totalPay'];
const numericColumnSet = new Set<TimesheetColumnKey>(numericColumnKeys);

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
  actionsDisabled?: boolean;
  actionsDisabledReason?: string;
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
  style,
  actionsDisabled = false,
  actionsDisabledReason,
}) => {
  const uiConstraints = useUiConstraints();
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useMemo(() => `timesheet-${timesheet.id}-details`, [timesheet.id]);

  const visibleColumns = useMemo(
    () => columns.filter(column => column.visible !== false),
    [columns],
  );

  const detailColumns = useMemo(
    () => visibleColumns.filter(column =>
      (column.priority === 'low' || column.priority === 'medium') &&
      column.key !== 'actions' &&
      column.key !== 'details'
    ),
    [visibleColumns],
  );

  const hasDetailColumns = detailColumns.length > 0;

  useEffect(() => {
    setIsExpanded(false);
  }, [timesheet.id, columns]);

  const handleRowClick = useCallback(() => {
    onRowClick?.(timesheet);
  }, [timesheet, onRowClick]);

  const handleSelectionChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (actionsDisabled) {
      event.preventDefault();
      return;
    }
    onSelectionChange?.(timesheet.id, event.target.checked);
  }, [actionsDisabled, timesheet.id, onSelectionChange]);

  const handleApprove = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (actionLoading || actionsDisabled || !onApprovalAction) {
      return;
    }
    const action = getApproveActionForRole(approvalRole);
    onApprovalAction(timesheet.id, action);
  }, [actionLoading, actionsDisabled, approvalRole, onApprovalAction, timesheet.id]);

  const handleReject = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (actionLoading || actionsDisabled || !onApprovalAction) {
      return;
    }
    onApprovalAction(timesheet.id, 'REJECT');
  }, [actionLoading, actionsDisabled, onApprovalAction, timesheet.id]);

  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (actionLoading || actionsDisabled || !onApprovalAction) {
      return;
    }
    onApprovalAction(timesheet.id, 'EDIT');
  }, [actionLoading, actionsDisabled, onApprovalAction, timesheet.id]);

  const handleSubmitDraft = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (actionLoading || actionsDisabled || !onApprovalAction) {
      return;
    }
    onApprovalAction(timesheet.id, 'SUBMIT_DRAFT');
  }, [actionLoading, actionsDisabled, onApprovalAction, timesheet.id]);

  const handleConfirm = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (actionLoading || actionsDisabled || !onApprovalAction) {
      return;
    }
    onApprovalAction(timesheet.id, 'TUTOR_CONFIRM');
  }, [actionLoading, actionsDisabled, onApprovalAction, timesheet.id]);

  const handleToggleDetails = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (!hasDetailColumns) {
      return;
    }
    setIsExpanded(previous => !previous);
  }, [hasDetailColumns]);

  const totalPay = useMemo(() => timesheet.hours * timesheet.hourlyRate, [timesheet.hours, timesheet.hourlyRate]);

  const cellContentCache = new Map<TimesheetColumnKey, React.ReactNode>();
  const baseCellProps: CellRendererProps = {
    onApprove: handleApprove,
    onReject: handleReject,
    onEdit: handleEdit,
    onSubmitDraft: handleSubmitDraft,
    onConfirm: handleConfirm,
    actionLoading,
    totalPay,
    actionMode,
    approvalRole,
    actionsDisabled,
    actionsDisabledReason,
    onToggleDetails: handleToggleDetails,
    detailsId,
    detailsExpanded: isExpanded,
    detailsAvailable: hasDetailColumns,
    constraints: uiConstraints,
  };

  const getCellContent = (column: Column): React.ReactNode => {
    if (cellContentCache.has(column.key)) {
      return cellContentCache.get(column.key) ?? null;
    }

    const content = column.render
      ? column.render(timesheet, index)
      : renderDefaultCell(column.key, timesheet, baseCellProps);

    cellContentCache.set(column.key, content);
    return content;
  };

  const detailCellProps: CellRendererProps = {
    ...baseCellProps,
    isDetailContent: true,
  };

  const getDetailContent = (key: TimesheetColumnKey): React.ReactNode => {
    const column = visibleColumns.find(item => item.key === key);

    if (column?.render) {
      return column.render(timesheet, index);
    }

    if (isTimesheetKey(key)) {
      return renderDefaultCell(key, timesheet, detailCellProps);
    }

    return renderDefaultCell(key, timesheet, detailCellProps);
  };

  const detailEntries = detailColumns.map((column) => ({
    key: column.key,
    label: column.label,
    content: getDetailContent(column.key),
  }));

  const columnSpan = visibleColumns.length + (showSelection ? 1 : 0);

  return (
    <Fragment>
      <tr
        className={`timesheet-row ${selected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
        onClick={handleRowClick}
        data-testid={`timesheet-row-${timesheet.id}`}
        style={style}
      >
        {showSelection && (
          <td className={`cell selection-cell priority-high ${baseCellPaddingClass} ${selectionColumnLayoutClass}`}>
            <label className="selection-input-wrapper">
              <input
                type="checkbox"
                checked={selected}
                onChange={handleSelectionChange}
                disabled={actionsDisabled}
                title={actionsDisabled ? (actionsDisabledReason ?? 'Selection is disabled while actions are locked.') : undefined}
                aria-label={`Select timesheet ${timesheet.id}`}
              />
            </label>
          </td>
        )}

        {visibleColumns.map(column => {
          const priorityClass = `priority-${column.priority ?? 'high'}`;
          const layoutClass = columnLayoutClasses[column.key] ?? defaultColumnLayoutClass;
          const actionsClass = column.key === 'actions' ? 'actions-cell' : '';
          const cellClassName = [
            'cell',
            `${column.key}-cell`,
            priorityClass,
            baseCellPaddingClass,
            layoutClass,
            actionsClass,
            numericColumnSet.has(column.key) ? 'numeric-cell' : '',
          ].filter(Boolean).join(' ');
          return (
            <td
              key={column.key}
              className={cellClassName}
              style={{ width: column.width }}
              data-priority={column.priority ?? 'high'}
              data-column={column.key}
            >
              {getCellContent(column)}
            </td>
          );
        })}
      </tr>

      {hasDetailColumns && (
        <tr
          className={`timesheet-detail-row ${isExpanded ? 'is-expanded' : ''}`}
          aria-hidden={!isExpanded}
          data-testid={`timesheet-details-row-${timesheet.id}`}
        >
          <td className={`cell detail-cell ${baseCellPaddingClass} !whitespace-normal !break-words`} colSpan={columnSpan}>
            <div
              id={detailsId}
              className="timesheet-detail-content"
              role="region"
              aria-label={`Hidden details for timesheet ${timesheet.id}`}
            >
              <dl className="timesheet-detail-grid">
                {detailEntries.map(entry => (
                  <div key={entry.key} className="timesheet-detail-item">
                    <dt>{entry.label}</dt>
                    <dd>{entry.content}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
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
  actionsDisabled: boolean;
  actionsDisabledReason?: string;
  onToggleDetails?: (event: React.MouseEvent) => void;
  detailsId?: string;
  detailsExpanded?: boolean;
  detailsAvailable?: boolean;
  isDetailContent?: boolean;
  constraints: UiConstraintSnapshot;
}

const APPROVE_ACTION_BY_ROLE: Record<ApprovalRole, ApprovalAction> = {
  LECTURER: 'LECTURER_CONFIRM',
  ADMIN: 'HR_CONFIRM',
  HR: 'HR_CONFIRM',
};

function getApproveActionForRole(role?: ApprovalRole): ApprovalAction {
  if (!role) {
    return 'LECTURER_CONFIRM';
  }
  return APPROVE_ACTION_BY_ROLE[role];
}

const isTimesheetKey = (key: TimesheetColumnKey): key is keyof Timesheet => {
  return key !== 'tutor'
    && key !== 'course'
    && key !== 'totalPay'
    && key !== 'actions'
    && key !== 'selection'
    && key !== 'details';
};

function renderDefaultCell(
  key: TimesheetColumnKey,
  timesheet: Timesheet,
  props: CellRendererProps
): React.ReactNode {
  const {
    onApprove,
    onReject,
    onEdit,
    onSubmitDraft,
    onConfirm,
    actionLoading,
    totalPay,
    actionMode,
    approvalRole,
    actionsDisabled,
    actionsDisabledReason,
    onToggleDetails,
    detailsId,
    detailsExpanded,
    detailsAvailable,
    constraints,
  } = props;

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
      if (props.isDetailContent) {
        return (
          <span className="detail-hours">
            {formatters.hours(timesheet.hours)}
            <span className="detail-hours__limit">
              / {constraints.HOURS_MAX}h max
            </span>
          </span>
        );
      }
      return (
        <span className="hours-badge" data-testid={`hours-badge-${timesheet.id}`}>
          {formatters.hours(timesheet.hours)}
        </span>
      );

    case 'hourlyRate':
      return formatters.currency(timesheet.hourlyRate);

    case 'totalPay':
      return (
        <strong
          className="total-pay-value"
          data-testid={`total-pay-${timesheet.id}`}
        >
          {formatters.currency(totalPay)}
        </strong>
      );

    case 'status':
      return (
        <StatusBadge
          status={timesheet.status}
          dataTestId={`status-badge-${timesheet.id}`}
          lastModified={timesheet.updatedAt}
          submittedAt={timesheet.createdAt}
          showTimestampTooltip
        />
      );

    case 'lastUpdated': {
      const referenceTimestamp = timesheet.updatedAt ?? timesheet.createdAt;
      return (
        <span className="last-updated-cell" data-testid={`last-updated-${timesheet.id}`}>
          {referenceTimestamp ? formatters.dateTime(referenceTimestamp) : '—'}
        </span>
      );
    }

    case 'description':
      return (
        <div
          className="description-cell" data-testid={`description-cell-${timesheet.id}`}
          title={timesheet.description}
        >
          {formatters.truncate(timesheet.description, 50)}
        </div>
      );

    case 'timeline': {
      const activity = formatters.activity(timesheet.createdAt, timesheet.updatedAt);

      return (
        <div className="timeline-cell" data-testid={`timesheet-activity-${timesheet.id}`}>
          <div className="timeline-primary">
            <span className="timeline-headline">{activity.headline}</span>
            <RelativeTime
              timestamp={activity.primaryTimestamp}
              className="timeline-relative"
            />
          </div>
          <div className="timeline-meta" aria-live="polite">
            <span className="timeline-absolute">{activity.primaryAbsoluteLabel}</span>
            {activity.hasUpdates ? (
              <span className="timeline-submitted">Submitted {activity.createdAbsoluteLabel}</span>
            ) : null}
          </div>
        </div>
      );
    }

    case 'actions': {
      // Determine the correct mode based on actionMode and approvalRole
      let mode: 'tutor' | 'lecturer' | 'admin' = 'tutor';
      
      if (actionMode !== 'tutor') {
        mode = approvalRole === 'ADMIN' ? 'admin' : 'lecturer';
      }

      return (
        <TimesheetActions
          timesheet={timesheet}
          mode={mode}
          loading={actionLoading === timesheet.id}
          disabled={actionsDisabled}
          disabledReason={actionsDisabledReason}
          onEdit={onEdit}
          onSubmit={onSubmitDraft}
          onConfirm={onConfirm}
          onApprove={onApprove}
          onReject={onReject}
        />
      );
    }

    case 'details': {
      const disabled = !detailsAvailable || !onToggleDetails;
      const expanded = Boolean(detailsExpanded);

      return (
        <div className="details-toggle">
          <button
            type="button"
            onClick={onToggleDetails}
            disabled={disabled}
            className="details-toggle__button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            data-testid={`details-toggle-${timesheet.id}`}
            title={disabled ? 'No additional details to show.' : expanded ? 'Hide additional details' : 'Show additional details'}
          >
            {expanded ? 'Hide Details' : 'Details'}
          </button>
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
  disabled?: boolean;
  disabledReason?: string;
}

const TableHeader = memo<TableHeaderProps>(({
  columns,
  showSelection = false,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  sortBy,
  sortDirection,
  onSort,
  disabled = false,
  disabledReason,
}) => {
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onSelectAll?.(event.target.checked);
  }, [disabled, onSelectAll]);

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
          <th
            scope="col"
            className={`cell selection-cell header-cell ${baseCellPaddingClass} ${selectionColumnLayoutClass}`}
          >
            <label className="selection-input-wrapper">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) {
                    input.indeterminate = isIndeterminate;
                  }
                }}
                onChange={handleSelectAll}
                disabled={disabled}
                title={disabled ? (disabledReason ?? 'Selection is disabled while actions are locked.') : undefined}
                aria-label="Select all timesheets"
              />
            </label>
          </th>
        )}

        {columns.filter(column => column.visible !== false).map(column => {
          const isSorted = sortBy === column.key;
          const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
          const priorityClass = `priority-${column.priority ?? 'high'}`;
          const isSortable = Boolean(column.sortable);
          const layoutClass = columnLayoutClasses[column.key] ?? defaultColumnLayoutClass;
          const headerClassName = [
            'cell',
            'header-cell',
            `${column.key}-header`,
            isSortable ? 'sortable' : '',
            priorityClass,
            baseCellPaddingClass,
            layoutClass,
            numericColumnSet.has(column.key) ? 'numeric-header' : '',
          ].filter(Boolean).join(' ');

          return (
            <th
              key={column.key}
              scope="col"
              className={headerClassName}
              data-priority={column.priority ?? 'high'}
              data-column={column.key}
              style={{ width: column.width }}
              aria-sort={ariaSort}
            >
              {isSortable ? (
                <button
                  type="button"
                  className="sortable-header-button"
                  onClick={() => handleSort(column.key)}
                >
                  <span>{column.label}</span>
                  <span className="sort-indicator" aria-hidden="true">
                    {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
                  </span>
                </button>
              ) : (
                <span>{column.label}</span>
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
  approvalRole,
  actionsDisabled = false,
  actionsDisabledReason,
  pagination,
}) => {
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : Number.MAX_SAFE_INTEGER));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const tabletBreakpoint = useMemo(
    () => resolveCssVarNumber(BREAKPOINT_TOKENS.tablet) ?? parseBreakpointFallback(BREAKPOINT_TOKENS.tablet.fallback),
    [],
  );
  const tabletLandscapeBreakpoint = useMemo(
    () =>
      resolveCssVarNumber(BREAKPOINT_TOKENS.tabletLandscape) ??
      parseBreakpointFallback(BREAKPOINT_TOKENS.tabletLandscape.fallback),
    [],
  );

  const activityColumnEnabled = isFeatureEnabled('ENABLE_ACTIVITY_COLUMN');
  const columns = useMemo<Column[]>(() => {
    const dynamicColumns: Column[] = [];

    if (showTutorInfo) {
      dynamicColumns.push(createColumn({
        key: 'tutor',
        label: 'Tutor',
        width: 150,
        sortable: true,
        visible: true,
        priority: 'high',
      }));
    }

    if (showCourseInfo) {
      dynamicColumns.push(createColumn({
        key: 'course',
        label: 'Course',
        width: 150,
        sortable: true,
        visible: true,
        priority: 'high',
      }));
    }

    dynamicColumns.push(
      createColumn({
        key: 'weekStartDate',
        label: 'Week Starting',
        width: 140,
        sortable: true,
        visible: true,
        priority: 'medium',
      }),
      createColumn({
        key: 'hours',
        label: 'Hours',
        width: 100,
        sortable: true,
        visible: true,
        priority: 'medium',
      }),
      createColumn({
        key: 'hourlyRate',
        label: 'Rate',
        width: 110,
        sortable: true,
        visible: true,
        priority: 'low',
      }),
      createColumn({
        key: 'totalPay',
        label: 'Total Pay',
        width: 130,
        sortable: true,
        visible: true,
        priority: 'high',
      }),
      createColumn({
        key: 'status',
        label: 'Status',
        width: 150,
        sortable: true,
        visible: true,
        priority: 'high',
      }),
      createColumn({
        key: 'lastUpdated',
        label: 'Last Updated',
        width: 160,
        sortable: true,
        visible: true,
        priority: 'medium',
      }),
      createColumn({
        key: 'description',
        label: 'Description',
        width: 220,
        sortable: false,
        visible: true,
        priority: 'low',
      }),
    );

    if (activityColumnEnabled) {
      dynamicColumns.push(
        createColumn({
          key: 'timeline',
          label: 'Activity',
          width: 180,
          sortable: true,
          visible: true,
          priority: 'medium',
        }),
      );
    }

    if (showActions) {
      dynamicColumns.push(createColumn({
        key: 'actions',
        label: 'Actions',
        width: 180,
        sortable: false,
        visible: true,
        priority: 'high',
      }));
    }

    dynamicColumns.push(createColumn({
      key: 'details',
      label: 'Details',
      width: 120,
      sortable: false,
      visible: true,
      priority: 'high',
    }));

    const responsiveColumns = dynamicColumns.filter((column) => {
      if (column.key === 'hourlyRate') {
        return viewportWidth > tabletLandscapeBreakpoint;
      }

      if (column.key === 'hours') {
        return viewportWidth > tabletBreakpoint;
      }

      if (column.key === 'description') {
        return viewportWidth > tabletBreakpoint;
      }

      if (column.key === 'lastUpdated') {
        return viewportWidth > tabletLandscapeBreakpoint;
      }

      return true;
    });

    return responsiveColumns;
  }, [activityColumnEnabled, showActions, showCourseInfo, showTutorInfo, tabletBreakpoint, tabletLandscapeBreakpoint, viewportWidth]);

  const virtualizationEnabled = timesheets.length >= virtualizeThreshold;
  const containerBaseClass = ['timesheet-table-container', 'overflow-x-auto', className].filter(Boolean).join(' ');

  const renderPagination = () => {
    if (!pagination) {
      return null;
    }

    const {
      currentPage,
      pageSize,
      totalCount,
      pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
      onPageChange,
      onPageSizeChange,
    } = pagination;

    const safePageSize = Math.max(pageSize, 1);
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
    const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);
    const canGoPrevious = safePage > 0 && Boolean(onPageChange);
    const canGoNext = safePage < totalPages - 1 && Boolean(onPageChange);

    const handlePageChange = (nextPage: number) => {
      if (!onPageChange) {
        return;
      }
      const clamped = Math.min(Math.max(nextPage, 0), totalPages - 1);
      if (clamped !== safePage) {
        onPageChange(clamped);
      }
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSize = Number(event.target.value);
      if (!Number.isFinite(nextSize) || nextSize <= 0) {
        return;
      }
      if (onPageSizeChange) {
        onPageSizeChange(nextSize);
      }
      if (onPageChange) {
        onPageChange(0);
      }
    };

    return (
      <div
        className="flex flex-wrap items-center gap-4"
        role="navigation"
        aria-label="Pagination"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Go to previous page"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={!canGoPrevious}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Page <span className="font-medium text-foreground">{safePage + 1}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>
          <button
            type="button"
            className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Go to next page"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={!canGoNext}
          >
            Next
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows per page
          <select
            value={safePageSize}
            onChange={handlePageSizeChange}
            aria-label="Rows per page"
            className="h-11 min-w-[4.5rem] rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!onPageSizeChange}
          >
            {[...new Set([...pageSizeOptions, safePageSize])]
              .sort((a, b) => a - b)
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
        </label>
      </div>
    );
  };

  const handleSelectAll = useCallback((selected: boolean) => {
    if (!onSelectionChange || actionsDisabled) {
      return;
    }

    const nextSelection = selected ? timesheets.map(t => t.id) : [];
    onSelectionChange(nextSelection);
  }, [timesheets, onSelectionChange, actionsDisabled]);

  if (loading) {
    return (
      <div className={`${containerBaseClass} loading`}>
        <div className="loading-state" data-testid="loading-state">
          <LoadingSpinner size="large" />
          <p data-testid="loading-text">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className={`${containerBaseClass} empty`}>
        <div className="empty-state" data-testid="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="No timesheets">
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
      className={containerBaseClass}
      data-virtualized={virtualizationEnabled ? 'true' : 'false'}
      style={{ overflowX: 'auto' }}
    >
      <table
        className="timesheet-table w-full"
        data-testid="timesheets-table"
        role="table"
        aria-label="Timesheets"
      >
        <TableHeader
          columns={columns}
          showSelection={showSelection}
          selectedCount={selectedIds.length}
          totalCount={timesheets.length}
          onSelectAll={handleSelectAll}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          disabled={actionsDisabled}
          disabledReason={actionsDisabledReason}
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
                if (actionsDisabled) {
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
              actionsDisabled={actionsDisabled}
              actionsDisabledReason={actionsDisabledReason}
            />
          ))}
        </tbody>
      </table>

      {(pagination || (showSelection && selectedIds.length > 0)) && (
        <div className="table-footer flex flex-wrap items-center justify-between gap-4 pt-4">
          {pagination && renderPagination()}
          {showSelection && selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} of {timesheets.length} selected
            </span>
          )}
        </div>
      )}
    </div>
  );
};

TimesheetTable.displayName = 'TimesheetTable';

export default TimesheetTable;






















