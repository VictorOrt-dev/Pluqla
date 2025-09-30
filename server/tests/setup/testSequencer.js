/**
 * Custom Test Sequencer
 *
 * Controls the order in which test files are executed
 * Ensures auth tests run before integration tests
 */

const Sequencer = require('@jest/test-sequencer').default;

class AuthTestSequencer extends Sequencer {
  sort(tests) {
    // Define test execution order
    const testOrder = [
      // 1. Basic auth functionality first
      'betterAuth.test.js',

      // 2. AI endpoint protection
      'aiEndpointProtection.test.js',

      // 3. Integration tests
      'authIntegration.test.js',

      // 4. Performance and edge cases
      'authPerformance.test.js',
      'authEdgeCases.test.js'
    ];

    // Sort tests based on defined order
    return tests.sort((testA, testB) => {
      const getTestPriority = (testPath) => {
        for (let i = 0; i < testOrder.length; i++) {
          if (testPath.includes(testOrder[i])) {
            return i;
          }
        }
        return testOrder.length; // Unknown tests go last
      };

      const priorityA = getTestPriority(testA.path);
      const priorityB = getTestPriority(testB.path);

      // Primary sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by file path (for consistency)
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = AuthTestSequencer;