/**
 * Transport Trip Service
 *
 * Business logic for user transport trip CRUD operations
 * Handles creating, reading, updating, and deleting user's persistent trips
 *
 * Security considerations:
 * - User ownership verification on all operations
 * - Input validation and sanitization
 * - Rate limiting applied via middleware
 */

const prisma = require('../lib/prismaClient');
const logger = require('../utils/logger');

/**
 * Create a new transport trip
 * @param {string} userId - User ID
 * @param {Object} tripData - Trip data (name, origin, destination, distanceKm, recurring)
 * @returns {Promise<Object>} Created trip
 */
async function createTrip(userId, tripData) {
  try {
    // Validate required fields
    if (!tripData.name || !tripData.origin || !tripData.destination) {
      throw new Error('Name, origin, and destination are required');
    }

    // Validate distance if provided
    if (tripData.distanceKm !== undefined && tripData.distanceKm !== null) {
      if (tripData.distanceKm <= 0 || tripData.distanceKm > 1000) {
        throw new Error('Distance must be between 0 and 1000 km');
      }
    }

    // Create trip
    const trip = await prisma.transportTrip.create({
      data: {
        userId,
        name: tripData.name.trim().substring(0, 100),
        origin: tripData.origin.trim().substring(0, 200),
        destination: tripData.destination.trim().substring(0, 200),
        distanceKm: tripData.distanceKm || null,
        recurring: Boolean(tripData.recurring)
      }
    });

    logger.info('Transport trip created', {
      tripId: trip.id,
      userId,
      name: trip.name
    });

    return trip;

  } catch (error) {
    logger.error('Failed to create transport trip', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's transport trips
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Object>} Trips list
 */
async function getUserTrips(userId, options = {}) {
  try {
    const {
      limit = 50,
      offset = 0
    } = options;

    // Validate options
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new Error('Offset must be a positive integer');
    }

    // Fetch trips
    const [trips, total] = await Promise.all([
      prisma.transportTrip.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.transportTrip.count({ where: { userId } })
    ]);

    logger.info('Transport trips retrieved', {
      userId,
      count: trips.length,
      total
    });

    return {
      trips,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };

  } catch (error) {
    logger.error('Failed to get transport trips', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get single trip by ID
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Trip
 */
async function getTripById(tripId, userId) {
  try {
    const trip = await prisma.transportTrip.findFirst({
      where: {
        id: tripId,
        userId // Ensure user owns this trip
      }
    });

    if (!trip) {
      throw new Error('Trip not found or access denied');
    }

    return trip;

  } catch (error) {
    logger.error('Failed to get transport trip', {
      tripId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Update transport trip
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated trip
 */
async function updateTrip(tripId, userId, updateData) {
  try {
    // First verify ownership
    const existingTrip = await getTripById(tripId, userId);

    // Build update data
    const data = {};

    if (updateData.name !== undefined) {
      data.name = updateData.name.trim().substring(0, 100);
    }

    if (updateData.origin !== undefined) {
      data.origin = updateData.origin.trim().substring(0, 200);
    }

    if (updateData.destination !== undefined) {
      data.destination = updateData.destination.trim().substring(0, 200);
    }

    if (updateData.distanceKm !== undefined && updateData.distanceKm !== null) {
      if (updateData.distanceKm <= 0 || updateData.distanceKm > 1000) {
        throw new Error('Distance must be between 0 and 1000 km');
      }
      data.distanceKm = updateData.distanceKm;
    }

    if (updateData.recurring !== undefined) {
      data.recurring = Boolean(updateData.recurring);
    }

    // Update trip
    const updatedTrip = await prisma.transportTrip.update({
      where: { id: tripId },
      data
    });

    logger.info('Transport trip updated', {
      tripId,
      userId,
      updatedFields: Object.keys(data)
    });

    return updatedTrip;

  } catch (error) {
    logger.error('Failed to update transport trip', {
      tripId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete transport trip
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<void>}
 */
async function deleteTrip(tripId, userId) {
  try {
    // First verify ownership
    await getTripById(tripId, userId);

    // Delete trip
    await prisma.transportTrip.delete({
      where: { id: tripId }
    });

    logger.info('Transport trip deleted', {
      tripId,
      userId
    });

  } catch (error) {
    logger.error('Failed to delete transport trip', {
      tripId,
      userId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip
};
