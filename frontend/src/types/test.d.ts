// Test framework type declarations
declare global {
  var describe: (name: string, fn: () => void) => void;
  var it: (name: string, fn: () => void) => void;
  var expect: any;
  var beforeEach: (fn: () => void) => void;
  var afterEach: (fn: () => void) => void;
  var beforeAll: (fn: () => void) => void;
  var afterAll: (fn: () => void) => void;
  var jest: {
    fn: () => any;
    clearAllMocks: () => void;
  };
}

export {};