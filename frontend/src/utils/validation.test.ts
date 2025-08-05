import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateHours,
  validateHourlyRate,
  validateDescription,
  validateDate,
  validateWeekStartDate,
  validateRequired
} from './validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toEqual({ isValid: true });
      expect(validateEmail('user.name+tag@domain.co.uk')).toEqual({ isValid: true });
      expect(validateEmail('lecturer@university.edu.au')).toEqual({ isValid: true });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject invalid email formats', () => {
      const testCases = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user name@domain.com'
      ];

      testCases.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Email format is invalid');
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is too long');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123',
        'StrongPass1',
        'ComplexP@ssw0rd',
        'ValidPassword1'
      ];

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toEqual({ isValid: true });
      });
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('PasswordABC');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one number');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'A' + 'a'.repeat(127) + '1'; // 129 chars total
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is too long');
    });
  });

  describe('validateHours', () => {
    it('should validate correct hours', () => {
      const validHours = [0.1, 1, 8.5, 40, 168];
      
      validHours.forEach(hours => {
        expect(validateHours(hours)).toEqual({ isValid: true });
      });
    });

    it('should reject NaN values', () => {
      const result = validateHours(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hours must be a valid number');
    });

    it('should reject hours below minimum', () => {
      const result = validateHours(0.05);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hours must be at least 0.1');
    });

    it('should reject hours above maximum', () => {
      const result = validateHours(200);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hours cannot exceed 168 per week');
    });
  });

  describe('validateHourlyRate', () => {
    it('should validate correct rates', () => {
      const validRates = [20, 45.50, 75, 150, 200];
      
      validRates.forEach(rate => {
        expect(validateHourlyRate(rate)).toEqual({ isValid: true });
      });
    });

    it('should reject NaN values', () => {
      const result = validateHourlyRate(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hourly rate must be a valid number');
    });

    it('should reject zero or negative rates', () => {
      expect(validateHourlyRate(0).isValid).toBe(false);
      expect(validateHourlyRate(-10).isValid).toBe(false);
    });

    it('should reject rates above maximum', () => {
      const result = validateHourlyRate(250);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Hourly rate cannot exceed 200.00');
    });
  });

  describe('validateDescription', () => {
    it('should validate correct descriptions', () => {
      const validDescriptions = [
        'Valid description',
        'Teaching assistance for COMP1234',
        'Marking assignments and providing feedback to students'
      ];
      
      validDescriptions.forEach(desc => {
        expect(validateDescription(desc)).toEqual({ isValid: true });
      });
    });

    it('should reject empty description', () => {
      const result = validateDescription('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should reject whitespace-only description', () => {
      const result = validateDescription('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description cannot be empty');
    });

    it('should reject descriptions that are too long', () => {
      const longDescription = 'a'.repeat(501);
      const result = validateDescription(longDescription);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description cannot exceed 500 characters');
    });
  });

  describe('validateDate', () => {
    it('should validate correct dates', () => {
      const validDates = [
        '2025-01-27',
        '2024-12-01',
        new Date().toISOString().split('T')[0] // Today
      ];
      
      validDates.forEach(date => {
        expect(validateDate(date)).toEqual({ isValid: true });
      });
    });

    it('should reject empty date', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date is required');
    });

    it('should reject invalid date formats', () => {
      const invalidDates = ['invalid-date', '2025-13-01', '2025-01-32'];
      
      invalidDates.forEach(date => {
        const result = validateDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid date format');
      });
    });

    it('should reject dates too far in the past', () => {
      const oldDate = '2020-01-01';
      const result = validateDate(oldDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date cannot be more than 2 years in the past');
    });

    it('should reject dates too far in the future', () => {
      const futureDate = '2030-01-01';
      const result = validateDate(futureDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date cannot be more than 1 year in the future');
    });
  });

  describe('validateWeekStartDate', () => {
    it('should validate Monday dates', () => {
      // 2025-01-27 is a Monday
      const result = validateWeekStartDate('2025-01-27');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-Monday dates', () => {
      // 2025-01-28 is a Tuesday
      const result = validateWeekStartDate('2025-01-28');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Week start date must be a Monday');
    });

    it('should reject invalid dates', () => {
      const result = validateWeekStartDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      const validValues = ['text', 123, true, [], {}];
      
      validValues.forEach(value => {
        expect(validateRequired(value, 'Field')).toEqual({ isValid: true });
      });
    });

    it('should reject null and undefined', () => {
      expect(validateRequired(null, 'Field').isValid).toBe(false);
      expect(validateRequired(undefined, 'Field').isValid).toBe(false);
    });

    it('should reject empty strings', () => {
      const result = validateRequired('', 'Email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateRequired('   ', 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot be empty');
    });
  });
});