/**
 * Performance Profiler Component
 *
 * Wraps components with React Profiler to track render performance
 * Automatically tracks component render times and identifies performance issues
 */

import React, { Profiler, useEffect, useState } from 'react';
import { frontendPerformanceMonitor } from '../../utils/performanceMonitor';

/**
 * ProfilerWrapper - Wraps any component with performance monitoring
 */
export function ProfilerWrapper({ id, children, trackOnly = false }) {
  const handleProfilerData = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    frontendPerformanceMonitor.trackComponentRender(
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    );
  };

  // If tracking is disabled, render children without profiler
  if (!frontendPerformanceMonitor.isEnabled && !trackOnly) {
    return children;
  }

  return (
    <Profiler id={id} onRender={handleProfilerData}>
      {children}
    </Profiler>
  );
}

/**
 * PerformanceDebugPanel - Debug panel to view performance metrics
 * Only shown in development or when explicitly enabled
 */
export function PerformanceDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [isEnabled, setIsEnabled] = useState(frontendPerformanceMonitor.isEnabled);

  const updateMetrics = () => {
    setMetrics(frontendPerformanceMonitor.getMetricsSummary());
  };

  const toggleMonitoring = () => {
    const newEnabled = !isEnabled;
    frontendPerformanceMonitor.setEnabled(newEnabled);
    setIsEnabled(newEnabled);
  };

  const exportMetrics = () => {
    frontendPerformanceMonitor.exportMetrics();
  };

  const resetMetrics = () => {
    frontendPerformanceMonitor.reset();
    updateMetrics();
  };

  useEffect(() => {
    if (isVisible) {
      updateMetrics();
      const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  // Only show in development or when performance monitoring is enabled
  if (process.env.NODE_ENV === 'production' && !isEnabled) {
    return null;
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: isEnabled ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '400px',
            maxHeight: '70vh',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '16px',
            zIndex: 9998,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Performance Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={toggleMonitoring}
              style={{
                background: isEnabled ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              {isEnabled ? 'Disable' : 'Enable'} Monitoring
            </button>
            <button
              onClick={updateMetrics}
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Refresh
            </button>
            <button
              onClick={exportMetrics}
              style={{
                background: '#FF9800',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Export to Console
            </button>
            <button
              onClick={resetMetrics}
              style={{
                background: '#9E9E9E',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>

          {metrics && (
            <div>
              <h4>Summary</h4>
              <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
                <div>Components: {metrics.summary.totalComponentRenders} renders ({metrics.summary.slowComponents} slow)</div>
                <div>API Calls: {metrics.summary.totalApiCalls} calls ({metrics.summary.slowApiCalls} slow)</div>
                <div>Page Loads: {metrics.summary.totalPageLoads} loads ({metrics.summary.slowPageLoads} slow)</div>
                <div>User Interactions: {metrics.summary.totalUserInteractions}</div>
              </div>

              {metrics.topSlowComponents.length > 0 && (
                <>
                  <h4>Slow Components</h4>
                  <div style={{ maxHeight: '120px', overflow: 'auto', marginBottom: '12px' }}>
                    {metrics.topSlowComponents.slice(0, 5).map((comp, index) => (
                      <div key={index} style={{ padding: '4px', borderBottom: '1px solid #eee' }}>
                        <strong>{comp.component}</strong>: {comp.averageTime}ms avg
                        ({comp.slowRenderPercentage}% slow)
                      </div>
                    ))}
                  </div>
                </>
              )}

              {metrics.topSlowApiCalls.length > 0 && (
                <>
                  <h4>Slow API Calls</h4>
                  <div style={{ maxHeight: '120px', overflow: 'auto', marginBottom: '12px' }}>
                    {metrics.topSlowApiCalls.slice(0, 5).map((api, index) => (
                      <div key={index} style={{ padding: '4px', borderBottom: '1px solid #eee' }}>
                        <strong>{api.endpoint}</strong>: {api.averageTime}ms avg
                        ({api.successRate}% success)
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Higher-order component to wrap components with performance profiling
 */
export function withPerformanceProfiler(Component, profileId) {
  return function ProfiledComponent(props) {
    return (
      <ProfilerWrapper id={profileId || Component.name || 'UnknownComponent'}>
        <Component {...props} />
      </ProfilerWrapper>
    );
  };
}

/**
 * Hook to track page load performance
 */
export function usePageLoadTracking(pageName) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const loadTime = Date.now() - startTime;
      frontendPerformanceMonitor.trackPageLoad(pageName, loadTime);
    };
  }, [pageName]);
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking() {
  const trackInteraction = (interactionType, startTime = null) => {
    const duration = startTime ? Date.now() - startTime : 0;
    frontendPerformanceMonitor.trackUserInteraction(interactionType, duration);
  };

  return { trackInteraction };
}