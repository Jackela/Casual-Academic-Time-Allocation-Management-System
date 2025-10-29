import { memo } from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import type { LecturerCourseOption, LecturerDashboardFilters } from '../../../../types/dashboard/lecturer-dashboard';

interface LecturerFiltersPanelProps {
  filters: LecturerDashboardFilters;
  courseOptions: LecturerCourseOption[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onUpdateFilters: (updates: Partial<LecturerDashboardFilters>) => void;
  onClearFilters: () => void;
}

const LecturerFiltersPanel = memo<LecturerFiltersPanelProps>(({ filters, courseOptions, isRefreshing, onRefresh, onUpdateFilters, onClearFilters }) => {
  const hasActiveFilters =
    filters.showOnlyUrgent || filters.searchQuery.trim().length > 0 || filters.courseId !== 'ALL';

  return (
    <section
      className="mb-6 space-y-4 rounded-lg border border-border bg-background/60 p-4"
      aria-label="Filter and quick actions"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Quick filters:</span>
          <Button
            size="sm"
            variant={filters.showOnlyUrgent ? 'default' : 'outline'}
            onClick={() => onUpdateFilters({ showOnlyUrgent: !filters.showOnlyUrgent })}
            data-testid="toggle-urgent-filter"
          >
            {filters.showOnlyUrgent ? 'Showing urgent only' : 'Urgent only'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="lecturer-course-select" className="text-sm font-medium text-muted-foreground">
            Course
          </label>
          <select
            id="lecturer-course-select"
            name="course"
            value={filters.courseId}
            onChange={(event) => onUpdateFilters({ courseId: event.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="ALL">All courses</option>
            {courseOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Input
            id="lecturer-search"
            name="lecturer-search"
            placeholder="Search tutor or course"
            value={filters.searchQuery}
            onChange={(event) => onUpdateFilters({ searchQuery: event.target.value })}
            className="h-9 w-full min-w-[200px] max-w-xs"
          />

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="small" />
                Refreshing
              </span>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          data-testid="clear-filters-button"
        >
          Clear filters
        </Button>
        {filters.showOnlyUrgent && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            Urgent filter enabled
          </span>
        )}
      </div>
    </section>
  );
});

LecturerFiltersPanel.displayName = 'LecturerFiltersPanel';

export default LecturerFiltersPanel;
