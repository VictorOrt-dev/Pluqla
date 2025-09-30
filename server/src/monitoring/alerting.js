/**
 * Automatic Security Alerting System
 *
 * Monitors security metrics and triggers alerts when thresholds are exceeded
 */

const logger = require('../utils/logger');
const { metrics } = require('./metrics');

/**
 * Alert configuration with thresholds
 */
const ALERT_CONFIG = {
  // Failed login threshold: 10 attempts in 5 minutes
  failedLoginThreshold: {
    count: 10,
    windowMs: 5 * 60 * 1000,
    enabled: process.env.ALERT_FAILED_LOGIN_ENABLED !== 'false',
  },

  // Account lockout threshold: 5 lockouts in 10 minutes
  accountLockoutThreshold: {
    count: 5,
    windowMs: 10 * 60 * 1000,
    enabled: process.env.ALERT_LOCKOUT_ENABLED !== 'false',
  },

  // Session cleanup failure threshold: 3 failures in 15 minutes
  sessionCleanupFailureThreshold: {
    count: 3,
    windowMs: 15 * 60 * 1000,
    enabled: process.env.ALERT_SESSION_CLEANUP_ENABLED !== 'false',
  },

  // API error threshold: 50 errors in 5 minutes
  apiErrorThreshold: {
    count: 50,
    windowMs: 5 * 60 * 1000,
    enabled: process.env.ALERT_API_ERROR_ENABLED !== 'false',
  },

  // JWT validation failure threshold: 20 failures in 5 minutes
  jwtFailureThreshold: {
    count: 20,
    windowMs: 5 * 60 * 1000,
    enabled: process.env.ALERT_JWT_FAILURE_ENABLED !== 'false',
  },

  // Suspicious activity threshold: 5 events in 5 minutes
  suspiciousActivityThreshold: {
    count: 5,
    windowMs: 5 * 60 * 1000,
    enabled: process.env.ALERT_SUSPICIOUS_ACTIVITY_ENABLED !== 'false',
  },
};

/**
 * Alert state tracking (in-memory for simplicity, use Redis for production)
 */
const alertState = {
  failedLogins: new Map(), // IP -> [timestamps]
  accountLockouts: [],
  sessionCleanupFailures: [],
  apiErrors: [],
  jwtFailures: [],
  suspiciousActivity: [],
  lastAlertSent: new Map(), // alertType -> timestamp (prevents spam)
};

/**
 * Minimum time between duplicate alerts (1 hour)
 */
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Check if an alert should be sent (considering cooldown)
 */
function shouldSendAlert(alertType) {
  const lastSent = alertState.lastAlertSent.get(alertType);
  if (!lastSent) return true;

  const elapsed = Date.now() - lastSent;
  return elapsed >= ALERT_COOLDOWN_MS;
}

/**
 * Record that an alert was sent
 */
function markAlertSent(alertType) {
  alertState.lastAlertSent.set(alertType, Date.now());
}

/**
 * Clean old entries from a timestamp array
 */
function cleanOldEntries(array, windowMs) {
  const cutoff = Date.now() - windowMs;
  return array.filter(timestamp => timestamp > cutoff);
}

/**
 * Record a failed login attempt for alerting
 */
function recordFailedLogin(ip) {
  if (!ALERT_CONFIG.failedLoginThreshold.enabled) return;

  // Initialize array for this IP if not exists
  if (!alertState.failedLogins.has(ip)) {
    alertState.failedLogins.set(ip, []);
  }

  const attempts = alertState.failedLogins.get(ip);
  attempts.push(Date.now());

  // Clean old entries
  const recentAttempts = cleanOldEntries(
    attempts,
    ALERT_CONFIG.failedLoginThreshold.windowMs
  );
  alertState.failedLogins.set(ip, recentAttempts);

  // Check threshold
  if (recentAttempts.length >= ALERT_CONFIG.failedLoginThreshold.count) {
    const alertKey = `failed_login_${ip}`;
    if (shouldSendAlert(alertKey)) {
      sendAlert({
        type: 'failed_login_threshold',
        severity: 'high',
        title: 'Repeated Failed Login Attempts',
        message: `${recentAttempts.length} failed login attempts from IP ${ip} in the last ${ALERT_CONFIG.failedLoginThreshold.windowMs / 60000} minutes`,
        details: {
          ip,
          attemptCount: recentAttempts.length,
          timeWindowMinutes: ALERT_CONFIG.failedLoginThreshold.windowMs / 60000,
          firstAttempt: new Date(recentAttempts[0]).toISOString(),
          lastAttempt: new Date(recentAttempts[recentAttempts.length - 1]).toISOString(),
        },
      });
      markAlertSent(alertKey);
    }
  }
}

/**
 * Record an account lockout for alerting
 */
function recordAccountLockout(userId) {
  if (!ALERT_CONFIG.accountLockoutThreshold.enabled) return;

  alertState.accountLockouts.push(Date.now());
  alertState.accountLockouts = cleanOldEntries(
    alertState.accountLockouts,
    ALERT_CONFIG.accountLockoutThreshold.windowMs
  );

  if (alertState.accountLockouts.length >= ALERT_CONFIG.accountLockoutThreshold.count) {
    if (shouldSendAlert('account_lockouts')) {
      sendAlert({
        type: 'account_lockout_threshold',
        severity: 'high',
        title: 'Multiple Account Lockouts Detected',
        message: `${alertState.accountLockouts.length} account lockouts in the last ${ALERT_CONFIG.accountLockoutThreshold.windowMs / 60000} minutes`,
        details: {
          lockoutCount: alertState.accountLockouts.length,
          timeWindowMinutes: ALERT_CONFIG.accountLockoutThreshold.windowMs / 60000,
          latestUserId: userId,
        },
      });
      markAlertSent('account_lockouts');
    }
  }
}

/**
 * Record a session cleanup failure for alerting
 */
function recordSessionCleanupFailure(error) {
  if (!ALERT_CONFIG.sessionCleanupFailureThreshold.enabled) return;

  alertState.sessionCleanupFailures.push(Date.now());
  alertState.sessionCleanupFailures = cleanOldEntries(
    alertState.sessionCleanupFailures,
    ALERT_CONFIG.sessionCleanupFailureThreshold.windowMs
  );

  if (alertState.sessionCleanupFailures.length >= ALERT_CONFIG.sessionCleanupFailureThreshold.count) {
    if (shouldSendAlert('session_cleanup_failures')) {
      sendAlert({
        type: 'session_cleanup_failure',
        severity: 'critical',
        title: 'Session Cleanup Failures',
        message: `${alertState.sessionCleanupFailures.length} session cleanup failures in the last ${ALERT_CONFIG.sessionCleanupFailureThreshold.windowMs / 60000} minutes`,
        details: {
          failureCount: alertState.sessionCleanupFailures.length,
          timeWindowMinutes: ALERT_CONFIG.sessionCleanupFailureThreshold.windowMs / 60000,
          lastError: error ? error.message : 'Unknown',
        },
      });
      markAlertSent('session_cleanup_failures');
    }
  }
}

/**
 * Record an API error for alerting
 */
function recordApiError(route, errorType) {
  if (!ALERT_CONFIG.apiErrorThreshold.enabled) return;

  alertState.apiErrors.push(Date.now());
  alertState.apiErrors = cleanOldEntries(
    alertState.apiErrors,
    ALERT_CONFIG.apiErrorThreshold.windowMs
  );

  if (alertState.apiErrors.length >= ALERT_CONFIG.apiErrorThreshold.count) {
    if (shouldSendAlert('api_errors')) {
      sendAlert({
        type: 'api_error_threshold',
        severity: 'high',
        title: 'High API Error Rate',
        message: `${alertState.apiErrors.length} API errors in the last ${ALERT_CONFIG.apiErrorThreshold.windowMs / 60000} minutes`,
        details: {
          errorCount: alertState.apiErrors.length,
          timeWindowMinutes: ALERT_CONFIG.apiErrorThreshold.windowMs / 60000,
          latestRoute: route,
          latestErrorType: errorType,
        },
      });
      markAlertSent('api_errors');
    }
  }
}

/**
 * Record a JWT validation failure for alerting
 */
function recordJwtFailure(reason) {
  if (!ALERT_CONFIG.jwtFailureThreshold.enabled) return;

  alertState.jwtFailures.push(Date.now());
  alertState.jwtFailures = cleanOldEntries(
    alertState.jwtFailures,
    ALERT_CONFIG.jwtFailureThreshold.windowMs
  );

  if (alertState.jwtFailures.length >= ALERT_CONFIG.jwtFailureThreshold.count) {
    if (shouldSendAlert('jwt_failures')) {
      sendAlert({
        type: 'jwt_failure_threshold',
        severity: 'high',
        title: 'High JWT Validation Failure Rate',
        message: `${alertState.jwtFailures.length} JWT validation failures in the last ${ALERT_CONFIG.jwtFailureThreshold.windowMs / 60000} minutes`,
        details: {
          failureCount: alertState.jwtFailures.length,
          timeWindowMinutes: ALERT_CONFIG.jwtFailureThreshold.windowMs / 60000,
          latestReason: reason,
        },
      });
      markAlertSent('jwt_failures');
    }
  }
}

/**
 * Record suspicious activity for alerting
 */
function recordSuspiciousActivityAlert(type, details = {}) {
  if (!ALERT_CONFIG.suspiciousActivityThreshold.enabled) return;

  alertState.suspiciousActivity.push(Date.now());
  alertState.suspiciousActivity = cleanOldEntries(
    alertState.suspiciousActivity,
    ALERT_CONFIG.suspiciousActivityThreshold.windowMs
  );

  if (alertState.suspiciousActivity.length >= ALERT_CONFIG.suspiciousActivityThreshold.count) {
    if (shouldSendAlert('suspicious_activity')) {
      sendAlert({
        type: 'suspicious_activity_threshold',
        severity: 'critical',
        title: 'Suspicious Security Activity Detected',
        message: `${alertState.suspiciousActivity.length} suspicious events in the last ${ALERT_CONFIG.suspiciousActivityThreshold.windowMs / 60000} minutes`,
        details: {
          eventCount: alertState.suspiciousActivity.length,
          timeWindowMinutes: ALERT_CONFIG.suspiciousActivityThreshold.windowMs / 60000,
          latestType: type,
          ...details,
        },
      });
      markAlertSent('suspicious_activity');
    }
  }
}

/**
 * Send alert notification
 * This is a pluggable function - integrate with your alerting system
 * (e.g., Slack, PagerDuty, email, Sentry, etc.)
 */
async function sendAlert(alert) {
  const timestamp = new Date().toISOString();

  // Log alert to application logs
  logger.error('SECURITY ALERT', {
    timestamp,
    ...alert,
  });

  // TODO: Integrate with external alerting systems
  // Examples:

  // 1. Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *${alert.title}*`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 ${alert.title}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Type:*\n${alert.type}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Severity:*\n${alert.severity}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Message:*\n${alert.message}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Details:*\n\`\`\`${JSON.stringify(alert.details, null, 2)}\`\`\``,
              },
            },
          ],
        }),
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error: error.message });
    }
  }

  // 2. PagerDuty integration
  if (process.env.PAGERDUTY_INTEGRATION_KEY && alert.severity === 'critical') {
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
          event_action: 'trigger',
          payload: {
            summary: alert.title,
            severity: alert.severity,
            source: 'pluqla-api',
            custom_details: alert.details,
          },
        }),
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error: error.message });
    }
  }

  // 3. Email notification (using existing email service)
  if (process.env.SECURITY_ALERT_EMAIL) {
    try {
      const emailService = require('../services/emailService');
      await emailService.sendEmail({
        to: process.env.SECURITY_ALERT_EMAIL,
        subject: `🚨 Security Alert: ${alert.title}`,
        html: `
          <h2>Security Alert: ${alert.title}</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Time:</strong> ${timestamp}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <h3>Details:</h3>
          <pre>${JSON.stringify(alert.details, null, 2)}</pre>
        `,
      });
    } catch (error) {
      logger.error('Failed to send email alert', { error: error.message });
    }
  }

  // 4. Sentry event
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureMessage(alert.title, {
        level: alert.severity === 'critical' ? 'error' : 'warning',
        contexts: {
          alert: {
            type: alert.type,
            message: alert.message,
            details: alert.details,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to send Sentry alert', { error: error.message });
    }
  }
}

/**
 * Initialize alerting system
 */
function initializeAlerting() {
  logger.info('Security alerting system initialized', {
    config: {
      failedLoginThreshold: ALERT_CONFIG.failedLoginThreshold.enabled,
      accountLockoutThreshold: ALERT_CONFIG.accountLockoutThreshold.enabled,
      sessionCleanupFailureThreshold: ALERT_CONFIG.sessionCleanupFailureThreshold.enabled,
      apiErrorThreshold: ALERT_CONFIG.apiErrorThreshold.enabled,
      jwtFailureThreshold: ALERT_CONFIG.jwtFailureThreshold.enabled,
      suspiciousActivityThreshold: ALERT_CONFIG.suspiciousActivityThreshold.enabled,
    },
  });

  // Cleanup old state periodically (every 10 minutes)
  setInterval(() => {
    logger.debug('Cleaning up alert state');

    // Clean failed logins
    for (const [ip, attempts] of alertState.failedLogins.entries()) {
      const cleaned = cleanOldEntries(attempts, ALERT_CONFIG.failedLoginThreshold.windowMs);
      if (cleaned.length === 0) {
        alertState.failedLogins.delete(ip);
      } else {
        alertState.failedLogins.set(ip, cleaned);
      }
    }

    // Clean other arrays
    alertState.accountLockouts = cleanOldEntries(
      alertState.accountLockouts,
      ALERT_CONFIG.accountLockoutThreshold.windowMs
    );
    alertState.sessionCleanupFailures = cleanOldEntries(
      alertState.sessionCleanupFailures,
      ALERT_CONFIG.sessionCleanupFailureThreshold.windowMs
    );
    alertState.apiErrors = cleanOldEntries(
      alertState.apiErrors,
      ALERT_CONFIG.apiErrorThreshold.windowMs
    );
    alertState.jwtFailures = cleanOldEntries(
      alertState.jwtFailures,
      ALERT_CONFIG.jwtFailureThreshold.windowMs
    );
    alertState.suspiciousActivity = cleanOldEntries(
      alertState.suspiciousActivity,
      ALERT_CONFIG.suspiciousActivityThreshold.windowMs
    );
  }, 10 * 60 * 1000);
}

module.exports = {
  initializeAlerting,
  recordFailedLogin,
  recordAccountLockout,
  recordSessionCleanupFailure,
  recordApiError,
  recordJwtFailure,
  recordSuspiciousActivityAlert,
  sendAlert, // Export for manual testing
  ALERT_CONFIG, // Export for configuration inspection
};
