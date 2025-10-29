/**
 * UI Standards Configuration - Single Source of Truth
 * 
 * Enforces "one primary action per row" rule and other design consistency
 * standards across the entire application.
 */

// Button Action Priority System
export const ACTION_PRIORITY = {
  PRIMARY: 1,    // Most important action (only one per context)
  SECONDARY: 2,  // Supporting actions
  TERTIARY: 3,   // Less important actions
  DESTRUCTIVE: 4 // Dangerous actions (always secondary or tertiary)
} as const;

export type ActionPriority = typeof ACTION_PRIORITY[keyof typeof ACTION_PRIORITY];

// Button Variant Mapping Based on Priority
export const PRIORITY_TO_VARIANT = {
  [ACTION_PRIORITY.PRIMARY]: 'default',
  [ACTION_PRIORITY.SECONDARY]: 'outline',
  [ACTION_PRIORITY.TERTIARY]: 'ghost',
  [ACTION_PRIORITY.DESTRUCTIVE]: 'destructive'
} as const;

// Action Configuration Interface
export interface ActionConfig {
  readonly label: string;
  readonly priority: ActionPriority;
  readonly variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  readonly size?: 'default' | 'sm' | 'lg' | 'icon';
  readonly requiresConfirmation?: boolean;
  readonly disabledStates?: string[];
  readonly tooltip?: string;
}

// Standard Actions Dictionary
export const STANDARD_ACTIONS = {
  // Primary Actions (only one per context)
  SUBMIT: {
    label: 'Submit',
    priority: ACTION_PRIORITY.PRIMARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.PRIMARY],
    size: 'default'
  },
  APPROVE: {
    label: 'Approve',
    priority: ACTION_PRIORITY.PRIMARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.PRIMARY],
    size: 'default'
  },
  SAVE: {
    label: 'Save',
    priority: ACTION_PRIORITY.PRIMARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.PRIMARY],
    size: 'default'
  },
  CREATE: {
    label: 'Create',
    priority: ACTION_PRIORITY.PRIMARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.PRIMARY],
    size: 'default'
  },
  
  // Secondary Actions
  EDIT: {
    label: 'Edit',
    priority: ACTION_PRIORITY.SECONDARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.SECONDARY],
    size: 'sm'
  },
  VIEW: {
    label: 'View',
    priority: ACTION_PRIORITY.SECONDARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.SECONDARY],
    size: 'sm'
  },
  DOWNLOAD: {
    label: 'Download',
    priority: ACTION_PRIORITY.SECONDARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.SECONDARY],
    size: 'sm'
  },
  CANCEL: {
    label: 'Cancel',
    priority: ACTION_PRIORITY.SECONDARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.SECONDARY],
    size: 'default'
  },
  REQUEST_CHANGES: {
    label: 'Request Changes',
    priority: ACTION_PRIORITY.SECONDARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.SECONDARY],
    size: 'sm',
    requiresConfirmation: true
  },
  
  // Tertiary Actions
  MORE: {
    label: 'More',
    priority: ACTION_PRIORITY.TERTIARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.TERTIARY],
    size: 'icon'
  },
  INFO: {
    label: 'Info',
    priority: ACTION_PRIORITY.TERTIARY,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.TERTIARY],
    size: 'icon'
  },
  
  // Destructive Actions (always secondary or lower priority)
  DELETE: {
    label: 'Delete',
    priority: ACTION_PRIORITY.DESTRUCTIVE,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.DESTRUCTIVE],
    size: 'sm',
    requiresConfirmation: true
  },
  REJECT: {
    label: 'Reject',
    priority: ACTION_PRIORITY.DESTRUCTIVE,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.DESTRUCTIVE],
    size: 'sm',
    requiresConfirmation: true
  },
  REMOVE: {
    label: 'Remove',
    priority: ACTION_PRIORITY.DESTRUCTIVE,
    variant: PRIORITY_TO_VARIANT[ACTION_PRIORITY.DESTRUCTIVE],
    size: 'sm',
    requiresConfirmation: true
  }
} as const satisfies Record<string, ActionConfig>;

// Action Group Validation
export interface ActionGroup {
  readonly actions: ActionConfig[];
  readonly context: string;
}

// Validates "one primary action per row" rule
export const validateActionGroup = (actions: ActionConfig[], context: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // If there are no actions, treat as valid (no primary applicable)
  if (!actions || actions.length === 0) {
    return { isValid: true, errors };
  }
  
  // Count primary actions
  const primaryCount = actions.filter(a => a.priority === ACTION_PRIORITY.PRIMARY).length;
  // If no primary but also no destructive actions, allow silent pass to avoid dev-noise
  if (primaryCount === 0) {
    const hasDestructive = actions.some(a => a.priority === ACTION_PRIORITY.DESTRUCTIVE);
    if (!hasDestructive) {
      return { isValid: true, errors };
    }
  }
  
  if (primaryCount === 0) {
    errors.push(`${context}: No primary action defined. Each context should have exactly one primary action.`);
  }
  
  if (primaryCount > 1) {
    errors.push(`${context}: Multiple primary actions found (${primaryCount}). Only one primary action is allowed per context.`);
  }
  
  // Check for destructive actions without confirmation
  const destructiveWithoutConfirm = actions.filter(
    a => a.priority === ACTION_PRIORITY.DESTRUCTIVE && !a.requiresConfirmation
  );
  
  if (destructiveWithoutConfirm.length > 0) {
    errors.push(`${context}: Destructive actions must require confirmation.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to get recommended variant based on priority
export const getRecommendedVariant = (priority: ActionPriority): string => {
  return PRIORITY_TO_VARIANT[priority];
};

// Context-specific action configurations
export const CONTEXT_ACTIONS = {
  TIMESHEET_ROW: {
    primary: [STANDARD_ACTIONS.VIEW],
    secondary: [STANDARD_ACTIONS.EDIT],
    tertiary: [STANDARD_ACTIONS.MORE],
    destructive: []
  },
  TIMESHEET_APPROVAL: {
    primary: [STANDARD_ACTIONS.APPROVE],
    secondary: [STANDARD_ACTIONS.VIEW],
    tertiary: [],
    destructive: [STANDARD_ACTIONS.REJECT]
  },
  TIMESHEET_FORM: {
    primary: [STANDARD_ACTIONS.SUBMIT],
    secondary: [STANDARD_ACTIONS.CANCEL],
    tertiary: [],
    destructive: []
  },
  BATCH_ACTIONS: {
    primary: [STANDARD_ACTIONS.APPROVE],
    secondary: [STANDARD_ACTIONS.CANCEL],
    tertiary: [],
    destructive: [STANDARD_ACTIONS.REJECT]
  }
} as const;

// Spacing and Layout Standards
export const UI_SPACING = {
  ACTION_GROUP_GAP: 'gap-2',
  BUTTON_PADDING: {
    default: 'px-4 py-2',
    sm: 'px-3 py-1.5',
    lg: 'px-6 py-3'
  },
  TABLE_CELL_PADDING: 'px-3 py-2',
  CARD_PADDING: 'p-6',
  FORM_SPACING: 'space-y-4'
} as const;

// Typography Standards
export const UI_TYPOGRAPHY = {
  NUMERIC: {
    fontVariant: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
    textAlign: 'right'
  },
  BUTTON_TEXT: {
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.25rem'
  },
  STATUS_BADGE: {
    fontSize: '0.75rem',
    fontWeight: '500',
    lineHeight: '1rem'
  }
} as const;

// Animation Standards
export const UI_ANIMATIONS = {
  BUTTON_HOVER: 'transition-colors duration-150',
  MODAL_ENTER: 'transition-opacity duration-200',
  TOAST_SLIDE: 'transition-transform duration-300',
  TABLE_ROW_HOVER: 'transition-colors duration-100'
} as const;

// Accessibility Standards
export const A11Y_STANDARDS = {
  MIN_TOUCH_TARGET: '44px',
  FOCUS_RING: 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
  HIGH_CONTRAST_BORDERS: 'border border-input',
  SCREEN_READER_ONLY: 'sr-only'
} as const;

// Color Scheme Standards (references to CSS custom properties)
export const UI_COLORS = {
  STATUS: {
    SUCCESS: 'hsl(142 69% 58%)',
    WARNING: 'hsl(45 93% 58%)',
    ERROR: 'hsl(0 84% 60%)',
    INFO: 'hsl(213 94% 68%)',
    NEUTRAL: 'hsl(var(--muted-foreground))'
  },
  ELEVATION: {
    CARD: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    MODAL: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    DROPDOWN: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  }
} as const;

// Export helper functions
export const createActionGroup = (actions: ActionConfig[], context: string): ActionGroup => {
  const validation = validateActionGroup(actions, context);
  
  if (!validation.isValid) {
    console.warn('Action group validation failed:', validation.errors.join(', '));
  }
  
  return { actions, context };
};

export const getContextActions = (context: keyof typeof CONTEXT_ACTIONS) => {
  return CONTEXT_ACTIONS[context];
};
