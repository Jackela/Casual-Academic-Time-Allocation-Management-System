import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility for formatting currency values
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

// Utility for formatting percentages
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
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