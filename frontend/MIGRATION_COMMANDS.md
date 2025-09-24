# Component Bundle Migration Commands

This file contains all the commands needed to integrate the modern component bundle into your existing React TypeScript project.

## Step 1: Install Required Dependencies

```bash
# Install Tailwind CSS v3 (stable version)
npm install -D tailwindcss postcss autoprefixer @tailwindcss/typography

# Install component dependencies
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# Initialize Tailwind CSS (optional - we've provided config)
npx tailwindcss init -p
```

## Step 2: Update Package.json Scripts (Optional)

Add these scripts to your package.json:

```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./src/index.css -o ./dist/output.css --watch",
    "build:tailwind": "tailwindcss build -i ./src/index.modern.css -o ./src/index.generated.css"
  }
}
```

## Step 3: File Replacements and Updates

### Replace Vite Configuration
```bash
# Backup current config
cp vite.config.ts vite.config.backup.ts

# Use the enhanced config
cp vite.config.enhanced.ts vite.config.ts
```

### Update CSS Imports
```bash
# Backup current CSS
cp src/index.css src/index.backup.css

# Option A: Full migration (recommended)
cp src/index.modern.css src/index.css

# Option B: Gradual migration (keep existing + add modern)
# Add this import to your current src/index.css:
# @import './index.modern.css';
```

## Step 4: TypeScript Path Configuration

Update your `tsconfig.json` to include path mappings:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/services/*": ["./src/services/*"],
      "@/contexts/*": ["./src/contexts/*"]
    }
  }
}
```

## Step 5: Component Migration Examples

### Replace TutorStatCard with Modern StatCard

```tsx
// OLD: src/components/dashboards/TutorDashboard/TutorDashboard.tsx
import { TutorStatCard } from './TutorStatCard';

<TutorStatCard
  title="Total Earned"
  value={`$${formatters.currencyValue(tutorStats.totalPay)}`}
  subtitle="All time"
  color="success"
  icon="💰"
/>

// NEW: Using modern StatCard
import { StatCard } from '@/components/ui/stat-card';

<StatCard
  title="Total Earned"
  value={tutorStats.totalPay}
  trend={{ value: 12.5, isPositive: true, period: "from last month" }}
  description="All-time earnings"
  variant="success"
  icon={<DollarSignIcon />}
/>
```

### Use Enhanced Dashboard (Example)
```tsx
// Import the enhanced version
import EnhancedTutorDashboard from './TutorDashboard.enhanced';

// Use in your routing
<Route path="/dashboard" element={<EnhancedTutorDashboard />} />
```

## Step 6: Testing the Integration

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests (ensure everything still works)
npm test
```

## Step 7: Gradual Migration Strategy

### Phase 1: Infrastructure Setup
1. ✅ Install dependencies
2. ✅ Add Tailwind configuration  
3. ✅ Update Vite config with aliases
4. ✅ Add utility functions

### Phase 2: Component Integration
1. Start with StatCard components
2. Migrate dashboard components
3. Update form components
4. Enhance table components

### Phase 3: Design System Alignment
1. Map existing brand colors to Tailwind theme
2. Add dark mode support
3. Improve accessibility features
4. Optimize performance

## Step 8: Verification Checklist

- [ ] Dependencies installed successfully
- [ ] Tailwind CSS compiling correctly
- [ ] Path aliases resolving (@/ imports work)
- [ ] StatCard components render properly
- [ ] Existing functionality preserved
- [ ] Dark mode toggle working
- [ ] Responsive design maintained
- [ ] Accessibility features working
- [ ] Performance metrics acceptable
- [ ] Tests passing

## Troubleshooting

### Common Issues

1. **Path alias not resolving**
   ```bash
   # Ensure TypeScript config includes path mappings
   # Restart your TypeScript language server
   ```

2. **Tailwind styles not applying**
   ```bash
   # Check that Tailwind CSS is included in your build process
   # Verify content paths in tailwind.config.ts
   ```

3. **Build errors with @radix-ui components**
   ```bash
   # Ensure you have the correct peer dependencies
   npm install react@^18 react-dom@^18
   ```

4. **CSS conflicts between old and new styles**
   ```css
   /* Use CSS layers to control specificity */
   @layer base, components, utilities;
   ```

## Rollback Plan

If you need to rollback:

```bash
# Restore original files
cp vite.config.backup.ts vite.config.ts
cp src/index.backup.css src/index.css

# Remove added dependencies
npm uninstall tailwindcss postcss autoprefixer lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# Remove added files
rm tailwind.config.ts
rm src/lib/utils.ts
rm -rf src/components/ui/
```

## Next Steps

1. **Explore Enhanced Components**: Review the enhanced dashboard example
2. **Add More UI Components**: Consider adding Form, Button, Input components
3. **Implement Dark Mode**: Add theme switching functionality
4. **Performance Monitoring**: Set up metrics to track improvements
5. **Team Training**: Share knowledge about the new component system