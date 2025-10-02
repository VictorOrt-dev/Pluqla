/**
 * Session Timeout Tests
 *
 * Tests session idle timeout logic to ensure sessions expire correctly
 * after inactivity period.
 *
 * Run: npm test -- tests/sessionTimeout.test.js
 */

const { trackSessionActivity, destroySession } = require('../src/middleware/sessionMiddleware');

describe('Session Idle Timeout', () => {
  let req, res, next;

  beforeEach(() => {
    // Mock request object
    req = {
      session: {
        userId: 'test-user-123',
        createdAt: Date.now() - 60000, // Created 1 minute ago
        lastActivity: Date.now() - 60000, // Last activity 1 minute ago
        destroy: jest.fn((callback) => callback()),
        save: jest.fn((callback) => callback())
      }
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      clearCookie: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should NOT timeout if session is active within idle period', () => {
    // Session active 1 minute ago, timeout is 30 minutes (default)
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '1800000'; // 30 minutes

    trackSessionActivity(req, res, next);

    // Should proceed normally (not timeout)
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Should update lastActivity
    expect(req.session.lastActivity).toBeGreaterThan(req.session.createdAt);

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should timeout if session idle exceeds timeout period', async () => {
    // Session inactive for 35 minutes, timeout is 30 minutes
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '1800000'; // 30 minutes

    req.session.lastActivity = Date.now() - (35 * 60 * 1000); // 35 minutes ago

    trackSessionActivity(req, res, next);

    // Wait for promise to resolve (destroySession is async)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should return 440 Login Timeout
    expect(res.status).toHaveBeenCalledWith(440);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Session expired due to inactivity',
        code: 'SESSION_IDLE_TIMEOUT',
        details: expect.objectContaining({
          message: 'Please log in again to continue'
        })
      })
    );

    // Should NOT call next (request terminated)
    expect(next).not.toHaveBeenCalled();

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should use createdAt if lastActivity is missing', () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '1800000'; // 30 minutes

    // Remove lastActivity
    delete req.session.lastActivity;
    req.session.createdAt = Date.now() - 60000; // 1 minute ago

    trackSessionActivity(req, res, next);

    // Should proceed normally (session is recent)
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should timeout exactly at idle timeout threshold', async () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    const idleTimeout = 1800000; // 30 minutes
    process.env.SESSION_IDLE_TIMEOUT = idleTimeout.toString();

    // Session inactive for exactly 30 minutes + 1ms
    req.session.lastActivity = Date.now() - (idleTimeout + 1);

    trackSessionActivity(req, res, next);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should timeout
    expect(res.status).toHaveBeenCalledWith(440);
    expect(next).not.toHaveBeenCalled();

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should NOT timeout just before threshold', () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    const idleTimeout = 1800000; // 30 minutes
    process.env.SESSION_IDLE_TIMEOUT = idleTimeout.toString();

    // Session inactive for exactly 30 minutes - 1ms
    req.session.lastActivity = Date.now() - (idleTimeout - 1);

    trackSessionActivity(req, res, next);

    // Should NOT timeout
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should handle custom idle timeout from env', async () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '300000'; // 5 minutes

    // Session inactive for 6 minutes
    req.session.lastActivity = Date.now() - (6 * 60 * 1000);

    trackSessionActivity(req, res, next);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should timeout with custom 5-minute limit
    expect(res.status).toHaveBeenCalledWith(440);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          maxIdleTime: 300 // 5 minutes in seconds
        })
      })
    );

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should update lastActivity on each request', () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '1800000';

    const initialLastActivity = req.session.lastActivity;

    // Simulate time passing
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000); // 5 seconds later

    trackSessionActivity(req, res, next);

    // lastActivity should be updated
    expect(req.session.lastActivity).toBeGreaterThan(initialLastActivity);

    Date.now.mockRestore();
    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });

  test('should not affect sessions without userId', () => {
    delete req.session.userId;

    trackSessionActivity(req, res, next);

    // Should proceed normally without checks
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should handle missing session gracefully', () => {
    req.session = null;

    trackSessionActivity(req, res, next);

    // Should proceed normally
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should include idle time details in timeout response', async () => {
    const originalEnv = process.env.SESSION_IDLE_TIMEOUT;
    process.env.SESSION_IDLE_TIMEOUT = '600000'; // 10 minutes

    // Session inactive for 15 minutes
    const idleMs = 15 * 60 * 1000;
    req.session.lastActivity = Date.now() - idleMs;

    trackSessionActivity(req, res, next);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          idleTime: expect.any(Number),
          maxIdleTime: 600 // 10 minutes in seconds
        })
      })
    );

    // Verify idle time is approximately correct (within 1 second)
    const call = res.json.mock.calls[0][0];
    expect(call.details.idleTime).toBeGreaterThanOrEqual(900 - 1); // 15 min - 1s
    expect(call.details.idleTime).toBeLessThanOrEqual(900 + 1); // 15 min + 1s

    process.env.SESSION_IDLE_TIMEOUT = originalEnv;
  });
});
