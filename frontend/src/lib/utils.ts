import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function to conditionally join class names together.
 * It also merges Tailwind CSS classes without style conflicts.
 * @param {...ClassValue[]} inputs - A list of class values to join.
 * @returns {string} The merged class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Utility for getting trend color classes
export function getTrendColor(isPositive: boolean, variant: 'text' | 'bg' | 'border' = 'text'): string {
  const positive = {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/50',
    border: 'border-green-200 dark:border-green-800'
  };
  
  const negative = {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/50',
    border: 'border-red-200 dark:border-red-800'
  };
  
  return isPositive ? positive[variant] : negative[variant];
}
