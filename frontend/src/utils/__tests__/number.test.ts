import { describe, expect, it } from 'vitest';
import { hasAtMostDecimalPlaces } from '../../utils/number';

describe('number utils', () => {
  describe('hasAtMostDecimalPlaces', () => {
    it('returns true when value has fewer decimals than limit', () => {
      expect(hasAtMostDecimalPlaces(1.23, 2)).toBe(true);
      expect(hasAtMostDecimalPlaces('4.5', 2)).toBe(true);
    });

    it('returns false when value exceeds decimal limit', () => {
      expect(hasAtMostDecimalPlaces(1.234, 2)).toBe(false);
      expect(hasAtMostDecimalPlaces('4.5678', 3)).toBe(false);
    });

    it('handles integers and values without decimals', () => {
      expect(hasAtMostDecimalPlaces(10, 2)).toBe(true);
      expect(hasAtMostDecimalPlaces('42', 0)).toBe(true);
    });

    it('rejects non-numeric inputs', () => {
      expect(hasAtMostDecimalPlaces('abc', 2)).toBe(false);
    });
  });
});
