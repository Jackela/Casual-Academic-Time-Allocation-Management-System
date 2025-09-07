/**
 * LoadingSpinner Component Tests
 * 
 * Comprehensive test suite following TDD methodology for LoadingSpinner component.
 * Tests all variants, functionality, accessibility, and performance.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoadingSpinner, { 
  LoadingOverlay, 
  LoadingButton, 
  useLoadingState, 
  withLoadingState 
} from './LoadingSpinner';

// =============================================================================
// Test Setup & Utilities
// =============================================================================

// Mock performance.now for consistent timing tests
vi.stubGlobal('performance', {
  now: vi.fn(() => Date.now())
});

const defaultProps = {
  size: 'medium' as const,
  color: 'primary' as const,
  variant: 'spinner' as const,
  speed: 'normal' as const
};

// =============================================================================
// LoadingSpinner Component Tests
// =============================================================================

describe('LoadingSpinner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading...');
    });

    it('should render with custom label', () => {
      render(<LoadingSpinner label="Please wait..." />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-label', 'Please wait...');
      expect(screen.getByText('Please wait...')).toHaveClass('sr-only');
    });

    it('should apply correct base CSS classes', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner--medium');
      expect(spinner).toHaveClass('loading-spinner--primary');
      expect(spinner).toHaveClass('loading-spinner--spinner');
      expect(spinner).toHaveClass('loading-spinner--normal');
    });

    it('should apply custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('custom-spinner');
    });
  });

  describe('Size Variants', () => {
    const sizes = ['tiny', 'small', 'medium', 'large', 'extra-large'] as const;

    sizes.forEach(size => {
      it(`should render ${size} size correctly`, () => {
        render(<LoadingSpinner size={size} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass(`loading-spinner--${size}`);
      });
    });

    it('should default to medium size', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner--medium');
    });
  });

  describe('Color Variants', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'white', 'gray'] as const;

    colors.forEach(color => {
      it(`should render ${color} color correctly`, () => {
        render(<LoadingSpinner color={color} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass(`loading-spinner--${color}`);
      });
    });

    it('should default to primary color', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner--primary');
    });
  });

  describe('Spinner Variants', () => {
    const variants = ['spinner', 'dots', 'bars', 'pulse', 'ring'] as const;

    variants.forEach(variant => {
      it(`should render ${variant} variant correctly`, () => {
        render(<LoadingSpinner variant={variant} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass(`loading-spinner--${variant}`);
        
        // Check for variant-specific elements
        const variantElement = spinner.querySelector(`.loading-spinner__${variant}`);
        expect(variantElement).toBeInTheDocument();
      });
    });

    it('should default to spinner variant', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner--spinner');
    });

    it('should render SVG for spinner variant', () => {
      render(<LoadingSpinner variant="spinner" />);
      
      const svg = screen.getByTestId('loading-spinner').querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('should render dots for dots variant', () => {
      render(<LoadingSpinner variant="dots" />);
      
      const dots = screen.getByTestId('loading-spinner').querySelectorAll('.loading-dot');
      expect(dots).toHaveLength(3);
    });

    it('should render bars for bars variant', () => {
      render(<LoadingSpinner variant="bars" />);
      
      const bars = screen.getByTestId('loading-spinner').querySelectorAll('.loading-bar');
      expect(bars).toHaveLength(5);
    });

    it('should render pulse rings for pulse variant', () => {
      render(<LoadingSpinner variant="pulse" />);
      
      const rings = screen.getByTestId('loading-spinner').querySelectorAll('.pulse-ring');
      expect(rings).toHaveLength(2);
    });

    it('should render SVG circles for ring variant', () => {
      render(<LoadingSpinner variant="ring" />);
      
      const circles = screen.getByTestId('loading-spinner').querySelectorAll('circle');
      expect(circles).toHaveLength(2); // Background circle + animated circle
    });
  });

  describe('Speed Variants', () => {
    const speeds = ['slow', 'normal', 'fast'] as const;

    speeds.forEach(speed => {
      it(`should render ${speed} speed correctly`, () => {
        render(<LoadingSpinner speed={speed} />);
        
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toHaveClass(`loading-spinner--${speed}`);
      });
    });

    it('should default to normal speed', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('loading-spinner--normal');
    });
  });

  describe('Thickness Variants', () => {
    it('should handle thin thickness', () => {
      render(<LoadingSpinner thickness="thin" variant="spinner" />);
      
      const svg = screen.getByTestId('loading-spinner').querySelector('svg circle');
      expect(svg).toHaveAttribute('stroke-width', '1.875'); // 2.5 * 0.75
    });

    it('should handle normal thickness', () => {
      render(<LoadingSpinner thickness="normal" variant="spinner" />);
      
      const svg = screen.getByTestId('loading-spinner').querySelector('svg circle');
      expect(svg).toHaveAttribute('stroke-width', '2.5'); // Default for medium size
    });

    it('should handle thick thickness', () => {
      render(<LoadingSpinner thickness="thick" variant="spinner" />);
      
      const svg = screen.getByTestId('loading-spinner').querySelector('svg circle');
      expect(svg).toHaveAttribute('stroke-width', '3.75'); // 2.5 * 1.5
    });
  });

  describe('Overlay and Centering', () => {
    it('should render overlay when overlay prop is true', () => {
      render(<LoadingSpinner overlay />);
      
      const container = screen.getByTestId('loading-spinner').parentElement;
      expect(container).toHaveClass('loading-spinner-container--overlay');
    });

    it('should render centered when centered prop is true', () => {
      render(<LoadingSpinner centered />);
      
      const container = screen.getByTestId('loading-spinner').parentElement;
      expect(container).toHaveClass('loading-spinner-container--centered');
    });

    it('should render with both overlay and centered', () => {
      render(<LoadingSpinner overlay centered />);
      
      const container = screen.getByTestId('loading-spinner').parentElement;
      expect(container).toHaveClass('loading-spinner-container--overlay');
      expect(container).toHaveClass('loading-spinner-container--centered');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LoadingSpinner label="Loading data..." />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading data...');
    });

    it('should have screen reader text', () => {
      render(<LoadingSpinner label="Loading content" />);
      
      const srText = screen.getByText('Loading content');
      expect(srText).toHaveClass('sr-only');
    });

    it('should be announced to screen readers', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });
});

// =============================================================================
// LoadingOverlay Component Tests
// =============================================================================

describe('LoadingOverlay Component', () => {
  const TestComponent = () => <div data-testid="test-content">Test Content</div>;

  it('should render children when not loading', () => {
    render(
      <LoadingOverlay loading={false}>
        <TestComponent />
      </LoadingOverlay>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should render children and spinner when loading', () => {
    render(
      <LoadingOverlay loading={true}>
        <TestComponent />
      </LoadingOverlay>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render with backdrop by default', () => {
    render(
      <LoadingOverlay loading={true}>
        <TestComponent />
      </LoadingOverlay>
    );
    
    const backdrop = screen.getByTestId('loading-overlay').querySelector('.loading-overlay-backdrop');
    expect(backdrop).toHaveClass('loading-overlay-backdrop--visible');
  });

  it('should render without backdrop when backdrop is false', () => {
    render(
      <LoadingOverlay loading={true} backdrop={false}>
        <TestComponent />
      </LoadingOverlay>
    );
    
    const backdrop = screen.getByTestId('loading-overlay').querySelector('.loading-overlay-backdrop');
    expect(backdrop).not.toHaveClass('loading-overlay-backdrop--visible');
  });

  it('should render custom message', () => {
    render(
      <LoadingOverlay loading={true} message="Processing your request...">
        <TestComponent />
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Processing your request...')).toBeInTheDocument();
  });

  it('should pass spinner props', () => {
    render(
      <LoadingOverlay 
        loading={true} 
        spinnerProps={{ color: 'success', size: 'extra-large' }}
      >
        <TestComponent />
      </LoadingOverlay>
    );
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('loading-spinner--success');
    expect(spinner).toHaveClass('loading-spinner--extra-large');
  });

  it('should apply custom className', () => {
    render(
      <LoadingOverlay loading={true} className="custom-overlay">
        <TestComponent />
      </LoadingOverlay>
    );
    
    const wrapper = screen.getByTestId('loading-overlay');
    expect(wrapper).toHaveClass('custom-overlay');
  });
});

// =============================================================================
// LoadingButton Component Tests
// =============================================================================

describe('LoadingButton Component', () => {
  it('should render button with children when not loading', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    expect(button).toHaveTextContent('Click me');
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should render button with spinner when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('loading-button--loading');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show loading text when provided', () => {
    render(
      <LoadingButton loading={true} loadingText="Processing...">
        Click me
      </LoadingButton>
    );
    
    const button = screen.getByTestId('loading-button');
    expect(button).toHaveTextContent('Processing...');
  });

  it('should show original text when loading and no loadingText provided', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    expect(button).toHaveTextContent('Click me');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<LoadingButton loading={false} disabled>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    expect(button).toBeDisabled();
  });

  it('should be disabled when loading even if disabled prop is false', () => {
    render(<LoadingButton loading={true} disabled={false}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    expect(button).toBeDisabled();
  });

  it('should handle click events when not loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<LoadingButton loading={false} onClick={handleClick}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not handle click events when loading', async () => {
    const handleClick = vi.fn();
    
    render(<LoadingButton loading={true} onClick={handleClick}>Click me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    
    // Button should be disabled and have pointer-events: none
    expect(button).toBeDisabled();
    expect(button).toHaveStyle('pointer-events: none');
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should pass spinner props', () => {
    render(
      <LoadingButton 
        loading={true} 
        spinnerProps={{ color: 'error', variant: 'dots' }}
      >
        Click me
      </LoadingButton>
    );
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('loading-spinner--error');
    expect(spinner).toHaveClass('loading-spinner--dots');
  });

  it('should pass through button props', () => {
    render(
      <LoadingButton 
        loading={false} 
        type="submit" 
        className="custom-button"
        data-testid="custom-test-id"
      >
        Submit
      </LoadingButton>
    );
    
    const button = screen.getByTestId('loading-button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('custom-button');
  });
});

// =============================================================================
// Hook Tests
// =============================================================================

describe('useLoadingState Hook', () => {
  const TestComponent = ({ initialState = false }: { initialState?: boolean }) => {
    const { loading, startLoading, stopLoading, toggleLoading, setLoading } = useLoadingState(initialState);
    
    return (
      <div>
        <div data-testid="loading-state">{loading.toString()}</div>
        <button data-testid="start-loading" onClick={startLoading}>Start</button>
        <button data-testid="stop-loading" onClick={stopLoading}>Stop</button>
        <button data-testid="toggle-loading" onClick={toggleLoading}>Toggle</button>
        <button data-testid="set-loading-true" onClick={() => setLoading(true)}>Set True</button>
        <button data-testid="set-loading-false" onClick={() => setLoading(false)}>Set False</button>
      </div>
    );
  };

  it('should initialize with false by default', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
  });

  it('should initialize with provided initial state', () => {
    render(<TestComponent initialState={true} />);
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
  });

  it('should start loading', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    await user.click(screen.getByTestId('start-loading'));
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
  });

  it('should stop loading', async () => {
    const user = userEvent.setup();
    render(<TestComponent initialState={true} />);
    
    await user.click(screen.getByTestId('stop-loading'));
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
  });

  it('should toggle loading state', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    // Start as false, toggle to true
    await user.click(screen.getByTestId('toggle-loading'));
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    
    // Toggle back to false
    await user.click(screen.getByTestId('toggle-loading'));
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
  });

  it('should set loading state directly', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    
    await user.click(screen.getByTestId('set-loading-true'));
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    
    await user.click(screen.getByTestId('set-loading-false'));
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
  });
});

describe('withLoadingState Utility', () => {
  it('should wrap async function with loading state', async () => {
    const mockSetLoading = vi.fn();
    const mockAsyncFn = vi.fn().mockResolvedValue('success');
    
    const wrappedFn = withLoadingState(mockAsyncFn, mockSetLoading);
    
    const result = await wrappedFn('arg1', 'arg2');
    
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockAsyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockSetLoading).toHaveBeenCalledWith(false);
    expect(result).toBe('success');
  });

  it('should set loading to false even when function throws', async () => {
    const mockSetLoading = vi.fn();
    const mockAsyncFn = vi.fn().mockRejectedValue(new Error('test error'));
    
    const wrappedFn = withLoadingState(mockAsyncFn, mockSetLoading);
    
    await expect(wrappedFn()).rejects.toThrow('test error');
    
    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});

// =============================================================================
// Performance and Edge Case Tests
// =============================================================================

describe('Performance and Edge Cases', () => {
  it('should handle rapid loading state changes', async () => {
    const user = userEvent.setup();
    
    const TestComponent = () => {
      const { loading, toggleLoading } = useLoadingState();
      return (
        <div>
          <LoadingSpinner loading={loading} />
          <button data-testid="rapid-toggle" onClick={toggleLoading}>Toggle</button>
        </div>
      );
    };
    
    render(<TestComponent />);
    
    const button = screen.getByTestId('rapid-toggle');
    
    // Rapidly toggle loading state
    for (let i = 0; i < 10; i++) {
      await user.click(button);
    }
    
    // Should not crash or cause issues
    expect(button).toBeInTheDocument();
  });

  it('should handle extremely large sizes gracefully', () => {
    const { container } = render(<LoadingSpinner size="extra-large" />);
    
    const spinner = container.querySelector('.loading-spinner--extra-large');
    expect(spinner).toBeInTheDocument();
  });

  it('should render many spinners efficiently', () => {
    const startTime = performance.now();
    
    render(
      <div>
        {Array.from({ length: 50 }, (_, i) => (
          <LoadingSpinner key={i} size="small" />
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render 50 spinners quickly
    expect(renderTime).toBeLessThan(200);
  });

  it('should handle component unmounting during loading', () => {
    const TestComponent = ({ show }: { show: boolean }) => (
      show ? <LoadingSpinner /> : null
    );
    
    const { rerender } = render(<TestComponent show={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Unmount component
    rerender(<TestComponent show={false} />);
    
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility Features', () => {
  it('should have proper focus management in LoadingButton', async () => {
    const user = userEvent.setup();
    
    render(<LoadingButton loading={false}>Focus me</LoadingButton>);
    
    const button = screen.getByTestId('loading-button');
    await user.tab();
    
    expect(button).toHaveFocus();
  });

  it('should maintain accessibility when switching loading states', async () => {
    const user = userEvent.setup();
    
    const TestComponent = () => {
      const [loading, setLoading] = React.useState(false);
      
      return (
        <LoadingButton 
          loading={loading} 
          onClick={() => setLoading(!loading)}
          loadingText="Processing..."
        >
          Click me
        </LoadingButton>
      );
    };
    
    render(<TestComponent />);
    
    const button = screen.getByTestId('loading-button');
    
    // Click to start loading
    await user.click(button);
    
    // Should be accessible when loading
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing...');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have proper ARIA live region for dynamic content', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });
});