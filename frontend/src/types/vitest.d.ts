// Vitest and Jest type declarations for test files
/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import type { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

declare global {
  // Jest-compatible globals provided by Vitest
  var describe: typeof import('vitest').describe;
  var it: typeof import('vitest').it;
  var test: typeof import('vitest').test;
  var expect: typeof import('vitest').expect;
  var beforeEach: typeof import('vitest').beforeEach;
  var afterEach: typeof import('vitest').afterEach;
  var beforeAll: typeof import('vitest').beforeAll;
  var afterAll: typeof import('vitest').afterAll;
  
  // Mock utilities namespace for Jest compatibility
  namespace jest {
    const fn: typeof vi.fn;
    const clearAllMocks: typeof vi.clearAllMocks;
    const resetAllMocks: typeof vi.resetAllMocks;
    const restoreAllMocks: typeof vi.restoreAllMocks;
    const spyOn: typeof vi.spyOn;
    const mocked: typeof vi.mocked;
  }

  // Vitest mock utilities
  interface VitestUtils {
    fn: typeof vi.fn;
    mocked: typeof vi.mocked;
    spyOn: typeof vi.spyOn;
    clearAllMocks: typeof vi.clearAllMocks;
    resetAllMocks: typeof vi.resetAllMocks;
    restoreAllMocks: typeof vi.restoreAllMocks;
    importActual: typeof vi.importActual;
    importMock: typeof vi.importMock;
    doMock: typeof vi.doMock;
    doUnmock: typeof vi.doUnmock;
    mock: typeof vi.mock;
    unmock: typeof vi.unmock;
  }
  
  var vi: VitestUtils;
}

// Enhanced mock function type extensions for axios
declare module 'axios' {
  interface AxiosStatic {
    get: MockedFunction<AxiosStatic['get']>;
    post: MockedFunction<AxiosStatic['post']>;
    put: MockedFunction<AxiosStatic['put']>;
    patch: MockedFunction<AxiosStatic['patch']>;
    delete: MockedFunction<AxiosStatic['delete']>;
    request: MockedFunction<AxiosStatic['request']>;
    create: MockedFunction<AxiosStatic['create']>;
    isAxiosError: MockedFunction<typeof import('axios').isAxiosError> & {
      mockReset(): void;
      mockReturnValue(value: boolean): MockedFunction<typeof import('axios').isAxiosError>;
    };
  }
}

// React Router DOM mock types
declare module 'react-router-dom' {
  interface NavigateFunction {
    (...args: Parameters<import('react-router-dom').NavigateFunction>): void;
  }
}

// Additional vitest type helpers
type MockedFn<T extends (...args: any[]) => any> = MockedFunction<T>;
type SpyInstance<T extends (...args: any[]) => any> = import('vitest').SpyInstance<ReturnType<T>, Parameters<T>>;

// Node.js internal API extensions for testing
declare global {
  namespace NodeJS {
    interface Process {
      _getActiveHandles?: () => any[];
      _getActiveRequests?: () => any[];
    }
  }
}

// Mock process type for testing
interface MockProcess {
  pid: number;
  kill: import('vitest').Mock<any, any>;
  on: import('vitest').Mock<any, any>;
  removeAllListeners: import('vitest').Mock<any, any>;
  killed?: boolean;
  stdout?: {
    on: import('vitest').Mock<any, any>;
  };
  stderr?: {
    on: import('vitest').Mock<any, any>;
  };
}

// External module declarations
declare module 'why-is-node-running' {
  function whyIsNodeRunning(): void;
  export = whyIsNodeRunning;
}

export type { MockedFn, SpyInstance, MockedFunction, MockProcess };
export {};