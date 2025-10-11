/**
 * Transport Trip Controller
 *
 * HTTP request handlers for transport trip CRUD operations
 */

const transportTripService = require('../services/transportTripService');
const logger = require('../utils/logger');

/**
 * POST /api/trips
 * Create a new transport trip
 */
async function createTrip(req, res) {
  try {
    const userId = req.user.userId;
    const tripData = req.body;

    const trip = await transportTripService.createTrip(userId, tripData);

    res.status(201).json({
      success: true,
      data: trip,
      message: 'Trip created successfully'
    });

  } catch (error) {
    logger.error('Trip creation failed', {
      userId: req.user?.userId,
      error: error.message
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'TRIP_CREATE_FAILED'
      }
    });
  }
}

/**
 * GET /api/trips
 * Get user's transport trips
 */
async function getUserTrips(req, res) {
  try {
    const userId = req.user.userId;
    const { limit, offset } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    const result = await transportTripService.getUserTrips(userId, options);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get trips failed', {
      userId: req.user?.userId,
      error: error.message
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_TRIPS_FAILED'
      }
    });
  }
}

/**
 * GET /api/trips/:id
 * Get single trip by ID
 */
async function getTripById(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const trip = await transportTripService.getTripById(id, userId);

    res.status(200).json({
      success: true,
      data: trip
    });

  } catch (error) {
    logger.error('Get trip by ID failed', {
      userId: req.user?.userId,
      tripId: req.params.id,
      error: error.message
    });

    const statusCode = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: 'GET_TRIP_FAILED'
      }
    });
  }
}

/**
 * PUT /api/trips/:id
 * Update transport trip
 */
async function updateTrip(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    const trip = await transportTripService.updateTrip(id, userId, updateData);

    res.status(200).json({
      success: true,
      data: trip,
      message: 'Trip updated successfully'
    });

  } catch (error) {
    logger.error('Trip update failed', {
      userId: req.user?.userId,
      tripId: req.params.id,
      error: error.message
    });

    const statusCode = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: 'TRIP_UPDATE_FAILED'
      }
    });
  }
}

/**
 * DELETE /api/trips/:id
 * Delete transport trip
 */
async function deleteTrip(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await transportTripService.deleteTrip(id, userId);

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully'
    });

  } catch (error) {
    logger.error('Trip deletion failed', {
      userId: req.user?.userId,
      tripId: req.params.id,
      error: error.message
    });

    const statusCode = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: 'TRIP_DELETE_FAILED'
      }
    });
  }
}

module.exports = {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip
};
