/**
 * Enhanced API Adapter for Pluqla
 * Handles authentication, error categorization, and race condition prevention
 * Version: 2.0.0 - Phase 1 Critical Fixes
 */

import secureLogger, { apiLogger } from "../../utils/secureLogger";
import { frontendPerformanceMonitor } from "../../utils/performanceMonitor";
import { cacheService } from "../cacheService";
import { retryManager } from "../../utils/retryUtils";

// Error categories for proper handling
export const ERROR_CATEGORIES = {
  AUTHENTICATION: "AUTHENTICATION",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER_ERROR: "SERVER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNKNOWN: "UNKNOWN",
};

// Enhanced error class with categorization
export class ApiError extends Error {
  constructor(message, category, status, originalError = null) {
    super(message);
    this.name = "ApiError";
    this.category = category;
    this.status = status;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Enhanced API Adapter Class
 * Prevents race conditions and provides centralized error handling
 */
class ApiAdapter {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || "/api";
    this.authContext = null;
    this.refreshPromise = null; // Prevent multiple simultaneous refresh attempts
    this.pendingRequests = new Map(); // Track pending requests to prevent duplicates

    secureLogger.info("ApiAdapter initialized", {
      baseURL: this.baseURL,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Initialize with auth context
   */
  init(authContext) {
    this.authContext = authContext;
    secureLogger.info("ApiAdapter connected to AuthContext");
  }

  /**
   * Categorize error based on status and response
   */
  categorizeError(status, response, error) {
    // Network errors
    if (
      !status ||
      error?.name === "TypeError" ||
      error?.message?.includes("Failed to fetch")
    ) {
      return ERROR_CATEGORIES.NETWORK_ERROR;
    }

    // Status-based categorization
    switch (status) {
      case 401:
      case 403:
        return ERROR_CATEGORIES.AUTHENTICATION;
      case 429:
        return ERROR_CATEGORIES.RATE_LIMIT;
      case 404:
        return ERROR_CATEGORIES.NOT_FOUND;
      case 422:
      case 400:
        return ERROR_CATEGORIES.VALIDATION_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return ERROR_CATEGORIES.SERVER_ERROR;
      default:
        return ERROR_CATEGORIES.UNKNOWN;
    }
  }

  /**
   * Get user-friendly error message based on category
   */
  getUserMessage(category, originalMessage) {
    switch (category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return "Votre session a expiré. Veuillez vous reconnecter.";
      case ERROR_CATEGORIES.RATE_LIMIT:
        return "Trop de requêtes. Veuillez patienter quelques instants.";
      case ERROR_CATEGORIES.NETWORK_ERROR:
        return "Problème de connexion. Vérifiez votre connexion internet.";
      case ERROR_CATEGORIES.SERVER_ERROR:
        return "Erreur du serveur. Nous travaillons sur le problème.";
      case ERROR_CATEGORIES.VALIDATION_ERROR:
        return (
          originalMessage || "Données invalides. Vérifiez vos informations."
        );
      case ERROR_CATEGORIES.NOT_FOUND:
        return "Ressource introuvable.";
      default:
        return originalMessage || "Une erreur inattendue s'est produite.";
    }
  }

  /**
   * Handle token refresh with race condition prevention
   */
  async handleTokenRefresh() {
    if (!this.authContext?.refreshAuthToken) {
      throw new ApiError(
        "Auth context not available",
        ERROR_CATEGORIES.AUTHENTICATION,
        401,
      );
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      secureLogger.debug("Token refresh already in progress, waiting...");
      return await this.refreshPromise;
    }

    this.refreshPromise = this.authContext.refreshAuthToken();

    try {
      const result = await this.refreshPromise;
      secureLogger.info("Token refresh completed successfully");
      return result;
    } catch (error) {
      secureLogger.error("Token refresh failed", error);
      throw new ApiError(
        "Session expired",
        ERROR_CATEGORIES.AUTHENTICATION,
        401,
        error,
      );
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Make HTTP request with automatic retry and error handling
   */
  async makeRequest(endpoint, options = {}, retryOnAuth = true) {
    const requestKey = `${options.method || "GET"}:${endpoint}`;
    const url = `${this.baseURL}${endpoint}`;

    // Prevent duplicate requests
    if (this.pendingRequests.has(requestKey)) {
      secureLogger.debug("Request already pending, returning existing promise");
      return await this.pendingRequests.get(requestKey);
    }

    // Define retry configuration based on request type
    const retryConfig = {
      operationId: requestKey,
      maxRetries: this.getRetryConfig(endpoint, options.method),
      retryableErrors: ["NETWORK_ERROR", "SERVER_ERROR", "RATE_LIMIT"],
      nonRetryableErrors: ["AUTHENTICATION", "VALIDATION_ERROR", "NOT_FOUND"],
    };

    const requestPromise = retryManager.withRetry(
      () => this._executeRequest(url, options, retryOnAuth),
      retryConfig,
    );

    this.pendingRequests.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Get retry configuration based on endpoint and method
   */
  getRetryConfig(endpoint, method = "GET") {
    // More retries for critical read operations
    if (method === "GET") {
      if (endpoint.includes("/financial/") || endpoint.includes("/strikes/")) {
        return 3; // Critical data
      }
      return 2; // Standard read operations
    }

    // Fewer retries for mutations to avoid duplicate operations
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      if (
        endpoint.includes("/transactions") ||
        endpoint.includes("/financial/")
      ) {
        return 1; // Critical mutations - be conservative
      }
      return 2; // Standard mutations
    }

    return 2; // Default
  }

  /**
   * Execute HTTP request with enhanced error handling
   * @param {string} url - Complete URL for the request
   * @param {Object} options - Request options (method, headers, body, etc.)
   * @param {boolean} retryOnAuth - Whether to retry on auth errors
   * @returns {Promise<Object>} Response data
   */
  async _executeRequest(url, options, retryOnAuth) {
    const startTime = Date.now();
    const method = options.method || "GET";

    // Extract endpoint from URL for consistent logging and monitoring
    const endpoint = url.replace(this.baseURL, "") || "/";

    try {
      // Get current authentication token
      const token =
        this.authContext?.tokens?.accessToken || localStorage.getItem("token");

      // Prepare request configuration with security headers
      const config = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest", // CSRF protection
          ...options.headers,
        },
        ...options,
      };

      // Add authentication header if token exists
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log outgoing request (exclude sensitive data)
      apiLogger.request(method, endpoint, options.body);

      // Execute the HTTP request
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;

      // Handle authentication errors with automatic token refresh
      if (response.status === 401 && retryOnAuth && token) {
        secureLogger.debug(
          "Authentication error detected, attempting token refresh",
          {
            endpoint,
            method,
            hasToken: !!token,
          },
        );

        try {
          // Attempt to refresh the authentication token
          await this.handleTokenRefresh();

          // Retry the request with the new token
          const newToken =
            this.authContext?.tokens?.accessToken ||
            localStorage.getItem("token");

          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            secureLogger.debug("Retrying request with refreshed token", {
              endpoint,
            });

            const retryResponse = await fetch(url, config);
            const retryDuration = Date.now() - startTime;

            return await this._processResponse(
              retryResponse,
              method,
              url,
              retryDuration,
            );
          } else {
            throw new ApiError(
              "Failed to obtain new token after refresh",
              ERROR_CATEGORIES.AUTHENTICATION,
              401,
            );
          }
        } catch (refreshError) {
          // If token refresh fails, logout the user
          secureLogger.error("Token refresh failed, logging out user", {
            endpoint,
            error: refreshError.message,
          });

          if (this.authContext?.logout) {
            await this.authContext.logout();
          }
          throw refreshError;
        }
      }

      // Process successful response
      return await this._processResponse(response, method, url, duration);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error details (sanitized for security)
      apiLogger.error(method, endpoint, {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      // Track API performance metrics for monitoring
      frontendPerformanceMonitor.trackApiCall(
        endpoint,
        method,
        duration,
        false, // success = false for errors
        error.status || 0,
      );

      // Categorize the error for appropriate handling
      const category = this.categorizeError(error.status, null, error);
      const userMessage = this.getUserMessage(category, error.message);

      // Log performance metrics
      secureLogger.performance(`${method} ${endpoint}`, duration, {
        success: false,
        category,
        status: error.status || 0,
      });

      // Throw enhanced error with context
      throw new ApiError(userMessage, category, error.status || null, {
        originalError: error,
        endpoint,
        method,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Process HTTP response with new universal format support
   */
  async _processResponse(response, method, url, duration) {
    try {
      const data = await response.json();

      // Log response
      apiLogger.response(
        method,
        url.replace(this.baseURL, ""),
        response.status,
        data,
      );
      secureLogger.performance(`${method} ${url}`, duration);

      // Track API performance
      frontendPerformanceMonitor.trackApiCall(
        url.replace(this.baseURL, ""),
        method,
        duration,
        response.ok,
        response.status,
      );

      if (!response.ok) {
        const category = this.categorizeError(response.status, data);
        const userMessage = this.getUserMessage(
          category,
          data.message || data.error,
        );

        throw new ApiError(userMessage, category, response.status, {
          response: data,
        });
      }

      // Handle new universal format (v2.0.0+) vs legacy format
      if (data.meta && data.meta.apiVersion === "2.0.0") {
        // New universal format
        return {
          success: data.success,
          data: data.data,
          message: data.message,
          meta: {
            ...data.meta,
            frontendDuration: duration,
            status: response.status,
          },
          errors: data.errors || [],
        };
      } else {
        // Legacy format support (backwards compatibility)
        return {
          success: data.success !== false,
          data: data.data || data,
          message: data.message,
          meta: {
            status: response.status,
            timestamp: data.timestamp || new Date().toISOString(),
            frontendDuration: duration,
            apiVersion: "legacy",
          },
          errors: [],
        };
      }
    } catch (jsonError) {
      if (jsonError instanceof ApiError) {
        throw jsonError;
      }

      // Handle non-JSON responses
      const textResponse = await response.text();
      const category = this.categorizeError(response.status);
      const userMessage = this.getUserMessage(category, textResponse);

      throw new ApiError(userMessage, category, response.status, {
        textResponse,
      });
    }
  }

  /**
   * GET request with caching
   */
  async get(endpoint, params = {}, options = {}) {
    const { useCache = true, forceFresh = false } = options;

    // Check cache first (only for GET requests)
    if (useCache && !forceFresh) {
      const cachedResponse = cacheService.get(endpoint, params);
      if (cachedResponse) {
        // If stale data, trigger background refresh
        if (cachedResponse._isStale) {
          // Background refresh without waiting
          this._backgroundRefresh(endpoint, params).catch((error) => {
            console.warn("Background refresh failed:", error);
          });
        }
        return cachedResponse;
      }
    }

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    const response = await this.makeRequest(url, { method: "GET" });

    // Cache successful GET responses
    if (useCache && response.success) {
      cacheService.set(endpoint, params, response);
    }

    return response;
  }

  /**
   * Background refresh for stale cached data
   */
  async _backgroundRefresh(endpoint, params) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      const response = await this.makeRequest(url, { method: "GET" });

      if (response.success) {
        cacheService.set(endpoint, params, response);
        cacheService.metrics.refreshes++;
        console.debug("Background refresh completed for:", endpoint);
      }
    } catch (error) {
      console.warn("Background refresh failed for:", endpoint, error);
    }
  }

  /**
   * POST request with cache invalidation
   */
  async post(endpoint, data = {}) {
    const response = await this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Invalidate related cache entries after successful mutations
    if (response.success) {
      this._invalidateRelatedCache(endpoint);
    }

    return response;
  }

  /**
   * PUT request with cache invalidation
   */
  async put(endpoint, data = {}) {
    const response = await this.makeRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    // Invalidate related cache entries after successful mutations
    if (response.success) {
      this._invalidateRelatedCache(endpoint);
    }

    return response;
  }

  /**
   * DELETE request with cache invalidation
   */
  async delete(endpoint) {
    const response = await this.makeRequest(endpoint, { method: "DELETE" });

    // Invalidate related cache entries after successful mutations
    if (response.success) {
      this._invalidateRelatedCache(endpoint);
    }

    return response;
  }

  /**
   * Invalidate cache entries related to a mutation endpoint
   */
  _invalidateRelatedCache(endpoint) {
    // Define cache invalidation rules
    const invalidationRules = {
      "/transactions": ["/financial/", "/analytics/", "/strikes/"],
      "/users/": ["/users/", "/financial/", "/analytics/"],
      "/financial/": ["/financial/", "/analytics/", "/strikes/"],
      "/ai/": ["/ai/"],
      "/categories": ["/categories"],
      "/strikes/": ["/strikes/"],
      "/analytics/": ["/analytics/"],
    };

    // Find matching rules and invalidate cache
    for (const [pattern, invalidatePatterns] of Object.entries(
      invalidationRules,
    )) {
      if (endpoint.includes(pattern)) {
        invalidatePatterns.forEach((invalidatePattern) => {
          const count = cacheService.invalidate(invalidatePattern);
          if (count > 0) {
            console.debug(
              `Cache invalidated ${count} entries for pattern: ${invalidatePattern} (triggered by ${endpoint})`,
            );
          }
        });
        break;
      }
    }
  }

  /**
   * Clear pending requests (useful for component cleanup)
   */
  clearPendingRequests() {
    this.pendingRequests.clear();
    secureLogger.debug("Cleared all pending requests");
  }

  /**
   * Get comprehensive API statistics
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      isRefreshing: !!this.refreshPromise,
      cache: cacheService.getStats(),
      retry: retryManager.getMetrics(),
      performance: frontendPerformanceMonitor.getMetricsSummary(),
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      authContext: !!this.authContext,
      pendingRequests: Array.from(this.pendingRequests.keys()),
      cacheEntries: cacheService.getEntriesSummary(),
      retryMetrics: retryManager.getMetrics(),
      circuitBreakers: retryManager.circuitBreakers,
    };
  }

  /**
   * Force refresh cached data for specific endpoint
   */
  async refreshCache(endpoint, params = {}) {
    cacheService.clearEndpoint(endpoint);
    return this.get(endpoint, params, { forceFresh: true });
  }

  /**
   * Preload frequently used endpoints
   */
  async preloadCache() {
    const commonEndpoints = [
      { endpoint: "/users/me" },
      { endpoint: "/financial/summary" },
      { endpoint: "/strikes/current" },
      { endpoint: "/categories" },
    ];

    await cacheService.preload(commonEndpoints, (endpoint, params) =>
      this.get(endpoint, params, { useCache: false }),
    );
  }
}

// Create singleton instance
export const apiAdapter = new ApiAdapter();

export default apiAdapter;
