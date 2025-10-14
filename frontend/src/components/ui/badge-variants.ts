import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-input bg-background text-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        success: 'border-transparent bg-emerald-500 text-white',
        warning: 'border-transparent bg-amber-500 text-amber-950',
        info: 'border-transparent bg-blue-500 text-white',
        neutral: 'border-transparent bg-muted text-muted-foreground',
        lecturer: 'badge-role badge-role-lecturer',
        tutor: 'badge-role badge-role-tutor',
        admin: 'badge-role badge-role-admin',
      },
      size: {
        default: 'h-6',
        sm: 'h-5 text-[10px]',
        lg: 'h-7 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
