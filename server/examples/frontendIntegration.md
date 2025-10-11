---
# Frontend Integration Guide for Session and CSRF Protection

This guide shows how to integrate session and CSRF protection in your React frontend.

## 📋 Table of Contents

1. [Setup](#setup)
2. [Axios Configuration](#axios-configuration)
3. [Login/Logout](#login-logout)
4. [Protected API Calls](#protected-api-calls)
5. [React Hooks](#react-hooks)
6. [Error Handling](#error-handling)

---

## 🚀 Setup

### 1. Install Axios (if not already installed)

```bash
npm install axios
```

### 2. Create API Client

**File**: `src/services/api.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004';

/**
 * Axios instance with CSRF protection
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Send cookies with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get CSRF token from cookie
 * The server sets XSRF-TOKEN cookie that we can read
 */
function getCsrfToken() {
  const name = 'XSRF-TOKEN=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

/**
 * Request interceptor: Add CSRF token to all state-changing requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token for POST, PUT, DELETE, PATCH
    if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('⚠️ CSRF token not found. Request may fail.');
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle CSRF errors
      if (status === 403 && data.code?.startsWith('CSRF_')) {
        console.error('🚫 CSRF Protection triggered:', data.message);
        // Optionally: Refresh CSRF token and retry
        return refreshCsrfTokenAndRetry(error.config);
      }

      // Handle session errors
      if (status === 401 && data.code?.includes('SESSION')) {
        console.error('🔒 Session expired or invalid');
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Refresh CSRF token and retry failed request
 */
async function refreshCsrfTokenAndRetry(originalRequest) {
  try {
    // Fetch new CSRF token
    await apiClient.get('/api/csrf-token');

    // Retry original request with new token
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      originalRequest.headers['X-CSRF-Token'] = csrfToken;
      return apiClient.request(originalRequest);
    }
  } catch (refreshError) {
    console.error('Failed to refresh CSRF token:', refreshError);
    throw refreshError;
  }
}

export default apiClient;
export { getCsrfToken, API_BASE_URL };
```

---

## 🔐 Login/Logout

### Login Component

**File**: `src/components/Login.jsx`

```javascript
import React, { useState } from 'react';
import apiClient from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login request (CSRF token automatically added by interceptor)
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        // Store user data
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // New CSRF token is in the response
        console.log('✅ Login successful. New CSRF token received.');

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Login;
```

### Logout Component

**File**: `src/components/Logout.jsx`

```javascript
import React from 'react';
import apiClient from '../services/api';

function Logout() {
  const handleLogout = async () => {
    try {
      // Logout request (CSRF token automatically added)
      await apiClient.post('/api/auth/logout');

      // Clear user data
      localStorage.removeItem('user');

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if request fails
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      Logout
    </button>
  );
}

export default Logout;
```

---

## 🛡️ Protected API Calls

### Example: Create Transaction

```javascript
import apiClient from '../services/api';

async function createTransaction(transactionData) {
  try {
    // POST request - CSRF token automatically added by interceptor
    const response = await apiClient.post('/api/transactions', transactionData);

    return response.data;
  } catch (error) {
    console.error('Create transaction error:', error);
    throw error;
  }
}
```

### Example: Update User Profile

```javascript
import apiClient from '../services/api';

async function updateProfile(userId, profileData) {
  try {
    // PUT request - CSRF token automatically added
    const response = await apiClient.put(`/api/users/${userId}`, profileData);

    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}
```

### Example: Delete Account

```javascript
import apiClient from '../services/api';

async function deleteAccount(password) {
  try {
    // DELETE request - CSRF token automatically added
    const response = await apiClient.delete('/api/auth/account', {
      data: { password } // DELETE requests can have a body
    });

    return response.data;
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
}
```

---

## ⚛️ React Hooks

### useCsrfToken Hook

**File**: `src/hooks/useCsrfToken.js`

```javascript
import { useState, useEffect } from 'react';
import apiClient, { getCsrfToken } from '../services/api';

/**
 * Hook to manage CSRF token
 * Fetches token on mount and provides refresh function
 */
function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCsrfToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch CSRF token from server
      const response = await apiClient.get('/api/csrf-token');

      const token = response.data.csrfToken;
      setCsrfToken(token);

      console.log('✅ CSRF token fetched');
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  return {
    csrfToken,
    loading,
    error,
    refreshToken: fetchCsrfToken
  };
}

export default useCsrfToken;
```

### useSession Hook

**File**: `src/hooks/useSession.js`

```javascript
import { useState, useEffect } from 'react';
import apiClient from '../services/api';

/**
 * Hook to manage user session
 * Fetches current user and provides session info
 */
function useSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current user session
      const response = await apiClient.get('/api/auth/me');

      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Session fetch error:', err);

      if (err.response?.status === 401) {
        // No session - user not logged in
        setUser(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return {
    user,
    loading,
    error,
    refreshSession: fetchSession,
    isAuthenticated: !!user
  };
}

export default useSession;
```

### Usage Example

```javascript
import React from 'react';
import useSession from '../hooks/useSession';
import useCsrfToken from '../hooks/useCsrfToken';

function Dashboard() {
  const { user, loading: sessionLoading, isAuthenticated } = useSession();
  const { csrfToken, loading: csrfLoading } = useCsrfToken();

  if (sessionLoading || csrfLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name}!</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>Premium: {user.isPremium ? 'Yes' : 'No'}</p>

      {/* CSRF token is automatically managed */}
      <p>🛡️ Protected by session and CSRF</p>
    </div>
  );
}

export default Dashboard;
```

---

## ⚠️ Error Handling

### Global Error Handler

**File**: `src/utils/errorHandler.js`

```javascript
/**
 * Handle API errors globally
 */
export function handleApiError(error) {
  if (!error.response) {
    // Network error
    return {
      message: 'Network error. Please check your connection.',
      type: 'network'
    };
  }

  const { status, data } = error.response;

  switch (status) {
    case 401:
      // Unauthorized - redirect to login
      if (data.code?.includes('SESSION')) {
        localStorage.removeItem('user');
        window.location.href = '/login';
        return {
          message: 'Session expired. Please log in again.',
          type: 'session'
        };
      }
      return {
        message: 'Authentication required.',
        type: 'auth'
      };

    case 403:
      // Forbidden - likely CSRF or permissions
      if (data.code?.startsWith('CSRF_')) {
        return {
          message: 'Security token expired. Please refresh the page.',
          type: 'csrf'
        };
      }
      return {
        message: 'You do not have permission to perform this action.',
        type: 'permission'
      };

    case 429:
      // Rate limit
      return {
        message: 'Too many requests. Please try again later.',
        type: 'ratelimit'
      };

    default:
      return {
        message: data.error || 'An error occurred. Please try again.',
        type: 'general'
      };
  }
}
```

### React Error Boundary

**File**: `src/components/ErrorBoundary.jsx`

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## ✅ Checklist

Before deploying, ensure:

- [ ] `withCredentials: true` set in Axios config
- [ ] CSRF token automatically added to POST/PUT/DELETE/PATCH requests
- [ ] Session errors redirect to login page
- [ ] CSRF errors show user-friendly messages
- [ ] Login rotates session and refreshes CSRF token
- [ ] Logout destroys session completely
- [ ] All state-changing operations use CSRF-protected endpoints
- [ ] Error boundary catches unexpected errors

---

## 🔗 Additional Resources

- [Axios Documentation](https://axios-http.com/)
- [CSRF Protection Best Practices](https://owasp.org/www-community/attacks/csrf)
- [Session Management Guide](https://owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet)

---

**Happy coding! 🚀**
