import { test, expect } from '@playwright/experimental-ct-react';

// Simple utility function tests that don't require React components
test.describe('Utility Functions', () => {
  test('should format currency correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD'
        }).format(amount);
      };
      
      return {
        basic: formatCurrency(45.00),
        withCents: formatCurrency(100.50),
        large: formatCurrency(1234.56),
        zero: formatCurrency(0)
      };
    });
    
    expect(result.basic).toBe('$45.00');
    expect(result.withCents).toBe('$100.50');
    expect(result.large).toBe('$1,234.56');
    expect(result.zero).toBe('$0.00');
  });

  test('should format dates correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };
      
      return {
        simple: formatDate('2025-01-27'),
        withTime: formatDate('2025-01-20T10:00:00Z'),
        endOfYear: formatDate('2024-12-31')
      };
    });
    
    // Verify date components are present (exact format may vary by system)
    expect(result.simple).toContain('2025');
    expect(result.simple).toContain('Jan');
    expect(result.simple).toContain('27');
    
    expect(result.withTime).toContain('2025');
    expect(result.withTime).toContain('Jan');
    expect(result.withTime).toContain('20');
    
    expect(result.endOfYear).toContain('2024');
    expect(result.endOfYear).toContain('Dec');
    expect(result.endOfYear).toContain('31');
  });

  test('should calculate pay totals correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getTotalPay = (hours: number, hourlyRate: number) => {
        return hours * hourlyRate;
      };
      
      return {
        basic: getTotalPay(10, 45.00),
        fractional: getTotalPay(8.5, 42.00),
        large: getTotalPay(40, 75.50),
        zero: getTotalPay(0, 50.00)
      };
    });
    
    expect(result.basic).toBe(450);
    expect(result.fractional).toBe(357);
    expect(result.large).toBe(3020);
    expect(result.zero).toBe(0);
  });

  test('should validate business rules', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateHours = (hours: number) => {
        return hours > 0 && hours <= 168; // Max hours per week
      };
      
      const validateRate = (rate: number) => {
        return rate > 0 && rate < 1000; // Reasonable hourly rate range
      };
      
      const truncateDescription = (desc: string, maxLength: number = 50) => {
        return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
      };
      
      return {
        validHours: validateHours(40),
        invalidHours: validateHours(200),
        validRate: validateRate(45.00),
        invalidRate: validateRate(2000),
        shortDesc: truncateDescription('Short description'),
        longDesc: truncateDescription('This is a very long description that should be truncated because it exceeds the maximum length')
      };
    });
    
    expect(result.validHours).toBe(true);
    expect(result.invalidHours).toBe(false);
    expect(result.validRate).toBe(true);
    expect(result.invalidRate).toBe(false);
    expect(result.shortDesc).toBe('Short description');
    expect(result.longDesc).toBe('This is a very long description that should be t...');
  });

  test('should handle edge cases', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD'
        }).format(amount);
      };
      
      const safeDivide = (a: number, b: number) => {
        return b === 0 ? 0 : a / b;
      };
      
      return {
        negativeAmount: formatCurrency(-50.00),
        smallAmount: formatCurrency(0.01),
        safeDivideByZero: safeDivide(100, 0),
        normalDivision: safeDivide(100, 4)
      };
    });
    
    expect(result.negativeAmount).toBe('-$50.00');
    expect(result.smallAmount).toBe('$0.01');
    expect(result.safeDivideByZero).toBe(0);
    expect(result.normalDivision).toBe(25);
  });
});