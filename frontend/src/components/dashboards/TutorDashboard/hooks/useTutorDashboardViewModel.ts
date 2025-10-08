import {
  useMemo,
  useState,
  useCallback,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  useTimesheetQuery,
  useTimesheetDashboardSummary,
  useCreateTimesheet,
  useUpdateTimesheet,
  useTimesheetStats,
} from "../../../../hooks/timesheets";
import { useUserProfile } from "../../../../auth/UserProfileProvider";
import { formatters } from "../../../../utils/formatting";
import type { Timesheet, DashboardDeadline } from "../../../../types/api";
import type { User } from "../../../../types/auth";
import type { QuickStat } from "../components/QuickStats";
import type { SupportResourceItem } from "../components/SupportResources";

export type TutorDashboardTabId = "all" | "drafts" | "submitted" | "needAction";

export interface TutorDashboardTab {
  id: TutorDashboardTabId;
  label: string;
  count: number;
  filter: (timesheet: Timesheet) => boolean;
}

type TimesheetsQueryResult = ReturnType<typeof useTimesheetQuery>;
type DashboardSummaryQueryResult = ReturnType<
  typeof useTimesheetDashboardSummary
>;
type CreateTimesheetMutation = ReturnType<typeof useCreateTimesheet>;
type UpdateTimesheetMutation = ReturnType<typeof useUpdateTimesheet>;

export interface TutorDashboardViewModel {
  user: User | null;
  welcomeMessage: string;
  completionRate: number;
  thisWeekSummary: { hours: number; pay: number };
  quickStats: QuickStat[];
  supportResources: SupportResourceItem[];
  tabs: TutorDashboardTab[];
  currentTab: TutorDashboardTabId;
  handleTabChange: (tab: TutorDashboardTabId) => void;
  filteredTimesheets: Timesheet[];
  allTimesheets: Timesheet[];
  selectedTimesheets: number[];
  setSelectedTimesheets: Dispatch<SetStateAction<number[]>>;
  dismissedNotifications: string[];
  handleNotificationDismiss: (notificationId: string) => void;
  visibleDeadlines: DashboardDeadline[];
  visibleDraftCount: number;
  visibleRejectedCount: number;
  draftBaseCount: number;
  inProgressCount: number;
  timesheetsQuery: TimesheetsQueryResult;
  dashboardQuery: DashboardSummaryQueryResult;
  createMutation: CreateTimesheetMutation;
  updateMutation: UpdateTimesheetMutation;
  tutorStats: ReturnType<typeof useTimesheetStats>;
}

export const useTutorDashboardViewModel = (): TutorDashboardViewModel => {
  const { profile } = useUserProfile();
  const user = profile;

  const timesheetsQuery = useTimesheetQuery({
    tutorId: user?.id,
    size: 50,
  });

  const dashboardQuery = useTimesheetDashboardSummary({
    scope: "tutor",
    lazy: false,
  });
  const createMutation = useCreateTimesheet();
  const updateMutation = useUpdateTimesheet();
  const tutorStats = useTimesheetStats(timesheetsQuery.timesheets);

  const [currentTab, setCurrentTab] = useState<TutorDashboardTabId>("all");
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  const completionRate = useMemo(() => {
    const total = tutorStats.totalCount || 0;
    if (!total) {
      return 0;
    }
    const completed = tutorStats.statusCounts?.FINAL_CONFIRMED ?? 0;
    return completed / total;
  }, [tutorStats.totalCount, tutorStats.statusCounts]);

  const tabs = useMemo<TutorDashboardTab[]>(() => {
    const drafts = timesheetsQuery.timesheets.filter(
      (t) => t.status === "DRAFT" || t.status === "MODIFICATION_REQUESTED",
    );
    const inProgress = timesheetsQuery.timesheets.filter((t) =>
      [
        "PENDING_TUTOR_CONFIRMATION",
        "TUTOR_CONFIRMED",
        "LECTURER_CONFIRMED",
      ].includes(t.status),
    );
    const needAction = timesheetsQuery.timesheets.filter(
      (t) => t.status === "REJECTED" || t.status === "MODIFICATION_REQUESTED",
    );

    return [
      {
        id: "all",
        label: "All Timesheets",
        filter: () => true,
        count: timesheetsQuery.timesheets.length,
      },
      {
        id: "drafts",
        label: `Drafts (${drafts.length})`,
        filter: (t) =>
          t.status === "DRAFT" || t.status === "MODIFICATION_REQUESTED",
        count: drafts.length,
      },
      {
        id: "submitted",
        label: `In Progress (${inProgress.length})`,
        filter: (t) =>
          [
            "PENDING_TUTOR_CONFIRMATION",
            "TUTOR_CONFIRMED",
            "LECTURER_CONFIRMED",
          ].includes(t.status),
        count: inProgress.length,
      },
      {
        id: "needAction",
        label: `Needs Attention (${needAction.length})`,
        filter: (t) =>
          t.status === "REJECTED" || t.status === "MODIFICATION_REQUESTED",
        count: needAction.length,
      },
    ];
  }, [timesheetsQuery.timesheets]);

  const filteredTimesheets = useMemo(() => {
    const currentTabConfig = tabs.find((tab) => tab.id === currentTab);
    return currentTabConfig
      ? timesheetsQuery.timesheets.filter(currentTabConfig.filter)
      : timesheetsQuery.timesheets;
  }, [currentTab, tabs, timesheetsQuery.timesheets]);

  const welcomeMessage = useMemo(() => {
    const firstName = user?.name?.split(" ")[0] || "Tutor";
    return `Welcome back, ${firstName}!`;
  }, [user?.name]);

  const thisWeekSummary = useMemo(
    () => ({
      hours: dashboardQuery.data?.thisWeekHours || 0,
      pay: dashboardQuery.data?.thisWeekPay || 0,
    }),
    [dashboardQuery.data?.thisWeekHours, dashboardQuery.data?.thisWeekPay],
  );

  const dismissedSet = useMemo(
    () => new Set(dismissedNotifications),
    [dismissedNotifications],
  );

  const rejectedBaseCount = tutorStats.statusCounts?.REJECTED || 0;
  const draftBaseCount =
    (tutorStats.statusCounts?.DRAFT || 0) +
    (tutorStats.statusCounts?.MODIFICATION_REQUESTED || 0);
  const inProgressCount = useMemo(
    () =>
      timesheetsQuery.timesheets.filter((t) =>
        [
          "PENDING_TUTOR_CONFIRMATION",
          "TUTOR_CONFIRMED",
          "LECTURER_CONFIRMED",
        ].includes(t.status),
      ).length,
    [timesheetsQuery.timesheets],
  );

  const quickStats = useMemo<QuickStat[]>(() => {
    const averagePerWeek = ((tutorStats.totalHours || 0) / 16).toFixed(1);

    return [
      {
        id: "total-earned",
        title: "Total Earned",
        value: `$${formatters.currencyValue(tutorStats.totalPay)}`,
        subtitle: "All time",
        icon: "💰",
      },
      {
        id: "total-hours",
        title: "Total Hours",
        value: `${tutorStats.totalHours}h`,
        subtitle: "Logged this semester",
        icon: "⏰",
      },
      {
        id: "average-week",
        title: "Average per Week",
        value: `${averagePerWeek}h`,
        subtitle: "Based on 16 weeks",
        icon: "📈",
      },
      {
        id: "status-snapshot",
        title: "Status at a Glance",
        value: `${draftBaseCount} Drafts`,
        subtitle: `${inProgressCount} In Progress`,
        icon: "📋",
      },
    ];
  }, [
    draftBaseCount,
    inProgressCount,
    tutorStats.totalHours,
    tutorStats.totalPay,
  ]);

  const supportResources = useMemo<SupportResourceItem[]>(
    () => [
      {
        id: "knowledge-base",
        label: "Timesheet Knowledge Base",
        description:
          "Step-by-step guides for submitting and tracking timesheets.",
        href: "#",
        icon: "📚",
      },
      {
        id: "contact-staffing",
        label: "Contact Staffing Team",
        description:
          "Email the staffing desk for urgent issues or pay corrections.",
        href: "mailto:staffing@casual-academic.edu",
        icon: "✉️",
      },
      {
        id: "office-hours",
        label: "Tutor Support Hours",
        description:
          "Join weekly drop-in sessions for payroll and scheduling questions.",
        href: "#",
        icon: "🕑",
      },
    ],
    [],
  );

  const visibleRejectedCount = dismissedSet.has("rejected-reminder")
    ? 0
    : rejectedBaseCount;
  const visibleDraftCount = dismissedSet.has("draft-reminder")
    ? 0
    : draftBaseCount;

  const visibleDeadlines = useMemo(() => {
    const deadlines = (dashboardQuery.data?.upcomingDeadlines ??
      []) as DashboardDeadline[];
    return deadlines.filter((deadline, index) => {
      const identifier = `deadline-${deadline.courseId ?? index}`;
      return !dismissedSet.has(identifier);
    });
  }, [dashboardQuery.data?.upcomingDeadlines, dismissedSet]);

  const handleNotificationDismiss = useCallback((notificationId: string) => {
    setDismissedNotifications((prev) => {
      if (prev.includes(notificationId)) {
        return prev;
      }
      return [...prev, notificationId];
    });
  }, []);

  const handleTabChange = useCallback((tab: TutorDashboardTabId) => {
    setCurrentTab(tab);
    setSelectedTimesheets([]);
  }, []);

  return {
    user,
    welcomeMessage,
    completionRate,
    thisWeekSummary,
    quickStats,
    supportResources,
    tabs,
    currentTab,
    handleTabChange,
    filteredTimesheets,
    allTimesheets: timesheetsQuery.timesheets,
    selectedTimesheets,
    setSelectedTimesheets,
    dismissedNotifications,
    handleNotificationDismiss,
    visibleDeadlines,
    visibleDraftCount,
    visibleRejectedCount,
    draftBaseCount,
    inProgressCount,
    timesheetsQuery,
    dashboardQuery,
    createMutation,
    updateMutation,
    tutorStats,
  };
};
