/**
 * GORUNFREEX1TRILLION - TESTING UTILITIES
 * Lightweight testing framework with mocking and assertions
 */

const { EventEmitter } = require('events');

// ============================================
// ASSERTIONS
// ============================================

class AssertionError extends Error {
  constructor(message, actual, expected, operator) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
    this.operator = operator;
  }
}

const assert = {
  ok(value, message = 'Expected value to be truthy') {
    if (!value) {
      throw new AssertionError(message, value, true, 'ok');
    }
  },

  equal(actual, expected, message = `Expected ${actual} to equal ${expected}`) {
    if (actual !== expected) {
      throw new AssertionError(message, actual, expected, '===');
    }
  },

  notEqual(actual, expected, message = `Expected ${actual} to not equal ${expected}`) {
    if (actual === expected) {
      throw new AssertionError(message, actual, expected, '!==');
    }
  },

  deepEqual(actual, expected, message = 'Expected objects to be deeply equal') {
    if (!this._deepEqual(actual, expected)) {
      throw new AssertionError(message, actual, expected, 'deepEqual');
    }
  },

  notDeepEqual(actual, expected, message = 'Expected objects to not be deeply equal') {
    if (this._deepEqual(actual, expected)) {
      throw new AssertionError(message, actual, expected, 'notDeepEqual');
    }
  },

  _deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, i) => this._deepEqual(item, b[i]));
    }

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this._deepEqual(a[key], b[key]));
    }

    return false;
  },

  throws(fn, expectedError, message = 'Expected function to throw') {
    let threw = false;
    let error = null;

    try {
      fn();
    } catch (e) {
      threw = true;
      error = e;
    }

    if (!threw) {
      throw new AssertionError(message, 'no error', 'error', 'throws');
    }

    if (expectedError) {
      if (typeof expectedError === 'function' && !(error instanceof expectedError)) {
        throw new AssertionError(
          `Expected error to be instance of ${expectedError.name}`,
          error.constructor.name,
          expectedError.name,
          'throws'
        );
      }
      if (typeof expectedError === 'string' && error.message !== expectedError) {
        throw new AssertionError(
          `Expected error message "${expectedError}"`,
          error.message,
          expectedError,
          'throws'
        );
      }
      if (expectedError instanceof RegExp && !expectedError.test(error.message)) {
        throw new AssertionError(
          `Expected error message to match ${expectedError}`,
          error.message,
          expectedError,
          'throws'
        );
      }
    }
  },

  async rejects(promise, expectedError, message = 'Expected promise to reject') {
    let rejected = false;
    let error = null;

    try {
      await promise;
    } catch (e) {
      rejected = true;
      error = e;
    }

    if (!rejected) {
      throw new AssertionError(message, 'resolved', 'rejected', 'rejects');
    }

    if (expectedError && typeof expectedError === 'function' && !(error instanceof expectedError)) {
      throw new AssertionError(
        `Expected error to be instance of ${expectedError.name}`,
        error.constructor.name,
        expectedError.name,
        'rejects'
      );
    }
  },

  isType(value, type, message) {
    const actualType = typeof value;
    if (actualType !== type) {
      throw new AssertionError(
        message || `Expected typeof ${type}, got ${actualType}`,
        actualType,
        type,
        'typeof'
      );
    }
  },

  isArray(value, message = 'Expected value to be an array') {
    if (!Array.isArray(value)) {
      throw new AssertionError(message, typeof value, 'array', 'isArray');
    }
  },

  hasProperty(obj, prop, message = `Expected object to have property "${prop}"`) {
    if (!(prop in obj)) {
      throw new AssertionError(message, Object.keys(obj), prop, 'hasProperty');
    }
  },

  includes(array, item, message = 'Expected array to include item') {
    if (!array.includes(item)) {
      throw new AssertionError(message, array, item, 'includes');
    }
  },

  match(value, regex, message = 'Expected value to match pattern') {
    if (!regex.test(value)) {
      throw new AssertionError(message, value, regex, 'match');
    }
  },

  closeTo(actual, expected, delta = 0.001, message) {
    if (Math.abs(actual - expected) > delta) {
      throw new AssertionError(
        message || `Expected ${actual} to be close to ${expected} (delta: ${delta})`,
        actual,
        expected,
        'closeTo'
      );
    }
  }
};

// ============================================
// MOCKING
// ============================================

class Mock {
  constructor(implementation = () => {}) {
    this.calls = [];
    this.implementation = implementation;
    this.returnValues = [];
    this.returnIndex = 0;

    const mock = (...args) => {
      this.calls.push({ args, timestamp: Date.now() });

      if (this.returnValues.length > 0) {
        const value = this.returnValues[this.returnIndex];
        this.returnIndex = Math.min(this.returnIndex + 1, this.returnValues.length - 1);
        return value;
      }

      return this.implementation(...args);
    };

    mock.mock = this;
    return mock;
  }

  returns(value) {
    this.returnValues = [value];
    return this;
  }

  returnsOnce(value) {
    this.returnValues.push(value);
    return this;
  }

  resolves(value) {
    this.implementation = () => Promise.resolve(value);
    return this;
  }

  rejects(error) {
    this.implementation = () => Promise.reject(error);
    return this;
  }

  get callCount() {
    return this.calls.length;
  }

  get called() {
    return this.calls.length > 0;
  }

  get lastCall() {
    return this.calls[this.calls.length - 1];
  }

  calledWith(...args) {
    return this.calls.some(call =>
      args.every((arg, i) => assert._deepEqual(arg, call.args[i]))
    );
  }

  calledOnceWith(...args) {
    return this.calls.length === 1 && this.calledWith(...args);
  }

  reset() {
    this.calls = [];
    this.returnIndex = 0;
  }
}

function mock(implementation) {
  return new Mock(implementation);
}

function spy(obj, method) {
  const original = obj[method];
  const mockFn = mock(original.bind(obj));

  obj[method] = mockFn;
  mockFn.restore = () => { obj[method] = original; };

  return mockFn;
}

function stub(obj, method) {
  const mockFn = mock();

  obj[method] = mockFn;
  mockFn.restore = () => { delete obj[method]; };

  return mockFn;
}

// ============================================
// TEST RUNNER
// ============================================

class TestRunner extends EventEmitter {
  constructor() {
    super();
    this.suites = [];
    this.currentSuite = null;
    this.results = { passed: 0, failed: 0, skipped: 0, duration: 0 };
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: [],
      only: false,
      skip: false
    };

    const previousSuite = this.currentSuite;
    this.currentSuite = suite;

    fn();

    this.currentSuite = previousSuite;

    if (previousSuite) {
      previousSuite.tests.push({ type: 'suite', suite });
    } else {
      this.suites.push(suite);
    }

    return this;
  }

  it(name, fn, options = {}) {
    if (!this.currentSuite) {
      throw new Error('it() must be called within describe()');
    }

    this.currentSuite.tests.push({
      type: 'test',
      name,
      fn,
      only: options.only || false,
      skip: options.skip || false,
      timeout: options.timeout || 5000
    });

    return this;
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAll.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAll.push(fn);
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach.push(fn);
    }
  }

  async run() {
    const startTime = Date.now();
    this.results = { passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };

    this.emit('start');

    for (const suite of this.suites) {
      await this.runSuite(suite, 0);
    }

    this.results.duration = Date.now() - startTime;
    this.emit('end', this.results);

    return this.results;
  }

  async runSuite(suite, depth) {
    const indent = '  '.repeat(depth);
    this.emit('suite', { suite, depth });
    console.log(`\n${indent}${suite.name}`);

    // Run beforeAll hooks
    for (const hook of suite.beforeAll) {
      await hook();
    }

    for (const item of suite.tests) {
      if (item.type === 'suite') {
        await this.runSuite(item.suite, depth + 1);
      } else {
        await this.runTest(item, suite, depth + 1);
      }
    }

    // Run afterAll hooks
    for (const hook of suite.afterAll) {
      await hook();
    }
  }

  async runTest(test, suite, depth) {
    const indent = '  '.repeat(depth);

    if (test.skip) {
      this.results.skipped++;
      console.log(`${indent}\x1b[33m○\x1b[0m ${test.name} (skipped)`);
      this.emit('skip', { test });
      return;
    }

    // Run beforeEach hooks
    for (const hook of suite.beforeEach) {
      await hook();
    }

    const startTime = Date.now();

    try {
      await Promise.race([
        test.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), test.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      this.results.passed++;
      console.log(`${indent}\x1b[32m✓\x1b[0m ${test.name} \x1b[90m(${duration}ms)\x1b[0m`);
      this.emit('pass', { test, duration });

    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.failures.push({ test, error });
      console.log(`${indent}\x1b[31m✗\x1b[0m ${test.name} \x1b[90m(${duration}ms)\x1b[0m`);
      console.log(`${indent}  \x1b[31m${error.message}\x1b[0m`);
      this.emit('fail', { test, error, duration });
    }

    // Run afterEach hooks
    for (const hook of suite.afterEach) {
      await hook();
    }
  }

  printSummary() {
    console.log('\n' + '─'.repeat(50));
    console.log(`\x1b[32m${this.results.passed} passing\x1b[0m`);
    if (this.results.failed > 0) {
      console.log(`\x1b[31m${this.results.failed} failing\x1b[0m`);
    }
    if (this.results.skipped > 0) {
      console.log(`\x1b[33m${this.results.skipped} skipped\x1b[0m`);
    }
    console.log(`\x1b[90mDuration: ${this.results.duration}ms\x1b[0m\n`);

    if (this.results.failures.length > 0) {
      console.log('\nFailures:\n');
      this.results.failures.forEach(({ test, error }, i) => {
        console.log(`  ${i + 1}) ${test.name}`);
        console.log(`     \x1b[31m${error.message}\x1b[0m`);
        if (error.stack) {
          console.log(`     \x1b[90m${error.stack.split('\n').slice(1, 4).join('\n')}\x1b[0m`);
        }
      });
    }
  }
}

// ============================================
// MATCHERS (Jest-style expect)
// ============================================

function expect(actual) {
  return {
    toBe(expected) {
      assert.equal(actual, expected);
    },
    toEqual(expected) {
      assert.deepEqual(actual, expected);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toBeNull() {
      assert.equal(actual, null);
    },
    toBeUndefined() {
      assert.equal(actual, undefined);
    },
    toBeDefined() {
      assert.notEqual(actual, undefined);
    },
    toBeInstanceOf(constructor) {
      assert.ok(actual instanceof constructor, `Expected instance of ${constructor.name}`);
    },
    toContain(item) {
      assert.includes(actual, item);
    },
    toHaveLength(length) {
      assert.equal(actual.length, length);
    },
    toHaveProperty(prop) {
      assert.hasProperty(actual, prop);
    },
    toMatch(pattern) {
      assert.match(actual, pattern);
    },
    toThrow(expected) {
      assert.throws(() => actual(), expected);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected) {
      assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toBeCloseTo(expected, precision = 2) {
      const delta = Math.pow(10, -precision) / 2;
      assert.closeTo(actual, expected, delta);
    },

    // Negation
    not: {
      toBe(expected) {
        assert.notEqual(actual, expected);
      },
      toEqual(expected) {
        assert.notDeepEqual(actual, expected);
      },
      toContain(item) {
        assert.ok(!actual.includes(item), 'Expected array to not contain item');
      }
    }
  };
}

// ============================================
// GLOBAL TEST RUNNER INSTANCE
// ============================================

const runner = new TestRunner();

const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const test = it;
const beforeAll = runner.beforeAll.bind(runner);
const afterAll = runner.afterAll.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

// Modifiers
it.only = (name, fn) => runner.it(name, fn, { only: true });
it.skip = (name, fn) => runner.it(name, fn, { skip: true });
describe.only = (name, fn) => { /* TODO */ };
describe.skip = (name, fn) => { /* TODO */ };

// ============================================
// EXPORTS
// ============================================

module.exports = {
  TestRunner,
  assert,
  expect,
  mock,
  spy,
  stub,
  Mock,
  AssertionError,

  // Global functions
  describe,
  it,
  test,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,

  // Run tests
  run: async () => {
    const results = await runner.run();
    runner.printSummary();
    return results;
  },

  // Create new runner
  createRunner: () => new TestRunner()
};
