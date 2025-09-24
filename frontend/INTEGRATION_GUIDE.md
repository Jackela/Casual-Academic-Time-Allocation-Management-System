# Component Bundle Integration Guide

## Overview
This guide integrates modern dashboard components with Tailwind CSS v4 into the existing React TypeScript project.

## Prerequisites
- React 19+ with TypeScript ✅
- Vite build system ✅
- Node.js 18+ ✅

## Integration Steps

### Step 1: Install Dependencies

```bash
# Core Tailwind CSS v4 (Preview)
npm install tailwindcss@next @tailwindcss/vite@next

# Component dependencies
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# Development dependencies
npm install --save-dev @tailwindcss/typography @tailwindcss/forms
```

### Step 2: Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

### Step 3: Update Tailwind Configuration

Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Preserve existing brand colors
        brand: {
          primary: '#667eea',
          secondary: '#764ba2',
        }
      }
    },
  },
  plugins: [],
}

export default config
```

### Step 4: Replace CSS Imports

Update `src/index.css` with the provided styles (see main integration files).

### Step 5: Create Utility Functions

Create `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Step 6: Add UI Components

Create the component structure:
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/stat-card.tsx` (enhanced version)

## Migration Strategy

### Phase 1: Core Infrastructure
1. ✅ Install Tailwind CSS v4
2. ✅ Add utility functions
3. ✅ Create base UI components

### Phase 2: Component Migration
1. Replace existing `TutorStatCard` with modern `StatCard`
2. Update dashboard layouts to use new grid system
3. Migrate forms and tables gradually

### Phase 3: Design System Alignment
1. Integrate existing brand colors with Tailwind theme
2. Add dark mode support
3. Enhance accessibility features

### Phase 4: Testing & Optimization
1. Update component tests
2. Verify responsive behavior
3. Performance optimization

## Compatibility Notes

### Preserving Existing Styles
- Brand colors (#667eea, #764ba2) mapped to Tailwind theme
- Existing CSS classes can coexist during migration
- Gradual migration prevents breaking changes

### Component Mapping
- `TutorStatCard` → `StatCard` (enhanced)
- CSS modules → Tailwind utilities
- Custom properties → CSS variables in theme

## Benefits of Full Integration

1. **Consistency**: Unified design system across all components
2. **Maintainability**: Single source of truth for styling
3. **Performance**: Optimized CSS bundle with unused code elimination
4. **Developer Experience**: IntelliSense for styles, better debugging
5. **Future-Proof**: Modern CSS-in-JS approach with v4 features