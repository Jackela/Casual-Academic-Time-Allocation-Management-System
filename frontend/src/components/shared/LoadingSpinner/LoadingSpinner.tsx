/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with multiple size variants and customization options.
 * Includes accessibility features and smooth animations.
 */

import React, { memo } from 'react';
import './LoadingSpinner.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface LoadingSpinnerProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'extra-large';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white' | 'gray';
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse' | 'ring';
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
  label?: string;
  overlay?: boolean;
  centered?: boolean;
  thickness?: 'thin' | 'normal' | 'thick';
}

// =============================================================================
// Size Configuration
// =============================================================================

const sizeConfig = {
  tiny: { size: 12, strokeWidth: 2 },
  small: { size: 16, strokeWidth: 2 },
  medium: { size: 24, strokeWidth: 2.5 },
  large: { size: 32, strokeWidth: 3 },
  'extra-large': { size: 48, strokeWidth: 4 }
};

const speedConfig = {
  slow: '2s',
  normal: '1s',
  fast: '0.5s'
};

// =============================================================================
// Spinner Variants
// =============================================================================

interface SpinnerVariantProps {
  size: number;
  strokeWidth: number;
  speed: string;
  className: string;
}

const SpinnerVariant = memo<SpinnerVariantProps>(({ size, strokeWidth, speed, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    style={{ animationDuration: speed }}
  >
    <circle
      cx={size / 2}
      cy={size / 2}
      r={size / 2 - strokeWidth}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={`${(size / 2 - strokeWidth) * Math.PI * 0.75} ${(size / 2 - strokeWidth) * Math.PI}`}
    />
  </svg>
));

const DotsVariant = memo<SpinnerVariantProps>(({ size, speed, className }) => {
  const dotSize = Math.max(2, size / 6);
  const spacing = size / 4;

  return (
    <div className={className} style={{ width: size, height: size, animationDuration: speed }}>
      <div 
        className="loading-dot" 
        style={{ 
          width: dotSize, 
          height: dotSize,
          left: spacing,
          animationDelay: '0s'
        }} 
      />
      <div 
        className="loading-dot" 
        style={{ 
          width: dotSize, 
          height: dotSize,
          left: size / 2 - dotSize / 2,
          animationDelay: '0.2s'
        }} 
      />
      <div 
        className="loading-dot" 
        style={{ 
          width: dotSize, 
          height: dotSize,
          right: spacing,
          animationDelay: '0.4s'
        }} 
      />
    </div>
  );
});

const BarsVariant = memo<SpinnerVariantProps>(({ size, speed, className }) => {
  const barWidth = Math.max(2, size / 8);
  const barCount = 5;
  const spacing = (size - barCount * barWidth) / (barCount - 1);

  return (
    <div className={className} style={{ width: size, height: size }}>
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="loading-bar"
          style={{
            width: barWidth,
            left: i * (barWidth + spacing),
            animationDuration: speed,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
});

const PulseVariant = memo<SpinnerVariantProps>(({ size, speed, className }) => (
  <div className={className} style={{ width: size, height: size, animationDuration: speed }}>
    <div className="pulse-ring" style={{ width: size, height: size }} />
    <div className="pulse-ring" style={{ width: size, height: size, animationDelay: '0.5s' }} />
  </div>
));

const RingVariant = memo<SpinnerVariantProps>(({ size, strokeWidth, speed, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    style={{ animationDuration: speed }}
  >
    <circle
      cx={size / 2}
      cy={size / 2}
      r={size / 2 - strokeWidth}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      fill="none"
      opacity="0.2"
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={size / 2 - strokeWidth}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={`${(size / 2 - strokeWidth) * Math.PI * 0.25} ${(size / 2 - strokeWidth) * Math.PI}`}
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  </svg>
));

// =============================================================================
// Main Loading Spinner Component
// =============================================================================

const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'medium',
  color = 'primary',
  variant = 'spinner',
  speed = 'normal',
  className = '',
  label = 'Loading...',
  overlay = false,
  centered = false,
  thickness = 'normal'
}) => {
  const { size: dimensions, strokeWidth: baseStrokeWidth } = sizeConfig[size];
  const animationSpeed = speedConfig[speed];
  
  // Adjust stroke width based on thickness
  const strokeWidth = thickness === 'thin' 
    ? baseStrokeWidth * 0.75 
    : thickness === 'thick' 
    ? baseStrokeWidth * 1.5 
    : baseStrokeWidth;

  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner--${size}`,
    `loading-spinner--${color}`,
    `loading-spinner--${variant}`,
    `loading-spinner--${speed}`,
    overlay ? 'loading-spinner--overlay' : '',
    centered ? 'loading-spinner--centered' : '',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'loading-spinner-container',
    overlay ? 'loading-spinner-container--overlay' : '',
    centered ? 'loading-spinner-container--centered' : ''
  ].filter(Boolean).join(' ');

  const renderSpinnerVariant = () => {
    const commonProps = {
      size: dimensions,
      strokeWidth,
      speed: animationSpeed,
      className: `loading-spinner__${variant}`
    };

    switch (variant) {
      case 'dots':
        return <DotsVariant {...commonProps} />;
      case 'bars':
        return <BarsVariant {...commonProps} />;
      case 'pulse':
        return <PulseVariant {...commonProps} />;
      case 'ring':
        return <RingVariant {...commonProps} />;
      case 'spinner':
      default:
        return <SpinnerVariant {...commonProps} />;
    }
  };

  const content = (
    <div 
      className={spinnerClasses}
      role="status"
      aria-label={label}
      data-testid="loading-spinner"
    >
      {renderSpinnerVariant()}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (overlay || centered) {
    return (
      <div className={containerClasses}>
        {content}
      </div>
    );
  }

  return content;
});

LoadingSpinner.displayName = 'LoadingSpinner';

// =============================================================================
// Loading Overlay Component
// =============================================================================

export interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  spinnerProps?: Omit<LoadingSpinnerProps, 'overlay' | 'centered'>;
  message?: string;
  backdrop?: boolean;
  className?: string;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(({
  loading,
  children,
  spinnerProps = {},
  message,
  backdrop = true,
  className = ''
}) => {
  return (
    <div className={`loading-overlay-wrapper ${className}`} data-testid="loading-overlay">
      {children}
      {loading && (
        <div className={`loading-overlay-backdrop ${backdrop ? 'loading-overlay-backdrop--visible' : ''}`}>
          <div className="loading-overlay-content">
            <LoadingSpinner
              {...spinnerProps}
              overlay={false}
              centered={false}
              size={spinnerProps.size || 'large'}
            />
            {message && (
              <p className="loading-overlay-message">{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

// =============================================================================
// Loading Button Component
// =============================================================================

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  children: React.ReactNode;
  spinnerProps?: Omit<LoadingSpinnerProps, 'overlay' | 'centered'>;
  loadingText?: string;
}

export const LoadingButton = memo<LoadingButtonProps>(({
  loading,
  children,
  spinnerProps = {},
  loadingText,
  disabled,
  className = '',
  ...buttonProps
}) => {
  const buttonClasses = [
    'loading-button',
    loading ? 'loading-button--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      {...buttonProps}
      disabled={disabled || loading}
      className={buttonClasses}
      data-testid="loading-button"
    >
      {loading && (
        <LoadingSpinner
          size="small"
          color="white"
          {...spinnerProps}
          className="loading-button__spinner"
        />
      )}
      <span className={loading ? 'loading-button__text--hidden' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
});

LoadingButton.displayName = 'LoadingButton';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a loading state hook
 */
export function useLoadingState(initialState = false) {
  const [loading, setLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setLoading(true), []);
  const stopLoading = React.useCallback(() => setLoading(false), []);
  const toggleLoading = React.useCallback(() => setLoading(prev => !prev), []);

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    setLoading
  };
}

/**
 * Wrap async function with loading state
 */
export function withLoadingState<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  setLoading: (loading: boolean) => void
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    setLoading(true);
    try {
      const result = await asyncFn(...args);
      return result;
    } finally {
      setLoading(false);
    }
  };
}

export default LoadingSpinner;