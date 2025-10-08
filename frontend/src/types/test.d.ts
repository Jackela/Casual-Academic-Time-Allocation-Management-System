import type { JestLikeUtils } from './vitest';
// eslint-disable-next-line import/no-unresolved
import 'vitest/globals';

declare global {
  const jest: JestLikeUtils;
}

export {};
