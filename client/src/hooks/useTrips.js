/**
 * useTrips Hook
 *
 * React hook for managing user transport trips (CRUD operations)
 * Handles creating, reading, updating, and deleting trips
 * Provides optimistic UI updates
 *
 * Usage:
 *   const { trips, loading, createTrip, updateTrip, deleteTrip } = useTrips();
 */

import { useState, useCallback, useEffect } from 'react';
import apiAdapter from '../services/api/apiAdapter';

/**
 * Transport Trips Hook
 * @returns {Object} Hook state and methods
 */
export function useTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  /**
   * Fetch user's trips
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<void>}
   */
  const fetchTrips = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      const response = await apiAdapter.get(`/trips?${params}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to fetch trips');
      }

      setTrips(response.data.data.trips || []);
      setTotal(response.data.data.total || 0);

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch trips';
      console.error('Failed to fetch trips:', errorMessage, err);
      setError(errorMessage);
      // Set empty trips as fallback instead of throwing
      setTrips([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new trip
   * @param {Object} tripData - Trip data (name, origin, destination, distanceKm, recurring)
   * @returns {Promise<Object>} Created trip
   */
  const createTrip = useCallback(async (tripData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiAdapter.post('/trips', tripData);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to create trip');
      }

      const newTrip = response.data.data;

      // Optimistic update: add trip to local state immediately
      setTrips(prev => [newTrip, ...prev]);
      setTotal(prev => prev + 1);

      return newTrip;

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a trip
   * @param {string} tripId - Trip ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated trip
   */
  const updateTrip = useCallback(async (tripId, updateData) => {
    setLoading(true);
    setError(null);

    // Store original trip for rollback on error
    const originalTrips = [...trips];

    // Optimistic update: update trip in local state immediately
    setTrips(prev => prev.map(trip =>
      trip.id === tripId ? { ...trip, ...updateData } : trip
    ));

    try {
      const response = await apiAdapter.put(`/trips/${tripId}`, updateData);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to update trip');
      }

      const updatedTrip = response.data.data;

      // Update with server response
      setTrips(prev => prev.map(trip =>
        trip.id === tripId ? updatedTrip : trip
      ));

      return updatedTrip;

    } catch (err) {
      // Rollback on error
      setTrips(originalTrips);

      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trips]);

  /**
   * Delete a trip
   * @param {string} tripId - Trip ID
   * @returns {Promise<void>}
   */
  const deleteTrip = useCallback(async (tripId) => {
    setLoading(true);
    setError(null);

    // Store original trips for rollback on error
    const originalTrips = [...trips];

    // Optimistic update: remove trip from local state immediately
    setTrips(prev => prev.filter(trip => trip.id !== tripId));
    setTotal(prev => prev - 1);

    try {
      const response = await apiAdapter.delete(`/trips/${tripId}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete trip');
      }

    } catch (err) {
      // Rollback on error
      setTrips(originalTrips);
      setTotal(prev => prev + 1);

      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [trips]);

  /**
   * Get single trip by ID
   * @param {string} tripId - Trip ID
   * @returns {Promise<Object>} Trip
   */
  const getTripById = useCallback(async (tripId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiAdapter.get(`/trips/${tripId}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get trip');
      }

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
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh trips (refetch from server)
   */
  const refreshTrips = useCallback(async () => {
    await fetchTrips();
  }, [fetchTrips]);

  // Auto-fetch trips on mount
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    // State
    trips,
    loading,
    error,
    total,

    // Methods
    createTrip,
    updateTrip,
    deleteTrip,
    getTripById,
    fetchTrips,
    refreshTrips,
    clearError
  };
}

export default useTrips;
