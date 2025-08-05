import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatHours,
  calculateTotalPay,
  truncateText,
  formatRole,
  formatStatus
} from './formatters';

describe('formatters utilities', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(45.00)).toBe('$45.00');
      expect(formatCurrency(100.50)).toBe('$100.50');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-50.00)).toBe('-$50.00');
    });

    it('should handle small amounts correctly', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should handle large amounts correctly', () => {
      expect(formatCurrency(999999.99)).toBe('$999,999.99');
    });
  });

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      const result = formatDate('2025-01-27');
      expect(result).toContain('2025');
      expect(result).toContain('Jan');
      expect(result).toContain('27');
    });

    it('should format Date objects correctly', () => {
      const date = new Date('2025-01-20T10:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('2025');
      expect(result).toContain('Jan');
      expect(result).toContain('20');
    });

    it('should throw error for invalid dates', () => {
      expect(() => formatDate('invalid-date')).toThrow('Invalid date provided');
    });

    it('should handle edge case dates', () => {
      const result = formatDate('2024-12-31');
      expect(result).toContain('2024');
      expect(result).toContain('Dec');
      expect(result).toContain('31');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime strings correctly', () => {
      const result = formatDateTime('2025-01-27T14:30:00');
      expect(result).toContain('2025');
      expect(result).toContain('Jan');
      expect(result).not.toContain('undefined');
      // Time formatting may vary by locale/system
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Should contain time
    });

    it('should throw error for invalid dates', () => {
      expect(() => formatDateTime('invalid-date')).toThrow('Invalid date provided');
    });
  });

  describe('formatHours', () => {
    it('should format hours with one decimal place', () => {
      expect(formatHours(10)).toBe('10.0');
      expect(formatHours(8.5)).toBe('8.5');
      expect(formatHours(0)).toBe('0.0');
    });

    it('should round to one decimal place', () => {
      expect(formatHours(8.567)).toBe('8.6');
      expect(formatHours(8.123)).toBe('8.1');
    });
  });

  describe('calculateTotalPay', () => {
    it('should calculate total pay correctly', () => {
      expect(calculateTotalPay(10, 45.00)).toBe(450);
      expect(calculateTotalPay(8.5, 42.00)).toBe(357);
      expect(calculateTotalPay(40, 75.50)).toBe(3020);
    });

    it('should handle zero values', () => {
      expect(calculateTotalPay(0, 50.00)).toBe(0);
      expect(calculateTotalPay(10, 0)).toBe(0);
      expect(calculateTotalPay(0, 0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateTotalPay(8.333, 45.75)).toBe(381.23);
    });

    it('should throw error for negative values', () => {
      expect(() => calculateTotalPay(-1, 45)).toThrow('Hours and hourly rate must be non-negative');
      expect(() => calculateTotalPay(10, -45)).toThrow('Hours and hourly rate must be non-negative');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const text = 'Short description';
      expect(truncateText(text)).toBe(text);
    });

    it('should truncate long text with default length', () => {
      const longText = 'This is a very long description that should be truncated because it exceeds the maximum length';
      const result = truncateText(longText);
      expect(result).toBe('This is a very long description that should be ...');
      expect(result.length).toBe(50);
    });

    it('should truncate with custom length', () => {
      const text = 'This is a medium length text';
      const result = truncateText(text, 15);
      expect(result).toBe('This is a me...');
      expect(result.length).toBe(15);
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('abc', 3)).toBe('abc');
      expect(truncateText('abcd', 3)).toBe('...');
    });
  });

  describe('formatRole', () => {
    it('should format roles correctly', () => {
      expect(formatRole('LECTURER')).toBe('Lecturer');
      expect(formatRole('TUTOR')).toBe('Tutor');
      expect(formatRole('ADMIN')).toBe('Admin');
    });

    it('should handle underscored roles', () => {
      expect(formatRole('SUPER_ADMIN')).toBe('Super Admin');
      expect(formatRole('TEACHING_ASSISTANT')).toBe('Teaching Assistant');
    });

    it('should handle lowercase roles', () => {
      expect(formatRole('lecturer')).toBe('Lecturer');
      expect(formatRole('tutor')).toBe('Tutor');
    });
  });

  describe('formatStatus', () => {
    it('should format status correctly', () => {
      expect(formatStatus('DRAFT')).toBe('Draft');
      expect(formatStatus('PENDING')).toBe('Pending');
      expect(formatStatus('APPROVED')).toBe('Approved');
      expect(formatStatus('REJECTED')).toBe('Rejected');
    });

    it('should handle lowercase status', () => {
      expect(formatStatus('pending')).toBe('Pending');
      expect(formatStatus('approved')).toBe('Approved');
    });
  });
});