# Sentry Setup Guide - Phase 8

## Installation Steps

### 1. Install Sentry Package

```bash
cd client
npm install --save @sentry/react
```

### 2. Configure Environment Variables

Add to `client/.env`:

```bash
# Sentry Configuration
REACT_APP_SENTRY_DSN=https://YOUR_PROJECT_KEY@o YOUR_ORG_ID.ingest.sentry.io/YOUR_PROJECT_ID
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_VERSION=2.0.0

# Optional: Enable in development
REACT_APP_SENTRY_DEV_ENABLED=false
REACT_APP_SENTRY_DEBUG=false
```

### 3. Get Your Sentry DSN

1. Create account at [sentry.io](https://sentry.io)
2. Create new project → Select "React"
3. Copy the DSN from project settings
4. Paste into `.env` file

### 4. Verify Integration

```bash
# Start the app
npm start

# Check console for: "✅ Sentry initialized"
```

### 5. Test Error Tracking

Trigger a test error to verify Sentry is capturing:

```javascript
// In browser console
throw new Error("Test Sentry integration");
```

Check Sentry dashboard for the error report.

## Features Implemented

### ✅ Error Boundaries Enhanced

- **AlimentationErrorBoundary** - For recipe/food components
- **FinancialErrorBoundary** - For finance components
- **AuthErrorBoundary** - For authentication
- All boundaries now report to Sentry automatically

### ✅ Sentry Configuration

Location: `client/src/config/sentry.js`

Features:
- Performance monitoring (10% sample rate in prod)
- Session replay (1% of sessions)
- React Router integration
- Breadcrumb tracking
- Sensitive data filtering
- Before-send hooks for privacy

### ✅ Integration Points

1. **Main App** (`client/src/index.js`)
   - Sentry initialized before React render
   - Early error capture

2. **Error Boundaries** (`client/src/components/common/ErrorBoundary.jsx`)
   - Automatic Sentry reporting
   - Component-level context
   - Error ID tagging

3. **Alimentation Components** (Usage required)
   - Wrap `AlimentationScreenNew` with `<AlimentationErrorBoundary>`
   - Wrap `ForecastVsRealityPanel` with `<AlimentationErrorBoundary>`

## Usage Examples

### Wrap Components with ErrorBoundary

```jsx
import { AlimentationErrorBoundary } from '../components/common/ErrorBoundary';

function AlimentationScreen() {
  return (
    <AlimentationErrorBoundary componentName="MainScreen">
      {/* Your component content */}
    </AlimentationErrorBoundary>
  );
}
```

### Manual Error Capture

```javascript
import { captureException, captureMessage, addBreadcrumb } from '../config/sentry';

// Capture exception
try {
  // risky operation
} catch (error) {
  captureException(error, {
    context: { userId, action: 'fetchRecipes' }
  });
}

// Capture message
captureMessage('User completed onboarding', 'info', { userId });

// Add breadcrumb
addBreadcrumb('Recipe search', 'navigation', { query: 'pasta' });
```

### Set User Context

```javascript
import { setUserContext, clearUserContext } from '../config/sentry';

// On login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username,
});

// On logout
clearUserContext();
```

## Privacy & Security

✅ **Automatic PII Filtering**:
- Authorization headers removed
- Passwords filtered from URLs
- Tokens redacted
- Sensitive fields masked

✅ **Session Replay Privacy**:
- All text masked by default
- Media (images/videos) blocked
- Only DOM structure captured

✅ **Development Mode**:
- Sentry disabled in dev by default
- Enable with `REACT_APP_SENTRY_DEV_ENABLED=true`

## Monitoring Targets (Phase 8)

| Metric | Target | Sentry Tracking |
|--------|--------|-----------------|
| Crash Rate | <0.5% | ✅ Automatic |
| Error Resolution Time | <24h | ✅ Alerts configured |
| Performance p95 | <1s | ✅ Transaction tracing |
| User-Reported Errors | 100% tracked | ✅ Error IDs provided |

## Troubleshooting

### Sentry not capturing errors

```bash
# Check initialization
console.log(window.Sentry); // Should be defined

# Check DSN
echo $REACT_APP_SENTRY_DSN
```

### Errors still appearing

- Verify DSN is correct
- Check before-send hook isn't filtering
- Ensure environment is not 'development' (unless enabled)

### Too many events

Adjust sample rates in `client/src/config/sentry.js`:

```javascript
tracesSampleRate: 0.05, // Lower from 0.1 to 5%
replaysSessionSampleRate: 0.005, // Lower to 0.5%
```

## Next Steps

After installation:

1. ✅ Install package: `npm install @sentry/react`
2. ✅ Configure `.env` with DSN
3. ✅ Restart development server
4. ✅ Verify initialization in console
5. ✅ Test with intentional error
6. ✅ Check Sentry dashboard
7. ✅ Wrap alimentation components with ErrorBoundaries
8. ✅ Configure alerts in Sentry UI

## Phase 8 Deliverables

✅ **Completed**:
- Sentry SDK integrated in index.js
- ErrorBoundary components enhanced with Sentry
- AlimentationErrorBoundary created
- Sentry config with privacy filters
- Documentation created

⏳ **Pending** (requires npm install):
- Package installation
- Environment variables setup
- Component wrapping in AlimentationScreenNew.jsx
- Component wrapping in ForecastVsRealityPanel.jsx

---

**Documentation Version**: Phase 8
**Last Updated**: 2025-10-25
**Author**: Pluqla Dev Team
