# Frontend Component Audit & Modernization Plan

**Date:** 2025-09-24
**Status:** In Progress

This document outlines the audit of the existing frontend components and proposes a strategy for migrating them to the new design system based on Tailwind CSS and the `21st.dev` component library.

## Component Inventory & Replacement Strategy

| Component Path                                  | Type          | Current State                                                                   | Proposed Action                                                                                                                  | `21st.dev` Equivalent | Priority |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| `dashboards/AdminDashboard`                     | Page          | Custom layout with component-specific CSS.                                      | Rebuild layout using new `Layout` components and Tailwind Grid/Flexbox. Replace child components as per this audit.          | N/A (Layout)            | High     |
| `dashboards/LecturerDashboard`                  | Page          | Custom layout with component-specific CSS.                                      | Rebuild layout using new `Layout` components and Tailwind Grid/Flexbox. Replace child components as per this audit.          | N/A (Layout)            | High     |
| `dashboards/TutorDashboard`                     | Page          | Custom layout with component-specific CSS.                                      | Rebuild layout using new `Layout` components and Tailwind Grid/Flexbox. Replace child components as per this audit.          | N/A (Layout)            | High     |
| `LoginPage.tsx`                                 | Page          | Custom form with specific CSS. Buttons and inputs are native elements.          | Rebuild form using `21st.dev` `Card`, `Input`, and `Button` components. Remove `LoginPage.css`.                                | `Card`, `Input`, `Button` | High     |
| `DashboardLayout.tsx`                           | Layout        | Defines main application structure, likely with custom CSS for sidebar/header.    | Refactor to use Tailwind utility classes exclusively for layout. Standardize breakpoints. Remove `DashboardLayout.css`.         | N/A (Layout)            | High     |
| `ProtectedRoute.tsx`                            | Layout        | Logic wrapper, likely minimal styling.                                          | Review and remove `ProtectedRoute.css`, replacing any styles with Tailwind classes if necessary.                               | N/A (Logic)             | Medium   |
| `ErrorBoundary.tsx` / `ErrorFallback.tsx`       | App           | Displays a fallback UI on error, styled with `ErrorFallback.css`.                 | Restyle the fallback component using `21st.dev` `Card` and `Button` components for a consistent error state look and feel.    | `Card`, `Button`        | Medium   |
| `shared/LoadingSpinner`                         | Shared        | Custom CSS for animation.                                                       | Replace with a `Spinner` or `Loader` component from `21st.dev`. Ensure it's used consistently for all data-loading states. | `Spinner` / `Loader`    | High     |
| `shared/StatusBadge`                            | Shared        | A badge for showing status, styled with `StatusBadge.css`.                        | Replace with the `21st.dev` `Badge` component. Map existing statuses to the new component's color variants.                  | `Badge`                 | High     |
| `shared/TimesheetTable`                         | Shared        | A complex, critical component with significant custom logic and CSS.            | **Strategy 1 (Preferred):** Rebuild using a `21st.dev` `Table` component. **Strategy 2:** Refactor the existing component to use `21st.dev` primitives (`Button`, `Badge`) internally and style the table structure with Tailwind. | `Table`, `Button`, `Badge` | High     |
| `ui/badge.tsx`                                  | UI Primitive  | An early attempt at a primitive, likely not used consistently.                  | **Deprecate.** Replace all usages with the `21st.dev` `Badge` component.                                                       | `Badge`                 | High     |
| `ui/card.tsx`                                   | UI Primitive  | An early attempt at a primitive.                                                | **Deprecate.** Replace all usages with the `21st.dev` `Card` component for consistent panel/container styling.              | `Card`                  | High     |
| `ui/stat-card.tsx`                              | UI Primitive  | A specialized card variant.                                                     | Rebuild as a new, properly namespaced component (e.g., `components/StatCard.tsx`) composed of the `21st.dev` `Card`.         | `Card`                  | Medium   |

## Next Steps
1.  **Confirm `21st.dev` Availability:** Verify that the assumed components (`Button`, `Card`, `Badge`, `Spinner`, `Table`, `Input`) are available via the Magic MCP.
2.  **Prioritize Implementation:** Begin with the highest priority "UI Primitive" and "Shared" components, as these are the foundational building blocks for the "Page" components.
3.  **Update `todo.md`:** Mark the audit as complete and move to the next task: finalizing design tokens.
