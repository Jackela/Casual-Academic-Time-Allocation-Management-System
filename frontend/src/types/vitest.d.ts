/**
 * Extended Vitest type declarations used across the test suite.
 * Ensures compatibility with Jest-style helpers without resorting to `any`.
 */

import type { MockInstance, MockedFunction, SpyInstance as VitestSpyInstance, VitestUtils } from 'vitest';
// eslint-disable-next-line import/no-unresolved
import 'vitest/globals';

/**
 * Helper function signature used to derive mocked function variants without `any`.
 */
type AnyFunction = (...arguments_: unknown[]) => unknown;

/**
 * Typed Jest-compatible helpers backed by the real Vitest mock implementations.
 */
type JestLikeUtils = {
  fn: VitestUtils['fn'];
  clearAllMocks: VitestUtils['clearAllMocks'];
  resetAllMocks: VitestUtils['resetAllMocks'];
  restoreAllMocks: VitestUtils['restoreAllMocks'];
  spyOn: VitestUtils['spyOn'];
  mocked: VitestUtils['mocked'];
};

/**
 * Convenience alias that mirrors Vitest's `MockedFunction` while preserving input/output types.
 */
type MockedFn<T extends AnyFunction> = MockedFunction<T>;

/**
 * Spy instance alias tied to a provided function signature.
 */
type SpyInstance<T extends AnyFunction> = VitestSpyInstance<ReturnType<T>, Parameters<T>>;

/**
 * Internal process inspector signature used by the handle monitoring utilities.
 */
type ProcessInspector = () => unknown[];

/**
 * Common mocked listener signature used for process/stdout/stderr event hooks.
 */
type ProcessListenerMock = MockInstance<void, [string, (...args: unknown[]) => void]>;

/**
 * Lightweight mocked `process` representation leveraged by cleanup utilities in tests.
 */
interface MockProcess {
  pid: number;
  kill: MockInstance<boolean, [number, NodeJS.Signals | number | undefined]>;
  on: MockInstance<MockProcess, [string, (...args: unknown[]) => void]>;
  removeAllListeners: MockInstance<MockProcess, [string?]>;
  killed?: boolean;
  stdout?: {
    on: ProcessListenerMock;
  };
  stderr?: {
    on: ProcessListenerMock;
  };
}

/**
 * Axios mock augmentations ensure the spy-aware helpers retain full typing.
 */
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

/**
 * Adds compatibility shim for React Router's navigate helper while retaining parameter inference.
 */
declare module 'react-router-dom' {
  interface NavigateFunction {
    (...args: Parameters<import('react-router-dom').NavigateFunction>): ReturnType<import('react-router-dom').NavigateFunction>;
  }
}

/**
 * Node.js process inspection hooks used during resource-leak tests.
 */
declare global {
  namespace NodeJS {
    interface Process {
      _getActiveHandles?: ProcessInspector;
      _getActiveRequests?: ProcessInspector;
    }
  }
}

/**
 * Ambient declaration for the diagnostics helper library.
 */
declare module 'why-is-node-running' {
  function whyIsNodeRunning(): void;
  export = whyIsNodeRunning;
}

export type {
  JestLikeUtils,
  MockProcess,
  MockedFn,
  MockedFunction,
  ProcessInspector,
  ProcessListenerMock,
  SpyInstance,
};
export {};
