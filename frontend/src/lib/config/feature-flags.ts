export const FEATURE_FLAGS = {
  ENABLE_ACTIVITY_COLUMN: false, // Disabled to support refactored layout
  ENABLE_LAST_UPDATED_COLUMN: true, // New consolidated column
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};
