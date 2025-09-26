# PRD: Frontend Modernization & Design System Implementation

**Author:** Gemini (Acting as Product Manager)
**Date:** 2025-09-24
**Status:** Draft

## 1. Background & Problem Statement

The Casual Academic Time Allocation Management System's frontend is a critical interface for university staff, yet it currently suffers from significant user experience and maintainability issues. The user interface (UI) has been described as aesthetically poor , which detracts from the application's professionalism and usability.

Furthermore, the current UI is plagued by functional bugs, including non-responsive buttons and incorrect component visibility logic, leading to user frustration and a lack of trust in the system.

Technically, the codebase lacks a cohesive design system. Styling is fragmented across numerous individual CSS files, despite the presence of Tailwind CSS. This has resulted in an inconsistent visual language and makes the application difficult to scale and maintain.

This project aims to address these issues by conducting a comprehensive frontend refactoring, implementing a modern and consistent design system, and resolving all known UI-related defects.

## 2. Goals & Objectives

The primary goal of this project is to transform the user experience of the application into a modern, intuitive, and visually appealing one.

| Goal                        | Key Results                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Improve User Experience** | - Replace all custom-styled elements with a consistent set of components from the `21st.dev` library.<br>- Establish and enforce a consistent design language (spacing, typography, color palette) across the entire application. |
| **Increase UI Reliability** | - Achieve a 95% reduction in user-reported UI bugs within 3 months post-launch.<br>- Resolve 100% of known functional issues related to buttons and component visibility.<br>- Ensure the existing E2E test suite passes with 100% reliability against the new UI. |
| **Enhance Maintainability** | - Eliminate all component-specific `.css` files in favor of a pure Tailwind CSS utility-class approach.<br>- Reduce the time required for new developers to build a UI feature by 30%.<br>- Establish a reusable component library that becomes the single source of truth for all UI elements. |

## 3. Scope

### In Scope
-   **Full UI Refactoring:** All existing pages and components will be refactored to align with the new design system.
-   **Design System Implementation:**
    -   Adoption of Tailwind CSS as the exclusive styling methodology.
    -   Integration of UI components from the `21st.dev` library (via Magic MCP).
    -   Creation of any missing, application-specific components using Tailwind CSS, following the established design patterns.
-   **Bug Fixing:** Correcting all identified UI functional bugs, specifically focusing on button interactivity and component visibility rules.
-   **Responsiveness:** Ensuring the entire application is fully responsive and usable on modern desktop, tablet, and mobile screen sizes.
-   **Testing:** Updating and ensuring all existing Vitest (unit) and Playwright (E2E) tests pass against the refactored UI.

### Out of Scope
-   **Backend Changes:** The backend API, database, and business logic are considered stable and will not be altered. The frontend will continue to consume the existing API endpoints.
-   **New Feature Development:** This project is focused on modernizing the existing feature set. No new application features will be added.
-   **URL/Routing Changes:** The application's routing structure and URLs will remain unchanged.

## 4. Requirements

### 4.1. Functional Requirements
-   All existing user workflows and application functionality must be preserved.
-   All interactive elements (buttons, forms, links) must be fully functional and provide clear visual feedback (e.g., hover, active, disabled states).
-   Component visibility must be strictly tied to application state and user permissions, matching the intended business logic.

### 4.2. UI/UX & Design Requirements
-   **Component Library:** Standard interactive elements (Buttons, Inputs, Modals, Tables, Badges, etc.) will be sourced from the `21st.dev` library.
-   **Styling:** All custom CSS files (`*.css`) within the `src` directory shall be removed. All styling will be accomplished via Tailwind CSS utility classes.
-   **Consistency:** The application must adhere to a strict, consistent design language. This includes:
    -   **Color Palette:** Use the colors defined in `tailwind.config.ts`, leveraging CSS variables for theming.
    -   **Typography:** Consistent font sizes, weights, and line heights for headings, paragraphs, and labels.
    -   **Spacing:** Use Tailwind's spacing scale for all margins, padding, and layout gaps.
    -   **Layout:** All page layouts will be rebuilt using modern CSS layout techniques (Flexbox/Grid) via Tailwind utilities.
-   **Accessibility:** The UI must meet WCAG 2.1 Level AA compliance. This includes proper semantic HTML, keyboard navigation, focus management, and sufficient color contrast.

### 4.3. Non-Functional Requirements
-   **Performance:** The refactored application's performance (as measured by Lighthouse scores for Performance, and Best Practices) must be equal to or better than the current version.
-   **Browser Compatibility:** The application must render correctly and function fully on the latest two versions of major browsers (Chrome, Firefox, Safari, Edge).

## 5. Success Metrics
-   **Qualitative:** Positive feedback from stakeholders and end-users regarding the new look and feel.
-   **Quantitative:**
    -   100% of E2E tests passing in CI.
    -   0 component-specific `.css` files remaining in the `frontend/src/components` directory.
    -   Lighthouse Performance score > 90.
    -   Lighthouse Accessibility score > 95.
    -   A 95% reduction in UI-related bug tickets in the 3 months following release.

## 6. Assumptions & Dependencies
-   **Assumption:** The `21st.dev` component library provides a sufficient set of base components (e.g., Button, Input, Table, Modal) to cover at least 80% of our UI needs.
-   **Dependency:** Continuous access to the Magic MCP is required to fetch components from `21st.dev`.

## 7. High-Level Implementation Plan (Roadmap)

1.  **Phase 1: Foundation & Setup (Sprint 1)**
    -   Audit all existing components and map them to `21st.dev` equivalents.
    -   Finalize and document the design tokens (colors, typography, spacing) in `tailwind.config.ts`.
    -   Create foundational, reusable layout components.

2.  **Phase 2: Component Migration (Sprints 2-4)**
    -   Systematically replace core UI elements (`shared/`, `ui/`) with new standardized components.
    -   Refactor major pages/dashboards one by one, starting with the least complex.
    -   Update unit tests as components are replaced.

3.  **Phase 3: Bug Fixes & Polish (Sprint 5)**
    -   Perform a full application walkthrough to identify and fix remaining functional bugs.
    -   Ensure all component states (loading, error, empty, disabled) are correctly implemented and visually represented.
    -   Conduct accessibility audit and remediate issues.

4.  **Phase 4: End-to-End Testing & Release (Sprint 6)**
    -   Run the full Playwright E2E test suite and fix any regressions.
    -   Perform cross-browser testing.
    -   Deploy to a staging environment for final review.
    -   Release to production.
