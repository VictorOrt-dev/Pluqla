/**
 * usePhotoMatch Hook
 *
 * React hook for photo match functionality
 * Handles image submission, polling, and result management
 *
 * Usage:
 *   const { submitPhoto, loading, result, error } = usePhotoMatch();
 *   submitPhoto(imageFile).then(result => console.log(result));
 */

import { useState, useCallback } from 'react';
import apiAdapter from '../services/api/apiAdapter';

/**
 * Convert File to base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 data URI
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Photo Match Hook
 * @returns {Object} Hook state and methods
 */
export function usePhotoMatch() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [quota, setQuota] = useState(null);

  /**
   * Submit photo for matching
   * @param {File} imageFile - Image file to analyze
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Match result
   */
  const submitPhoto = useCallback(async (imageFile, metadata = {}) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      // Validate file
      if (!imageFile || !imageFile.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      // Check file size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (imageFile.size > MAX_SIZE) {
        throw new Error(`Image too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
      }

      setProgress(20);

      // Convert to base64
      const base64 = await fileToBase64(imageFile);

      setProgress(30);

      // Create job
      const createResponse = await apiAdapter.post('/photo-match', {
        image: base64,
        metadata: {
          source: 'upload',
          category: 'clothing',
          ...metadata
        }
      });

      if (!createResponse.data.success) {
        throw new Error(createResponse.data.error?.message || 'Failed to create job');
      }

      const jobId = createResponse.data.data.jobId;
      const quotaInfo = createResponse.data.quota;

      setQuota(quotaInfo);
      setProgress(40);

      // Poll for result
      const jobResult = await pollJobStatus(jobId, (currentProgress) => {
        setProgress(40 + (currentProgress / 100) * 60); // 40% -> 100%
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
   * @param {number} maxAttempts - Max polling attempts (default 30)
   * @param {number} interval - Polling interval in ms (default 2000)
   * @returns {Promise<Object>} Job result
   */
  const pollJobStatus = async (jobId, onProgress, maxAttempts = 30, interval = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await apiAdapter.get(`/photo-match/${jobId}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get job status');
      }

      const jobData = response.data.data;

      // Update progress (estimate based on status)
      const progressPercent = {
        'pending': 10,
        'processing': 50,
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
        throw new Error(jobData.error?.message || 'Job processing failed');
      }

      // Still pending/processing - wait and retry
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Job timeout - processing took too long');
  };

  /**
   * Get user's photo match history
   * @param {Object} options - Query options
   * @returns {Promise<Object>} History data
   */
  const getHistory = useCallback(async (options = {}) => {
    try {
      const params = new URLSearchParams({
        limit: options.limit || 20,
        offset: options.offset || 0,
        ...(options.status && { status: options.status })
      });

      const response = await apiAdapter.get(`/photo-match/history?${params}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get history');
      }

      return response.data.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Get user's photo match analytics
   * @returns {Promise<Object>} Analytics data
   */
  const getAnalytics = useCallback(async () => {
    try {
      const response = await apiAdapter.get('/photo-match/analytics');

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get analytics');
      }

      return response.data.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      throw new Error(errorMessage);
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
  }, []);

  return {
    // State
    loading,
    result,
    error,
    progress, // 0-100
    quota,

    // Methods
    submitPhoto,
    getHistory,
    getAnalytics,
    reset
  };
}

// Also export as default for backward compatibility
export default usePhotoMatch;
