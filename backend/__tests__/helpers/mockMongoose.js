/**
 * Mongoose model mock factory.
 *
 * Each model is mocked via jest.mock() in the individual test files.
 * This helper provides a consistent set of jest.fn() stubs so we don't
 * have to repeat the structure everywhere.
 *
 * Usage in a test file:
 *   jest.mock('../../models/User');
 *   const User = require('../../models/User');
 *   User.findOne.mockResolvedValue(...);
 */

// No shared object is exported here — each test file mocks models individually.
// This file exists as a convention placeholder and for shared test utilities.

/**
 * Creates a minimal mock Mongoose document with save() and markModified().
 */
function makeMockDoc(fields = {}) {
  return {
    ...fields,
    save: jest.fn().mockResolvedValue(undefined),
    markModified: jest.fn(),
  };
}

module.exports = { makeMockDoc };
