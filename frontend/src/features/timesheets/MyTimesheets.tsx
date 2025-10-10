import React, { useEffect, useId, useMemo, useState } from 'react';
import clsx from 'clsx';

import TimesheetTable from '../../components/shared/TimesheetTable/TimesheetTable';
import { useTimesheetQuery } from '../../hooks/timesheets';
import type { Timesheet, TimesheetQuery, ApprovalAction } from '../../types/api';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

export interface MyTimesheetsProps {
  initialQuery?: TimesheetQuery;
  className?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  onRowClick?: (timesheet: Timesheet) => void;
  onApprovalAction?: (timesheetId: number, action: ApprovalAction) => void;
}

export const MyTimesheets: React.FC<MyTimesheetsProps> = ({
  initialQuery,
  className,
  title = 'My Timesheets',
  description,
  emptyMessage = 'No timesheets found.',
  onRowClick,
  onApprovalAction,
}) => {
  const headingId = useId();
  const [fallbackPage, setFallbackPage] = useState(initialQuery?.page ?? 0);
  const [fallbackPageSize, setFallbackPageSize] = useState(
    initialQuery?.size ?? DEFAULT_PAGE_SIZE,
  );

  const {
    data,
    timesheets,
    loading,
    error,
    totalCount,
    currentPage,
    updateQuery,
  } = useTimesheetQuery({
    page: initialQuery?.page ?? 0,
    size: initialQuery?.size ?? DEFAULT_PAGE_SIZE,
    sortBy: initialQuery?.sortBy,
    sortDirection: initialQuery?.sortDirection,
    status: initialQuery?.status,
    courseId: initialQuery?.courseId,
    tutorId: initialQuery?.tutorId,
  });

  const serverPagination = Boolean(data?.pageInfo);

  useEffect(() => {
    if (serverPagination) {
      setFallbackPage(0);
      setFallbackPageSize(data?.pageInfo?.pageSize ?? DEFAULT_PAGE_SIZE);
    }
  }, [serverPagination, data?.pageInfo?.pageSize]);

  const effectivePage = serverPagination ? currentPage : fallbackPage;
  const effectivePageSize = serverPagination
    ? data?.pageInfo?.pageSize ?? DEFAULT_PAGE_SIZE
    : fallbackPageSize;

  const effectiveTotal = serverPagination
    ? data?.pageInfo?.totalElements ?? totalCount
    : timesheets.length;

  const displayedTimesheets = useMemo(() => {
    if (serverPagination) {
      return timesheets;
    }
    const start = effectivePage * effectivePageSize;
    return timesheets.slice(start, start + effectivePageSize);
  }, [effectivePage, effectivePageSize, serverPagination, timesheets]);

  const handlePageChange = (page: number) => {
    if (serverPagination) {
      updateQuery({ page });
    } else {
      setFallbackPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (serverPagination) {
      updateQuery({ page: 0, size });
    } else {
      setFallbackPage(0);
      setFallbackPageSize(size);
    }
  };

  const containerClass = clsx('space-y-4', className);

  return (
    <section className={containerClass} aria-labelledby={headingId}>
      <div>
        <h2 id={headingId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <TimesheetTable
        timesheets={displayedTimesheets}
        loading={loading}
        loadingMessage="Loading timesheets..."
        onRowClick={onRowClick}
        onApprovalAction={onApprovalAction}
        showActions={Boolean(onApprovalAction)}
        showTutorInfo
        showCourseInfo
        showSelection={Boolean(onApprovalAction)}
        emptyMessage={emptyMessage}
        pagination={{
          currentPage: effectivePage,
          pageSize: effectivePageSize,
          totalCount: effectiveTotal,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </section>
  );
};

export default MyTimesheets;
