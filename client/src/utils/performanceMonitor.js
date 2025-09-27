/**
 * Frontend Performance Monitoring Utility
 *
 * Provides comprehensive performance tracking for:
 * - Component render times
 * - API call performance
 * - User interaction metrics
 * - Page load performance
 */

class FrontendPerformanceMonitor {
  constructor() {
    this.metrics = {
      components: new Map(), // component -> { renderCount, totalTime, averageTime }
      apiCalls: new Map(), // endpoint -> { callCount, totalTime, averageTime, errors }
      pageLoads: new Map(), // page -> { loadCount, totalTime, averageTime }
      userInteractions: new Map(), // interaction -> { count, totalTime }

      // Thresholds
      slowComponentThreshold: 100, // 100ms
      slowApiThreshold: 2000, // 2 seconds
      slowPageLoadThreshold: 3000, // 3 seconds
    };

    this.isEnabled = process.env.NODE_ENV === 'development' ||
                     localStorage.getItem('enablePerformanceMonitoring') === 'true';
  }

  /**
   * Track component render performance (for React Profiler)
   */
  trackComponentRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
    if (!this.isEnabled) return;

    const componentKey = `${id}-${phase}`;

    if (!this.metrics.components.has(componentKey)) {
      this.metrics.components.set(componentKey, {
        renderCount: 0,
        totalTime: 0,
        averageTime: 0,
        lastRender: null,
        slowRenders: 0
      });
    }

    const metric = this.metrics.components.get(componentKey);
    metric.renderCount += 1;
    metric.totalTime += actualDuration;
    metric.averageTime = metric.totalTime / metric.renderCount;
    metric.lastRender = new Date().toISOString();

    // Track slow renders
    if (actualDuration > this.metrics.slowComponentThreshold) {
      metric.slowRenders += 1;
      console.warn(`🐌 Slow component render detected: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`, {
        component: id,
        phase,
        actualDuration: actualDuration.toFixed(2),
        baseDuration: baseDuration.toFixed(2),
        threshold: this.metrics.slowComponentThreshold
      });
    }

    // Log performance summary every 50 renders for high-usage components
    if (metric.renderCount % 50 === 0) {
      console.info(`📊 Component Performance Summary: ${componentKey}`, {
        averageTime: metric.averageTime.toFixed(2),
        totalRenders: metric.renderCount,
        slowRenders: metric.slowRenders,
        slowRenderPercentage: ((metric.slowRenders / metric.renderCount) * 100).toFixed(1)
      });
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint, method, duration, success, statusCode) {
    if (!this.isEnabled) return;

    const apiKey = `${method} ${endpoint}`;

    if (!this.metrics.apiCalls.has(apiKey)) {
      this.metrics.apiCalls.set(apiKey, {
        callCount: 0,
        totalTime: 0,
        averageTime: 0,
        successCount: 0,
        errorCount: 0,
        lastCall: null,
        slowCalls: 0,
        statusCodes: {}
      });
    }

    const metric = this.metrics.apiCalls.get(apiKey);
    metric.callCount += 1;
    metric.totalTime += duration;
    metric.averageTime = metric.totalTime / metric.callCount;
    metric.lastCall = new Date().toISOString();
    metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

    if (success) {
      metric.successCount += 1;
    } else {
      metric.errorCount += 1;
    }

    // Track slow API calls
    if (duration > this.metrics.slowApiThreshold) {
      metric.slowCalls += 1;
      console.warn(`🐌 Slow API call detected: ${apiKey} took ${duration}ms`, {
        endpoint: apiKey,
        duration,
        statusCode,
        success,
        threshold: this.metrics.slowApiThreshold
      });
    }

    // Log API performance summary
    if (metric.callCount % 25 === 0) {
      console.info(`🌐 API Performance Summary: ${apiKey}`, {
        averageTime: Math.round(metric.averageTime),
        totalCalls: metric.callCount,
        successRate: ((metric.successCount / metric.callCount) * 100).toFixed(1),
        slowCalls: metric.slowCalls,
        slowCallPercentage: ((metric.slowCalls / metric.callCount) * 100).toFixed(1)
      });
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad(pageName, loadTime) {
    if (!this.isEnabled) return;

    if (!this.metrics.pageLoads.has(pageName)) {
      this.metrics.pageLoads.set(pageName, {
        loadCount: 0,
        totalTime: 0,
        averageTime: 0,
        lastLoad: null,
        slowLoads: 0
      });
    }

    const metric = this.metrics.pageLoads.get(pageName);
    metric.loadCount += 1;
    metric.totalTime += loadTime;
    metric.averageTime = metric.totalTime / metric.loadCount;
    metric.lastLoad = new Date().toISOString();

    // Track slow page loads
    if (loadTime > this.metrics.slowPageLoadThreshold) {
      metric.slowLoads += 1;
      console.warn(`🐌 Slow page load detected: ${pageName} took ${loadTime}ms`, {
        page: pageName,
        loadTime,
        threshold: this.metrics.slowPageLoadThreshold
      });
    }
  }

  /**
   * Track user interaction performance (clicks, form submissions, etc.)
   */
  trackUserInteraction(interactionType, duration = 0) {
    if (!this.isEnabled) return;

    if (!this.metrics.userInteractions.has(interactionType)) {
      this.metrics.userInteractions.set(interactionType, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        lastInteraction: null
      });
    }

    const metric = this.metrics.userInteractions.get(interactionType);
    metric.count += 1;
    if (duration > 0) {
      metric.totalTime += duration;
      metric.averageTime = metric.totalTime / metric.count;
    }
    metric.lastInteraction = new Date().toISOString();
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary() {
    const componentMetrics = Array.from(this.metrics.components.entries())
      .map(([component, data]) => ({
        component,
        averageTime: data.averageTime.toFixed(2),
        totalRenders: data.renderCount,
        slowRenders: data.slowRenders,
        slowRenderPercentage: ((data.slowRenders / data.renderCount) * 100).toFixed(1),
        lastRender: data.lastRender
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    const apiMetrics = Array.from(this.metrics.apiCalls.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        averageTime: Math.round(data.averageTime),
        totalCalls: data.callCount,
        successRate: ((data.successCount / data.callCount) * 100).toFixed(1),
        slowCalls: data.slowCalls,
        slowCallPercentage: ((data.slowCalls / data.callCount) * 100).toFixed(1),
        statusCodes: data.statusCodes,
        lastCall: data.lastCall
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    const pageMetrics = Array.from(this.metrics.pageLoads.entries())
      .map(([page, data]) => ({
        page,
        averageTime: Math.round(data.averageTime),
        totalLoads: data.loadCount,
        slowLoads: data.slowLoads,
        slowLoadPercentage: ((data.slowLoads / data.loadCount) * 100).toFixed(1),
        lastLoad: data.lastLoad
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    const interactionMetrics = Array.from(this.metrics.userInteractions.entries())
      .map(([interaction, data]) => ({
        interaction,
        count: data.count,
        averageTime: data.averageTime > 0 ? data.averageTime.toFixed(2) : 'N/A',
        lastInteraction: data.lastInteraction
      }))
      .sort((a, b) => b.count - a.count);

    return {
      timestamp: new Date().toISOString(),
      isEnabled: this.isEnabled,
      summary: {
        totalComponentRenders: Array.from(this.metrics.components.values()).reduce((sum, m) => sum + m.renderCount, 0),
        totalApiCalls: Array.from(this.metrics.apiCalls.values()).reduce((sum, m) => sum + m.callCount, 0),
        totalPageLoads: Array.from(this.metrics.pageLoads.values()).reduce((sum, m) => sum + m.loadCount, 0),
        totalUserInteractions: Array.from(this.metrics.userInteractions.values()).reduce((sum, m) => sum + m.count, 0),
        slowComponents: Array.from(this.metrics.components.values()).reduce((sum, m) => sum + m.slowRenders, 0),
        slowApiCalls: Array.from(this.metrics.apiCalls.values()).reduce((sum, m) => sum + m.slowCalls, 0),
        slowPageLoads: Array.from(this.metrics.pageLoads.values()).reduce((sum, m) => sum + m.slowLoads, 0),
      },
      topSlowComponents: componentMetrics.slice(0, 10),
      topSlowApiCalls: apiMetrics.slice(0, 10),
      topSlowPageLoads: pageMetrics.slice(0, 10),
      topUserInteractions: interactionMetrics.slice(0, 10)
    };
  }

  /**
   * Export metrics to console or backend
   */
  exportMetrics() {
    const summary = this.getMetricsSummary();
    console.group('📊 Frontend Performance Metrics');
    console.table(summary.summary);
    console.groupCollapsed('🐌 Slow Components');
    console.table(summary.topSlowComponents);
    console.groupEnd();
    console.groupCollapsed('🌐 Slow API Calls');
    console.table(summary.topSlowApiCalls);
    console.groupEnd();
    console.groupCollapsed('📄 Page Load Performance');
    console.table(summary.topSlowPageLoads);
    console.groupEnd();
    console.groupCollapsed('👆 User Interactions');
    console.table(summary.topUserInteractions);
    console.groupEnd();
    console.groupEnd();

    return summary;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.metrics.components.clear();
    this.metrics.apiCalls.clear();
    this.metrics.pageLoads.clear();
    this.metrics.userInteractions.clear();
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('enablePerformanceMonitoring', enabled.toString());
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(slowComponentThreshold, slowApiThreshold, slowPageLoadThreshold) {
    this.metrics.slowComponentThreshold = slowComponentThreshold || this.metrics.slowComponentThreshold;
    this.metrics.slowApiThreshold = slowApiThreshold || this.metrics.slowApiThreshold;
    this.metrics.slowPageLoadThreshold = slowPageLoadThreshold || this.metrics.slowPageLoadThreshold;

    console.info('📊 Frontend performance thresholds updated', {
      slowComponentThreshold: this.metrics.slowComponentThreshold,
      slowApiThreshold: this.metrics.slowApiThreshold,
      slowPageLoadThreshold: this.metrics.slowPageLoadThreshold
    });
  }
}

// Singleton instance
const frontendPerformanceMonitor = new FrontendPerformanceMonitor();

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  window.performanceMonitor = frontendPerformanceMonitor;
}

export { frontendPerformanceMonitor, FrontendPerformanceMonitor };