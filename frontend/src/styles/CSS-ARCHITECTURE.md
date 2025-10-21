# CSS Architecture Documentation

**Last Updated**: 2025-10-21  
**Status**: Production-ready refactored architecture

## Overview

This project uses a **token-based, mobile-first responsive CSS architecture** following industry best practices for maintainability, scalability, and performance.

## Architecture Principles

1. **Design Tokens First**: All values reference CSS custom properties (no hardcoded values)
2. **Mobile-First Responsive**: Base styles for mobile, progressively enhanced for larger screens
3. **BEM Naming Convention**: `.block__element--modifier` for component styles
4. **Separation of Concerns**: Layout, components, and utilities in separate files
5. **Backward Compatibility**: Legacy class names preserved during migration

## File Structure

```
frontend/src/styles/
├── design-tokens.css       # CSS custom properties (SSOT for all values)
├── unified-grid.css        # Layout system (grid, container, spacing)
├── dashboard-shell.css     # Dashboard components (banners, toasts)
└── CSS-ARCHITECTURE.md     # This file
```

## Design Tokens (`design-tokens.css`)

**Single Source of Truth** for all design values. Never hardcode values in components.

### Layout Tokens
```css
--grid-container-max-width: 1616px;           /* Max content width */
--grid-container-padding: clamp(1rem, 4vw, 2.5rem);  /* Responsive padding */
--grid-hero-padding: clamp(1.5rem, 3vw, 2.5rem);     /* Hero section padding */
--grid-gap-primary: clamp(1.5rem, 3vw, 2.75rem);     /* Major spacing */
--grid-gap-secondary: clamp(1.25rem, 2vw, 2rem);     /* Minor spacing */
--hero-border-radius: clamp(1rem, 3vw, 2rem);        /* Hero corners */
```

### Z-Index Stack
```css
--z-background: -1;
--z-base: 0;
--z-content: 1;
--z-elevated: 2;
--z-sticky: 4;
--z-header: 100;
--z-banner: 200;
--z-modal: 1000;
--z-toast: 1500;
```

### Status Colors
```css
--status-draft-border: hsl(var(--muted-foreground));
--status-pending-border: hsl(213 94% 68%);
--status-confirmed-border: hsl(45 93% 58%);
--status-final-border: hsl(142 69% 58%);
--status-rejected-border: hsl(0 84% 60%);
```

## Layout System (`unified-grid.css`)

### Core Classes

#### Container
```html
<div class="layout-container">
  <!-- Content constrained to max-width with responsive padding -->
</div>
```

**Legacy Alias**: `.unified-container` (backward compatible)

#### Main Grid
```html
<div class="layout-grid">
  <!-- Vertical flexbox layout with responsive gaps -->
</div>
```

**Legacy Alias**: `.macro-grid` (backward compatible)

#### Hero Section
```html
<header class="layout-hero">
  <!-- Header area with glassmorphism effect -->
</header>
```

**Legacy Alias**: `.macro-grid-hero` (backward compatible)

#### Content Area (Flexible Layout)
```html
<!-- Single-column layout -->
<main class="layout-content">
  <section class="layout-main"><!-- Main content --></section>
</main>

<!-- Two-column layout with sidebar -->
<main class="layout-content has-sidebar">
  <section class="layout-main"><!-- Primary column --></section>
  <aside class="layout-sidebar"><!-- Sidebar column --></aside>
</main>
```

**Legacy Aliases**:
- `.macro-grid-content` → `.layout-content`
- `.macro-grid-main` → `.layout-main`
- `.macro-grid-sidebar` → `.layout-sidebar`

### Responsive Breakpoints

| Breakpoint | Width | Grid Behavior |
|------------|-------|---------------|
| Mobile | < 768px | Single column |
| Tablet | 768px - 1023px | Single column |
| Desktop | 1024px - 1439px | Sidebar: 260-320px |
| Large | 1440px+ | Sidebar: 300-360px |

### Sidebar Layout Behavior

```css
/* Mobile: Stack vertically */
.layout-content.has-sidebar {
  grid-template-columns: 1fr;
}

/* Desktop: Main + Sidebar */
@media (min-width: 1024px) {
  .layout-content.has-sidebar {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  }
}
```

## Dashboard Components (`dashboard-shell.css`)

### Notification Banner

```html
<div class="notification-banner-container">
  <div class="notification-banner notification-banner--warning">
    <span class="notification-banner__icon">⚠️</span>
    <div class="notification-banner__content">
      <strong class="notification-banner__title">Warning</strong>
      <p class="notification-banner__description">Message here</p>
    </div>
    <button class="notification-banner__action">Action</button>
    <button class="notification-banner__dismiss">×</button>
  </div>
</div>
```

**Modifiers**:
- `--warning`: Yellow/amber theme
- `--error`: Red theme  
- `--info`: Blue theme

### Toast System

```html
<div class="dashboard-toast-stack">
  <div class="dashboard-toast dashboard-toast--success">
    <span class="dashboard-toast__content">Success message</span>
    <button class="dashboard-toast__cta">Action</button>
    <button class="dashboard-toast__dismiss">×</button>
  </div>
</div>
```

**Modifiers**:
- `--success`: Green theme
- `--info`: Blue theme
- `--error`: Red theme

### Numeric Display

```html
<span class="dashboard-number">1,234.56</span>
```

**Features**:
- Tabular numerals (`font-variant-numeric: tabular-nums`)
- Right-aligned
- Consistent width for numbers

## Usage Examples

### Basic Dashboard Layout

```tsx
function MyDashboard() {
  return (
    <div className="layout-container">
      <div className="layout-grid">
        {/* Hero Section */}
        <header className="layout-hero">
          <h1>Dashboard Title</h1>
          <p>Description here</p>
        </header>

        {/* Main Content */}
        <main className="layout-content">
          <section className="layout-main">
            {/* Primary content */}
          </section>
        </main>
      </div>
    </div>
  );
}
```

### Dashboard with Sidebar

```tsx
function LecturerDashboard() {
  return (
    <div className="layout-container">
      <div className="layout-grid">
        <header className="layout-hero">
          <h1>Lecturer Dashboard</h1>
        </header>

        {/* Two-column layout */}
        <main className="layout-content has-sidebar">
          <section className="layout-main">
            {/* Pending approvals table */}
          </section>
          
          <aside className="layout-sidebar">
            {/* Status breakdown chart */}
          </aside>
        </main>
      </div>
    </div>
  );
}
```

## Best Practices

### ✅ Do

1. **Use Design Tokens**
   ```css
   /* Good */
   padding: var(--grid-gap-secondary);
   
   /* Bad */
   padding: 1.25rem;
   ```

2. **Mobile-First Media Queries**
   ```css
   /* Good */
   .component {
     font-size: 14px;  /* Base mobile */
   }
   @media (min-width: 768px) {
     .component {
       font-size: 16px;  /* Enhanced for tablet+ */
     }
   }
   ```

3. **Use BEM for Components**
   ```css
   /* Good */
   .notification-banner { }
   .notification-banner__content { }
   .notification-banner--warning { }
   ```

4. **Reference Existing Tokens**
   ```css
   /* Good */
   border-color: var(--status-pending-border);
   
   /* Bad */
   border-color: #5b9dd9;
   ```

### ❌ Don't

1. **Don't Hardcode Values**
   ```css
   /* Bad */
   max-width: 1616px;
   padding: 2.5rem;
   ```

2. **Don't Use Desktop-First**
   ```css
   /* Bad */
   @media (max-width: 768px) {
     /* Mobile overrides */
   }
   ```

3. **Don't Mix Layout with Components**
   ```css
   /* Bad - layout concerns in component file */
   .my-component {
     grid-template-columns: 1fr minmax(260px, 320px);
   }
   ```

## Migration Guide

### Legacy → New Class Names

| Legacy | New | Status |
|--------|-----|--------|
| `.unified-container` | `.layout-container` | ✅ Both work |
| `.macro-grid` | `.layout-grid` | ✅ Both work |
| `.macro-grid-hero` | `.layout-hero` | ✅ Both work |
| `.macro-grid-content` | `.layout-content` | ✅ Both work |
| `.macro-grid-main` | `.layout-main` | ✅ Both work |
| `.macro-grid-sidebar` | `.layout-sidebar` | ✅ Both work |

**Migration Steps**:
1. Search for legacy class name in component
2. Replace with new semantic name
3. Test responsive behavior
4. Verify tests pass

## Responsive Testing Checklist

- [ ] Mobile (375px): Single column, no sidebar
- [ ] Tablet (768px): Single column, increased spacing
- [ ] Desktop (1024px): Sidebar appears if `.has-sidebar`
- [ ] Large (1440px): Wider sidebar (300-360px)
- [ ] XL (1920px): Max container width (1616px)

## Common Patterns

### Adding a New Dashboard

```tsx
// 1. Use semantic layout classes
<div className="layout-container">
  <div className="layout-grid">
    <header className="layout-hero">
      {/* Header content */}
    </header>
    
    <main className="layout-content">
      <section className="layout-main">
        {/* Main content */}
      </section>
    </main>
  </div>
</div>
```

### Adding a Notification

```tsx
<div className="notification-banner notification-banner--warning">
  <span className="notification-banner__icon">⚠️</span>
  <div className="notification-banner__content">
    <strong className="notification-banner__title">Title</strong>
    <p className="notification-banner__description">Message</p>
  </div>
</div>
```

## Performance Considerations

1. **CSS Custom Properties**: Computed once, reused everywhere
2. **`clamp()` for Responsive**: Single declaration vs. multiple media queries
3. **Minimal Specificity**: Flat BEM structure = faster selector matching
4. **No Runtime Calculations**: All values pre-computed

## Browser Support

- **Modern Browsers**: Full support (Chrome 88+, Firefox 85+, Safari 14+)
- **CSS Grid**: Required (all modern browsers)
- **CSS Custom Properties**: Required (all modern browsers)
- **`clamp()`**: Required (all modern browsers 2020+)

## Troubleshooting

### Issue: Layout not responsive
**Solution**: Ensure container uses `.layout-container` and content uses `.layout-content`

### Issue: Sidebar not appearing
**Solution**: Add `.has-sidebar` to `.layout-content` and ensure viewport ≥1024px

### Issue: Spacing inconsistent
**Solution**: Use design tokens (`--grid-gap-primary`, `--grid-gap-secondary`) instead of hardcoded values

### Issue: Colors don't match design system
**Solution**: Reference status color tokens (`--status-*-border`, `--status-*-bg`)

## Future Improvements

1. **CSS Modules**: Consider migrating to CSS Modules for scoped styles
2. **CSS-in-JS**: Evaluate Tailwind CSS or styled-components for type safety
3. **Container Queries**: Replace media queries with container queries when browser support improves
4. **View Transitions API**: Add smooth page transitions

## Related Documentation

- `design-tokens.css`: Token definitions
- `unified-grid.css`: Layout system implementation  
- `dashboard-shell.css`: Component styles
- `TimesheetTable.css`: Table-specific responsive styles

---

**Questions?** Contact the frontend team or open an issue.
