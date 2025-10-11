/**
 * useTransportOptimization Hook
 *
 * React hook for transport cost optimization functionality
 * Handles trip submission, polling, result management, history, and analytics
 *
 * Usage:
 *   const { submitTrip, loading, result, error, quota } = useTransportOptimization();
 *   submitTrip({ origin: 'Paris', destination: 'Lyon', distance: 450 });
 */

import { useState, useCallback } from 'react';
import apiAdapter from '../services/api/apiAdapter';

/**
 * Transport Optimization Hook
 * @returns {Object} Hook state and methods
 */
export function useTransportOptimization() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [quota, setQuota] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  /**
   * Submit trip for optimization
   * @param {Object} tripData - Trip details
   * @param {string} tripData.origin - Origin location
   * @param {string} tripData.destination - Destination location
   * @param {number} tripData.distance - Distance in km
   * @param {boolean} tripData.recurring - Whether trip is recurring (optional)
   * @param {boolean} tripData.parkingNeeded - Whether parking is needed (optional)
   * @param {boolean} tripData.tollRoads - Whether toll roads are used (optional)
   * @param {Array<string>} tripData.modes - Specific modes to calculate (optional)
   * @returns {Promise<Object>} Optimization result
   */
  const submitTrip = useCallback(async (tripData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      // Validate trip data
      if (!tripData.origin || !tripData.destination) {
        throw new Error('Origin and destination are required');
      }

      if (!tripData.distance || tripData.distance <= 0 || tripData.distance > 1000) {
        throw new Error('Distance must be between 0 and 1000 km');
      }

      setProgress(20);

      // Create optimization job
      const createResponse = await apiAdapter.post('/transport-optimize', {
        origin: tripData.origin,
        destination: tripData.destination,
        distance: tripData.distance,
        recurring: tripData.recurring || false,
        parkingNeeded: tripData.parkingNeeded !== false, // default true
        tollRoads: tripData.tollRoads === true, // default false
        modes: tripData.modes || null,
        metadata: {
          source: 'homescreen-features',
          category: 'transport',
          ...tripData.metadata
        }
      });

      if (!createResponse.data.success) {
        throw new Error(createResponse.data.error?.message || 'Failed to create optimization job');
      }

      const jobId = createResponse.data.data.jobId;
      const quotaInfo = createResponse.data.quota;
      const isDuplicate = createResponse.data.data.duplicate;

      setQuota(quotaInfo);
      setProgress(30);

      // If duplicate, might already be completed
      if (isDuplicate) {
        setProgress(50);
      }

      // Poll for result (fast computation, usually <5 seconds)
      const jobResult = await pollJobStatus(jobId, (currentProgress) => {
        setProgress(30 + (currentProgress / 100) * 70); // 30% -> 100%
      });

      setResult(jobResult);
      setProgress(100);

      return jobResult;

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll job status until completion
   * @param {string} jobId - Job ID to poll
   * @param {Function} onProgress - Progress callback
   * @param {number} maxAttempts - Max polling attempts (default 15, fast computation)
   * @param {number} interval - Polling interval in ms (default 1000)
   * @returns {Promise<Object>} Job result
   */
  const pollJobStatus = async (jobId, onProgress, maxAttempts = 15, interval = 1000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await apiAdapter.get(`/transport-optimize/${jobId}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get job status');
      }

      const jobData = response.data.data;

      // Update progress (estimate based on status)
      const progressPercent = {
        'pending': 20,
        'processing': 60,
        'completed': 100,
        'failed': 0
      }[jobData.status] || 0;

      onProgress(progressPercent);

      // Job completed successfully
      if (jobData.status === 'completed') {
        return jobData.result;
      }

      // Job failed
      if (jobData.status === 'failed') {
        throw new Error(jobData.error?.message || 'Optimization failed');
      }

      // Still pending/processing - wait and retry
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Optimization timeout. Please try again.');
  };

  /**
   * Get user's optimization history
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of items (default 20)
   * @param {number} options.offset - Offset for pagination (default 0)
   * @param {string} options.status - Filter by status (optional)
   * @returns {Promise<Object>} History data
   */
  const getHistory = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: options.limit || 20,
        offset: options.offset || 0
      };

      if (options.status) {
        params.status = options.status;
      }

      const response = await apiAdapter.get('/transport-optimize/history', { params });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get history');
      }

      setHistory(response.data.data.jobs);
      return response.data.data;

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user's optimization analytics
   * @returns {Promise<Object>} Analytics data
   */
  const getAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiAdapter.get('/transport-optimize/analytics');

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get analytics');
      }

      setAnalytics(response.data.data);
      return response.data.data;

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setResult(null);
    setError(null);
    setProgress(0);
    setQuota(null);
    setHistory([]);
    setAnalytics(null);
  }, []);

  return {
    // State
    loading,
    result,
    error,
    progress,
    quota,
    history,
    analytics,

    // Methods
    submitTrip,
    pollJobStatus,
    getHistory,
    getAnalytics,
    reset
  };
}

export default useTransportOptimization;
