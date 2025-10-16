/**
 * Timesheet Table Column Configuration (SSOT)
 *
 * Provides a configuration-driven definition for the timesheet table.
 * Column layout relies on design token CSS custom properties rather than
 * hard-coded pixel values to keep layout parameters centralized.
 */

export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'actions' | 'custom';
export type Alignment = 'left' | 'right' | 'center';
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1 = highest (never hide)

export interface CssVarReference {
  /** Name of the CSS custom property, e.g. `--breakpoint-tablet` */
  name: string;
  /** Optional fallback value (e.g. `1024px`) if the CSS variable cannot be resolved */
  fallback?: string;
}

export interface ColumnDimension {
  width?: CssVarReference;
  minWidth?: CssVarReference;
  maxWidth?: CssVarReference;
}

export type TimesheetColumnKey =
  | 'tutor'
  | 'course'
  | 'weekStartDate'
  | 'hours'
  | 'hourlyRate'
  | 'totalPay'
  | 'status'
  | 'actions'
  | 'description'
  | 'lastUpdated'
  | 'timeline'
  | 'details';

type FormatterModule = typeof import('../formatters/date-formatters');
type FormatterKey = Extract<
  keyof FormatterModule,
  'formatWeekDate' | 'formatCurrency' | 'formatAbsoluteDateTime'
>;

export interface ColumnConfig extends ColumnDimension {
  key: TimesheetColumnKey;
  label: string;
  type: ColumnType;
  priority: Priority;
  align?: Alignment;
  formatterKey?: FormatterKey;
  hiddenBreakpoints?: CssVarReference[];
  ellipsis?: boolean;
  maxLines?: number;
  sortable?: boolean;
  tooltip?: string;
}

const createCssVarReference = (name: string, fallback: string): CssVarReference => ({
  name,
  fallback,
});

export const BREAKPOINT_TOKENS = {
  mobile: createCssVarReference('--breakpoint-mobile', '768px'),
  tablet: createCssVarReference('--breakpoint-tablet', '1024px'),
  tabletLandscape: createCssVarReference('--breakpoint-tablet-landscape', '1280px'),
  desktop: createCssVarReference('--breakpoint-desktop', '1440px'),
  desktopWide: createCssVarReference('--breakpoint-desktop-wide', '1920px'),
} as const;

export const COLUMN_WIDTH_TOKENS = {
  tutor: createCssVarReference('--col-tutor-width', '150px'),
  course: createCssVarReference('--col-course-width', '150px'),
  weekStart: createCssVarReference('--col-week-starting-width', '140px'),
  hours: createCssVarReference('--col-hours-width', '100px'),
  rate: createCssVarReference('--col-rate-width', '110px'),
  totalPay: createCssVarReference('--col-total-pay-width', '130px'),
  status: createCssVarReference('--col-status-width', '160px'),
  description: createCssVarReference('--col-description-width', '220px'),
  lastUpdated: createCssVarReference('--col-last-updated-width', '150px'),
  actions: createCssVarReference('--col-actions-width', '200px'),
  details: createCssVarReference('--col-details-width', '120px'),
} as const;

const DEFAULT_CSS_TARGET = (): HTMLElement | null =>
  typeof document !== 'undefined' ? document.documentElement : null;

const normalizeViewportWidth = (width: number): number => {
  if (!Number.isFinite(width)) {
    return 0;
  }
  return Math.round(width * 100) / 100;
};

export const readCssVar = (
  reference: CssVarReference,
  target: HTMLElement | null = DEFAULT_CSS_TARGET(),
): string | undefined => {
  if (!target) return reference.fallback;

  const value = getComputedStyle(target).getPropertyValue(reference.name).trim();
  if (value) return value;
  return reference.fallback;
};

export const resolveCssVarNumber = (
  reference: CssVarReference,
  target?: HTMLElement | null,
): number | null => {
  const raw = readCssVar(reference, target ?? DEFAULT_CSS_TARGET());
  if (!raw) return null;

  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  return Number(match[0]);
};

export const TIMESHEET_COLUMNS: ColumnConfig[] = [
  {
    key: 'tutor',
    label: 'Tutor',
    type: 'custom',
    priority: 2,
    sortable: true,
    ellipsis: true,
    tooltip: 'Tutor name and identifier',
    width: COLUMN_WIDTH_TOKENS.tutor,
    minWidth: COLUMN_WIDTH_TOKENS.tutor,
  },
  {
    key: 'course',
    label: 'Course',
    type: 'text',
    priority: 3,
    ellipsis: true,
    sortable: true,
    tooltip: 'Course name and code',
    width: COLUMN_WIDTH_TOKENS.course,
    minWidth: COLUMN_WIDTH_TOKENS.course,
  },
  {
    key: 'weekStartDate',
    label: 'Week Starting',
    type: 'date',
    priority: 5,
    formatterKey: 'formatWeekDate',
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.weekStart,
    minWidth: COLUMN_WIDTH_TOKENS.weekStart,
  },
  {
    key: 'hours',
    label: 'Hours',
    type: 'number',
    priority: 7,
    align: 'right',
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.hours,
    minWidth: COLUMN_WIDTH_TOKENS.hours,
    hiddenBreakpoints: [BREAKPOINT_TOKENS.tablet, BREAKPOINT_TOKENS.mobile],
  },
  {
    key: 'hourlyRate',
    label: 'Rate',
    type: 'number',
    priority: 8,
    align: 'right',
    formatterKey: 'formatCurrency',
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.rate,
    minWidth: COLUMN_WIDTH_TOKENS.rate,
    hiddenBreakpoints: [BREAKPOINT_TOKENS.tabletLandscape],
  },
  {
    key: 'totalPay',
    label: 'Total Pay',
    type: 'number',
    priority: 4,
    align: 'right',
    formatterKey: 'formatCurrency',
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.totalPay,
    minWidth: COLUMN_WIDTH_TOKENS.totalPay,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'status',
    priority: 1,
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.status,
    minWidth: COLUMN_WIDTH_TOKENS.status,
    maxWidth: COLUMN_WIDTH_TOKENS.status,
  },
  {
    key: 'lastUpdated',
    label: 'Last updated',
    type: 'date',
    priority: 6,
    formatterKey: 'formatAbsoluteDateTime',
    sortable: true,
    width: COLUMN_WIDTH_TOKENS.lastUpdated,
    minWidth: COLUMN_WIDTH_TOKENS.lastUpdated,
    hiddenBreakpoints: [BREAKPOINT_TOKENS.tabletLandscape],
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    priority: 8,
    sortable: false,
    ellipsis: true,
    maxLines: 2,
    width: COLUMN_WIDTH_TOKENS.description,
    minWidth: COLUMN_WIDTH_TOKENS.description,
    hiddenBreakpoints: [BREAKPOINT_TOKENS.tablet],
  },
  {
    key: 'actions',
    label: 'Actions',
    type: 'actions',
    priority: 1,
    sortable: false,
    width: COLUMN_WIDTH_TOKENS.actions,
    minWidth: COLUMN_WIDTH_TOKENS.actions,
    maxWidth: COLUMN_WIDTH_TOKENS.actions,
  },
  {
    key: 'details',
    label: 'Details',
    type: 'custom',
    priority: 2,
    sortable: false,
    width: COLUMN_WIDTH_TOKENS.details,
    minWidth: COLUMN_WIDTH_TOKENS.details,
  },
];

export const getVisibleColumns = (
  columns: ColumnConfig[],
  viewportWidth: number,
  target?: HTMLElement | null,
): ColumnConfig[] => {
  const normalizedViewport = normalizeViewportWidth(viewportWidth);

  return columns.filter((column) => {
    if (!column.hiddenBreakpoints || column.hiddenBreakpoints.length === 0) {
      return true;
    }

    return !column.hiddenBreakpoints.some((breakpoint) => {
      const resolved = resolveCssVarNumber(breakpoint, target);
      if (resolved === null) return false;
      const normalizedBreakpoint = Math.round(resolved * 100) / 100;
      const epsilon = 0.001;
      return normalizedViewport < (normalizedBreakpoint + epsilon);
    });
  });
};

export const sortByPriority = (a: ColumnConfig, b: ColumnConfig): number => a.priority - b.priority;

export const COLUMN_CLASS_NAMES = TIMESHEET_COLUMNS.reduce<
  Record<TimesheetColumnKey, { cell: string; header: string }>
>((acc, column) => {
  acc[column.key] = {
    cell: `${column.key}-cell`,
    header: `${column.key}-header`,
  };
  return acc;
}, {} as Record<TimesheetColumnKey, { cell: string; header: string }>);

export const getColumnSelector = (
  key: string,
  type: 'cell' | 'header' = 'cell',
): string => {
  const mapping = COLUMN_CLASS_NAMES[key as TimesheetColumnKey];

  if (!mapping) {
    const suffix = type === 'header' ? 'header' : 'cell';
    return `.${key}-${suffix}`;
  }

  return `.${mapping[type]}`;
};

export const TABLE_LAYOUT_SELECTORS = {
  tableContainer: '[data-testid="timesheets-table"]',
  tableCardView: '[data-testid="timesheet-card-view"]',
  pageBanner: '[data-testid="notification-banner"]',
  pageBannerAction: '[data-testid="notification-banner-action"]',
  pageBannerDismiss: '[data-testid="notification-banner-dismiss"]',
  legacyPageBanner: '[data-testid="page-banner"]',
  statusBadge: '.status-badge',
  toast: '.elevation-toast, [data-sonner-toast], [data-testid="toast"]',
  modalOverlay: '.elevation-modal',
  modalContent: '.elevation-modal > div',
  tooltip: '[role="tooltip"]',
} as const;

export const TIMESHEET_TEST_IDS = {
  row: (id: string | number) => `timesheet-row-${id}`,
  statusBadge: (id: string | number) => `status-badge-${id}`,
  hoursBadge: (id: string | number) => `hours-badge-${id}`,
  totalPay: (id: string | number) => `total-pay-${id}`,
  description: (id: string | number) => `description-cell-${id}`,
  actionsContainer: 'timesheet-actions',
  noActionsPlaceholder: 'no-actions',
} as const;

export type TimesheetActionKey = 'submit' | 'confirm' | 'edit' | 'approve' | 'reject';
export const TIMESHEET_ACTION_KEYS: readonly TimesheetActionKey[] = ['submit', 'confirm', 'edit', 'approve', 'reject'] as const;

export const getTimesheetRowSelector = (id: string | number): string =>
  `[data-testid="${TIMESHEET_TEST_IDS.row(id)}"]`;

export const getTimesheetActionTestId = (action: TimesheetActionKey, id: string | number): string =>
  `${action}-btn-${id}`;

export const getTimesheetActionSelector = (action: TimesheetActionKey, id: string | number): string =>
  `[data-testid="${getTimesheetActionTestId(action, id)}"]`;

export const getTimesheetStatusBadgeSelector = (id: string | number): string =>
  `[data-testid="${TIMESHEET_TEST_IDS.statusBadge(id)}"]`;

export const getTimesheetHoursBadgeSelector = (id: string | number): string =>
  `[data-testid="${TIMESHEET_TEST_IDS.hoursBadge(id)}"]`;

export const getTimesheetTotalPaySelector = (id: string | number): string =>
  `[data-testid="${TIMESHEET_TEST_IDS.totalPay(id)}"]`;
