/**
 * StatusBadge Component Tests
 * 
 * Comprehensive test suite following TDD methodology for StatusBadge component.
 * Tests all functionality, accessibility, and edge cases.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusBadge, { 
  StatusBadgeGroup, 
  getStatusConfig, 
  getStatusPriority, 
  isActionableStatus, 
  getNextStatuses 
} from './StatusBadge';
import type { TimesheetStatus } from '../../../types/api';

// =============================================================================
// Test Data
// =============================================================================

const allStatuses: TimesheetStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED_BY_LECTURER',
  'REJECTED_BY_LECTURER',
  'APPROVED_BY_ADMIN',
  'REJECTED_BY_ADMIN',
  'FINAL_APPROVED',
  'PAID'
];

const mockProps = {
  status: 'SUBMITTED' as TimesheetStatus,
  size: 'medium' as const,
  showIcon: true,
  interactive: false
};

// =============================================================================
// StatusBadge Component Tests
// =============================================================================

describe('StatusBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Submitted');
    });

    it('should render all status types correctly', () => {
      allStatuses.forEach(status => {
        const { unmount } = render(<StatusBadge status={status} />);
        
        const badge = screen.getByTestId(`status-badge-${status.toLowerCase()}`);
        expect(badge).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should apply correct CSS classes for status', () => {
      render(<StatusBadge status="FINAL_APPROVED" />);
      
      const badge = screen.getByTestId('status-badge-final_approved');
      expect(badge).toHaveClass('status-badge--final-approved');
    });

    it('should handle invalid status gracefully', () => {
      // @ts-expect-error - Testing invalid status
      render(<StatusBadge status="INVALID_STATUS" />);
      
      // Should fallback to draft configuration
      const badge = screen.getByTestId('status-badge-invalid_status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Draft');
    });
  });

  describe('Size Variants', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach(size => {
      it(`should render ${size} size correctly`, () => {
        render(<StatusBadge status="SUBMITTED" size={size} />);
        
        const badge = screen.getByTestId('status-badge-submitted');
        expect(badge).toHaveClass(`status-badge--${size}`);
      });
    });

    it('should default to medium size', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveClass('status-badge--medium');
    });
  });

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const icon = screen.getByLabelText(/status: submitted/i);
      expect(icon.querySelector('.status-badge__icon')).toBeInTheDocument();
    });

    it('should hide icon when showIcon is false', () => {
      render(<StatusBadge status="SUBMITTED" showIcon={false} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge.querySelector('.status-badge__icon')).not.toBeInTheDocument();
    });

    it('should display correct icon for each status', () => {
      const iconMap = {
        DRAFT: '📝',
        SUBMITTED: '📤',
        APPROVED_BY_LECTURER: '✅',
        REJECTED_BY_LECTURER: '❌',
        FINAL_APPROVED: '🎉',
        PAID: '💰'
      };

      Object.entries(iconMap).forEach(([status, expectedIcon]) => {
        const { unmount } = render(<StatusBadge status={status as TimesheetStatus} />);
        
        const badge = screen.getByTestId(`status-badge-${status.toLowerCase()}`);
        const icon = badge.querySelector('.status-badge__icon');
        expect(icon).toHaveTextContent(expectedIcon);
        
        unmount();
      });
    });
  });

  describe('Interactive Behavior', () => {
    it('should not be interactive by default', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).not.toHaveAttribute('role', 'button');
      expect(badge).not.toHaveAttribute('tabIndex');
    });

    it('should be interactive when interactive prop is true', () => {
      const handleClick = vi.fn();
      render(<StatusBadge status="SUBMITTED" interactive onClick={handleClick} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveAttribute('role', 'button');
      expect(badge).toHaveAttribute('tabIndex', '0');
      expect(badge).toHaveClass('status-badge--interactive');
    });

    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<StatusBadge status="SUBMITTED" interactive onClick={handleClick} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      await user.click(badge);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Enter key is pressed', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<StatusBadge status="SUBMITTED" interactive onClick={handleClick} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      badge.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<StatusBadge status="SUBMITTED" interactive onClick={handleClick} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      badge.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when not interactive', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<StatusBadge status="SUBMITTED" onClick={handleClick} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      await user.click(badge);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByLabelText(/status: submitted\. awaiting lecturer approval/i);
      expect(badge).toBeInTheDocument();
    });

    it('should have proper title attribute', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveAttribute('title', 'Awaiting lecturer approval');
    });

    it('should be keyboard accessible when interactive', () => {
      render(<StatusBadge status="SUBMITTED" interactive onClick={vi.fn()} />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper semantic structure', () => {
      render(<StatusBadge status="SUBMITTED" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge.querySelector('.status-badge__label')).toHaveTextContent('Submitted');
      expect(badge.querySelector('.status-badge__icon')).toBeInTheDocument();
    });
  });

  describe('Custom Classes and Styling', () => {
    it('should apply custom className', () => {
      render(<StatusBadge status="SUBMITTED" className="custom-class" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveClass('custom-class');
    });

    it('should maintain base classes with custom className', () => {
      render(<StatusBadge status="SUBMITTED" className="custom-class" />);
      
      const badge = screen.getByTestId('status-badge-submitted');
      expect(badge).toHaveClass('status-badge');
      expect(badge).toHaveClass('status-badge--medium');
      expect(badge).toHaveClass('status-badge--submitted');
      expect(badge).toHaveClass('custom-class');
    });
  });
});

// =============================================================================
// StatusBadgeGroup Component Tests
// =============================================================================

describe('StatusBadgeGroup Component', () => {
  const multipleStatuses: TimesheetStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED_BY_LECTURER', 'PAID'];

  it('should render all statuses when within maxVisible limit', () => {
    render(<StatusBadgeGroup statuses={multipleStatuses} maxVisible={5} />);
    
    multipleStatuses.forEach(status => {
      expect(screen.getByTestId(`status-badge-${status.toLowerCase()}`)).toBeInTheDocument();
    });
  });

  it('should limit visible statuses and show overflow count', () => {
    render(<StatusBadgeGroup statuses={multipleStatuses} maxVisible={2} />);
    
    // Should show first 2 statuses
    expect(screen.getByTestId('status-badge-draft')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-submitted')).toBeInTheDocument();
    
    // Should not show the rest
    expect(screen.queryByTestId('status-badge-approved-by-lecturer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-badge-paid')).not.toBeInTheDocument();
    
    // Should show overflow indicator
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should not show overflow when all statuses are visible', () => {
    render(<StatusBadgeGroup statuses={multipleStatuses} maxVisible={4} />);
    
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('should pass props to individual badges', () => {
    render(<StatusBadgeGroup statuses={['SUBMITTED']} size="large" showIcon={false} />);
    
    const badge = screen.getByTestId('status-badge-submitted');
    expect(badge).toHaveClass('status-badge--large');
    expect(badge.querySelector('.status-badge__icon')).not.toBeInTheDocument();
  });

  it('should apply custom className to group', () => {
    render(<StatusBadgeGroup statuses={['SUBMITTED']} className="custom-group-class" />);
    
    const group = screen.getByTestId('status-badge-group');
    expect(group).toHaveClass('custom-group-class');
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('getStatusConfig', () => {
    it('should return correct config for valid status', () => {
      const config = getStatusConfig('SUBMITTED');
      
      expect(config).toEqual({
        label: 'Submitted',
        icon: '📤',
        color: '#1D4ED8',
        bgColor: '#EFF6FF',
        borderColor: '#DBEAFE',
        description: 'Awaiting lecturer approval'
      });
    });

    it('should return draft config for invalid status', () => {
      // @ts-expect-error - Testing invalid status
      const config = getStatusConfig('INVALID');
      
      expect(config.label).toBe('Draft');
    });
  });

  describe('getStatusPriority', () => {
    it('should return correct priorities for different statuses', () => {
      expect(getStatusPriority('SUBMITTED')).toBe(5); // Highest priority
      expect(getStatusPriority('REJECTED_BY_LECTURER')).toBe(4);
      expect(getStatusPriority('APPROVED_BY_LECTURER')).toBe(3);
      expect(getStatusPriority('APPROVED_BY_ADMIN')).toBe(2);
      expect(getStatusPriority('DRAFT')).toBe(1);
      expect(getStatusPriority('PAID')).toBe(0); // Lowest priority
    });

    it('should return 0 for invalid status', () => {
      // @ts-expect-error - Testing invalid status
      expect(getStatusPriority('INVALID')).toBe(0);
    });
  });

  describe('isActionableStatus', () => {
    it('should return correct actionable statuses for LECTURER', () => {
      expect(isActionableStatus('SUBMITTED', 'LECTURER')).toBe(true);
      expect(isActionableStatus('DRAFT', 'LECTURER')).toBe(false);
      expect(isActionableStatus('APPROVED_BY_LECTURER', 'LECTURER')).toBe(false);
    });

    it('should return correct actionable statuses for ADMIN', () => {
      expect(isActionableStatus('APPROVED_BY_LECTURER', 'ADMIN')).toBe(true);
      expect(isActionableStatus('SUBMITTED', 'ADMIN')).toBe(true);
      expect(isActionableStatus('DRAFT', 'ADMIN')).toBe(false);
      expect(isActionableStatus('PAID', 'ADMIN')).toBe(false);
    });

    it('should return correct actionable statuses for TUTOR', () => {
      expect(isActionableStatus('DRAFT', 'TUTOR')).toBe(true);
      expect(isActionableStatus('REJECTED_BY_LECTURER', 'TUTOR')).toBe(true);
      expect(isActionableStatus('REJECTED_BY_ADMIN', 'TUTOR')).toBe(true);
      expect(isActionableStatus('SUBMITTED', 'TUTOR')).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(isActionableStatus('SUBMITTED', 'UNKNOWN')).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('should return correct next statuses for TUTOR', () => {
      expect(getNextStatuses('DRAFT', 'TUTOR')).toEqual(['SUBMITTED']);
      expect(getNextStatuses('REJECTED_BY_LECTURER', 'TUTOR')).toEqual(['SUBMITTED']);
      expect(getNextStatuses('SUBMITTED', 'TUTOR')).toEqual([]);
    });

    it('should return correct next statuses for LECTURER', () => {
      expect(getNextStatuses('SUBMITTED', 'LECTURER')).toEqual(['APPROVED_BY_LECTURER', 'REJECTED_BY_LECTURER']);
      expect(getNextStatuses('DRAFT', 'LECTURER')).toEqual([]);
    });

    it('should return correct next statuses for ADMIN', () => {
      expect(getNextStatuses('APPROVED_BY_LECTURER', 'ADMIN')).toEqual(['FINAL_APPROVED', 'REJECTED_BY_ADMIN']);
      expect(getNextStatuses('FINAL_APPROVED', 'ADMIN')).toEqual(['PAID']);
    });

    it('should return empty array for unknown role', () => {
      expect(getNextStatuses('SUBMITTED', 'UNKNOWN')).toEqual([]);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('StatusBadge Integration', () => {
  it('should work with real-world status flow', () => {
    const statuses: TimesheetStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED_BY_LECTURER', 'FINAL_APPROVED', 'PAID'];
    
    statuses.forEach((status) => {
      const { rerender } = render(<StatusBadge status={status} />);
      
      const badge = screen.getByTestId(`status-badge-${status.toLowerCase()}`);
      expect(badge).toBeInTheDocument();
      
      // Verify status has a valid priority
      const priority = getStatusPriority(status);
      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(5);
    });
  });

  it('should handle status transitions correctly', () => {
    let currentStatus: TimesheetStatus = 'DRAFT';
    const { rerender } = render(<StatusBadge status={currentStatus} />);
    
    // Tutor submits
    currentStatus = 'SUBMITTED';
    rerender(<StatusBadge status={currentStatus} />);
    expect(screen.getByTestId('status-badge-submitted')).toBeInTheDocument();
    
    // Lecturer approves
    currentStatus = 'APPROVED_BY_LECTURER';
    rerender(<StatusBadge status={currentStatus} />);
    expect(screen.getByTestId('status-badge-approved_by_lecturer')).toBeInTheDocument();
    
    // Admin final approval
    currentStatus = 'FINAL_APPROVED';
    rerender(<StatusBadge status={currentStatus} />);
    expect(screen.getByTestId('status-badge-final_approved')).toBeInTheDocument();
    
    // Payment processed
    currentStatus = 'PAID';
    rerender(<StatusBadge status={currentStatus} />);
    expect(screen.getByTestId('status-badge-paid')).toBeInTheDocument();
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('StatusBadge Performance', () => {
  it('should render quickly with many badges', () => {
    const startTime = performance.now();
    
    const manyStatuses = Array(100).fill('SUBMITTED') as TimesheetStatus[];
    render(
      <div>
        {manyStatuses.map((status, index) => (
          <StatusBadge key={index} status={status} />
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render 100 badges in under 100ms
    expect(renderTime).toBeLessThan(100);
  });
});