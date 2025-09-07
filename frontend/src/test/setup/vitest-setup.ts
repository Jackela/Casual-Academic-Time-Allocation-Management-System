/**
 * Vitest Setup File
 * 
 * Global test configuration and setup for the refactored CATAMS frontend.
 * Includes DOM setup, mocks, and test utilities.
 */

import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// =============================================================================
// Global Test Setup
// =============================================================================

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// =============================================================================
// Global Mocks
// =============================================================================

// Mock IntersectionObserver (used by react-window)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver (used by responsive components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia (used by responsive utilities)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn()
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn()
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock fetch for API tests
global.fetch = vi.fn();

// Mock console methods to reduce test noise
const originalConsole = { ...console };
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});

// =============================================================================
// Performance and Timing Mocks
// =============================================================================

// Mock performance.now for consistent timing tests
vi.stubGlobal('performance', {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn()
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16); // ~60fps
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock setTimeout/setInterval for faster tests
vi.stubGlobal('setTimeout', (fn: Function, delay: number) => {
  // In tests, reduce delays to speed up execution
  const testDelay = Math.min(delay, 10);
  return (global as any).originalSetTimeout(fn, testDelay);
});

// Store original setTimeout for cases where we need real timing
(global as any).originalSetTimeout = global.setTimeout;

// =============================================================================
// DOM and Environment Setup
// =============================================================================

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock viewport meta for responsive tests
Object.defineProperty(document, 'documentElement', {
  value: {
    ...document.documentElement,
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn(),
      getPropertyValue: vi.fn()
    }
  },
  writable: true
});

// Mock CSS custom properties
const mockCSSStyleDeclaration = {
  setProperty: vi.fn(),
  removeProperty: vi.fn(),
  getPropertyValue: vi.fn(),
  cssText: '',
  length: 0,
  parentRule: null,
  getPropertyPriority: vi.fn(),
  item: vi.fn(),
  [Symbol.iterator]: function* () {}
};

Object.defineProperty(window, 'getComputedStyle', {
  value: () => mockCSSStyleDeclaration,
  writable: true
});

// =============================================================================
// React Testing Enhancements
// =============================================================================

// Mock React.lazy for component tests
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    lazy: vi.fn((factory) => {
      const Component = React.forwardRef((props, ref) => {
        const [LazyComponent, setLazyComponent] = React.useState(null);
        
        React.useEffect(() => {
          factory().then((module) => {
            setLazyComponent(() => module.default);
          });
        }, []);
        
        return LazyComponent ? React.createElement(LazyComponent, { ...props, ref }) : null;
      });
      
      Component.displayName = 'LazyComponent';
      return Component;
    })
  };
});

// =============================================================================
// API and Network Mocks
// =============================================================================

// Mock URL and URLSearchParams for Node.js environment
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(public href: string, base?: string) {
      if (base) {
        this.href = new (global as any).originalURL(href, base).href;
      }
    }
    
    get origin() { return this.href.split('/').slice(0, 3).join('/'); }
    get pathname() { return this.href.split('/').slice(3).join('/').split('?')[0]; }
    get search() { 
      const parts = this.href.split('?');
      return parts.length > 1 ? '?' + parts[1].split('#')[0] : '';
    }
  };
}

if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    private params = new Map<string, string>();
    
    constructor(init?: string | string[][] | Record<string, string>) {
      if (typeof init === 'string') {
        init.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.params.set(key, value));
      } else if (init) {
        Object.entries(init).forEach(([key, value]) => this.params.set(key, value));
      }
    }
    
    append(name: string, value: string) { this.params.set(name, value); }
    delete(name: string) { this.params.delete(name); }
    get(name: string) { return this.params.get(name); }
    has(name: string) { return this.params.has(name); }
    set(name: string, value: string) { this.params.set(name, value); }
    toString() { 
      return Array.from(this.params.entries())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
  };
}

// =============================================================================
// Error Handling
// =============================================================================

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests, just log
});

// Mock error boundary for testing error states
global.ErrorBoundary = class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if ((this.state as any).hasError) {
      return React.createElement('div', { 'data-testid': 'error-boundary' }, 'Something went wrong.');
    }
    
    return (this.props as any).children;
  }
};

// =============================================================================
// Test Utilities Export
// =============================================================================

// Make test utilities globally available
declare global {
  var testUtils: {
    localStorageMock: typeof localStorageMock;
    sessionStorageMock: typeof sessionStorageMock;
    originalConsole: typeof originalConsole;
  };
}

global.testUtils = {
  localStorageMock,
  sessionStorageMock,
  originalConsole
};

// =============================================================================
// Cleanup
// =============================================================================

afterAll(() => {
  // Restore original console
  Object.assign(console, originalConsole);
  
  // Clear all timers
  vi.clearAllTimers();
  
  // Reset all mocks
  vi.restoreAllMocks();
});