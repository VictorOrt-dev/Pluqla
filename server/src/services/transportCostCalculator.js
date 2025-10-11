/**
 * Transport Cost Calculator
 *
 * Calculates economic costs for various transport modes without using Google Maps API
 * Focuses purely on cost estimation based on distance and mode-specific parameters
 *
 * Security & Reliability:
 * - All calculations are deterministic and verifiable
 * - No external API dependencies
 * - Input validation for distance and mode
 * - Configurable parameters for easy tuning
 */

const logger = require('../utils/logger');

/**
 * Transport mode cost parameters (as of 2025, France/Europe average)
 * All costs in EUR, distances in km
 */
const TRANSPORT_MODES = {
  car_gasoline: {
    name: 'Voiture essence',
    fuelCostPerKm: 0.12, // €12/100km @ €1.80/L, 7L/100km
    maintenanceCostPerKm: 0.08, // tire wear, oil, repairs
    parkingCostPerTrip: 2.50, // average parking in city
    tollCostPerKm: 0.05, // highway tolls when applicable
    insuranceDailyShare: 3.00, // €1095/year ÷ 365
    co2PerKm: 120, // grams CO2
    avgSpeedKmH: 45, // urban/mixed
    icon: '🚗'
  },
  car_diesel: {
    name: 'Voiture diesel',
    fuelCostPerKm: 0.09, // €9/100km @ €1.60/L, 5.5L/100km
    maintenanceCostPerKm: 0.09, // slightly higher maintenance
    parkingCostPerTrip: 2.50,
    tollCostPerKm: 0.05,
    insuranceDailyShare: 3.00,
    co2PerKm: 95, // lower CO2 than gasoline
    avgSpeedKmH: 45,
    icon: '🚗'
  },
  car_electric: {
    name: 'Voiture électrique',
    fuelCostPerKm: 0.03, // €3/100km @ €0.20/kWh, 15kWh/100km
    maintenanceCostPerKm: 0.04, // much lower maintenance
    parkingCostPerTrip: 1.00, // often cheaper/free parking
    tollCostPerKm: 0.05,
    insuranceDailyShare: 3.50, // slightly higher insurance
    co2PerKm: 0, // zero direct emissions
    avgSpeedKmH: 45,
    icon: '⚡'
  },
  motorcycle: {
    name: 'Moto',
    fuelCostPerKm: 0.06, // €6/100km
    maintenanceCostPerKm: 0.06,
    parkingCostPerTrip: 1.00, // cheaper parking
    tollCostPerKm: 0.03, // reduced tolls
    insuranceDailyShare: 1.50, // €547/year
    co2PerKm: 60,
    avgSpeedKmH: 40,
    icon: '🏍️'
  },
  scooter_electric: {
    name: 'Trottinette électrique',
    fuelCostPerKm: 0.01, // €1/100km charging
    maintenanceCostPerKm: 0.02,
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0.50,
    co2PerKm: 0,
    avgSpeedKmH: 20,
    icon: '🛴'
  },
  bike_electric: {
    name: 'Vélo électrique',
    fuelCostPerKm: 0.005, // €0.50/100km charging
    maintenanceCostPerKm: 0.01, // chain, brakes, tires
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0.30,
    co2PerKm: 0,
    avgSpeedKmH: 20,
    icon: '🚴'
  },
  bike: {
    name: 'Vélo classique',
    fuelCostPerKm: 0, // no fuel
    maintenanceCostPerKm: 0.01, // minimal maintenance
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0, // typically not insured
    co2PerKm: 0,
    avgSpeedKmH: 15,
    icon: '🚴'
  },
  public_transport_metro: {
    name: 'Métro/Tramway',
    ticketCost: 1.90, // Paris Métro ticket
    monthlyPassCost: 75.20, // Navigo pass
    costPerKm: 0.15, // amortized
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0,
    co2PerKm: 5, // very low emissions
    avgSpeedKmH: 25,
    icon: '🚇'
  },
  public_transport_bus: {
    name: 'Bus',
    ticketCost: 1.90,
    monthlyPassCost: 75.20,
    costPerKm: 0.15,
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0,
    co2PerKm: 80, // higher than metro
    avgSpeedKmH: 15,
    icon: '🚌'
  },
  train_regional: {
    name: 'Train régional',
    costPerKm: 0.12, // TER pricing
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0,
    co2PerKm: 30,
    avgSpeedKmH: 80,
    icon: '🚆'
  },
  walk: {
    name: 'Marche à pied',
    fuelCostPerKm: 0,
    maintenanceCostPerKm: 0, // shoe wear negligible
    parkingCostPerTrip: 0,
    tollCostPerKm: 0,
    insuranceDailyShare: 0,
    co2PerKm: 0,
    avgSpeedKmH: 5,
    icon: '🚶'
  },
  carpool: {
    name: 'Covoiturage',
    costPerKm: 0.05, // shared fuel + service fee
    parkingCostPerTrip: 0.50, // shared
    tollCostPerKm: 0.025, // shared
    insuranceDailyShare: 0,
    co2PerKm: 40, // shared emissions
    avgSpeedKmH: 50,
    icon: '🚗👥'
  },
  taxi: {
    name: 'Taxi/VTC',
    baseFare: 4.00,
    costPerKm: 1.20,
    costPerMinute: 0.50,
    parkingCostPerTrip: 0,
    tollCostPerKm: 0, // included in fare
    insuranceDailyShare: 0,
    co2PerKm: 120,
    avgSpeedKmH: 35,
    icon: '🚕'
  }
};

/**
 * Calculate trip cost for a specific transport mode
 * @param {string} mode - Transport mode key
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} options - Additional options (recurring, parkingNeeded, etc.)
 * @returns {Object} Cost breakdown
 */
function calculateModeCost(mode, distanceKm, options = {}) {
  const modeConfig = TRANSPORT_MODES[mode];

  if (!modeConfig) {
    throw new Error(`Unknown transport mode: ${mode}`);
  }

  // Validate distance
  if (distanceKm <= 0 || distanceKm > 1000) {
    throw new Error(`Invalid distance: ${distanceKm}km. Must be between 0 and 1000km.`);
  }

  const {
    recurring = false,
    tripsPerMonth = 20, // working days
    parkingNeeded = true,
    tollRoads = false
  } = options;

  let totalCost = 0;
  const breakdown = {
    mode,
    modeName: modeConfig.name,
    distanceKm,
    fuel: 0,
    maintenance: 0,
    parking: 0,
    tolls: 0,
    insurance: 0,
    tickets: 0,
    baseFare: 0,
    total: 0,
    co2Grams: 0,
    durationMinutes: 0
  };

  // Calculate duration
  breakdown.durationMinutes = Math.round((distanceKm / modeConfig.avgSpeedKmH) * 60);

  // Mode-specific cost calculations
  if (mode === 'taxi') {
    // Taxi: base fare + per km + per minute
    breakdown.baseFare = modeConfig.baseFare;
    breakdown.fuel = distanceKm * modeConfig.costPerKm;
    breakdown.fuel += breakdown.durationMinutes * modeConfig.costPerMinute;
    totalCost = breakdown.baseFare + breakdown.fuel;
  }
  else if (mode.startsWith('public_transport') || mode === 'train_regional') {
    // Public transport: ticket or monthly pass amortization
    if (recurring && tripsPerMonth >= 40) {
      // Monthly pass more economical
      breakdown.tickets = (modeConfig.monthlyPassCost || 75.20) / tripsPerMonth;
    } else {
      // Individual ticket
      breakdown.tickets = modeConfig.ticketCost || (distanceKm * modeConfig.costPerKm);
    }
    totalCost = breakdown.tickets;
  }
  else if (mode === 'carpool') {
    // Carpool: simplified cost sharing
    breakdown.fuel = distanceKm * modeConfig.costPerKm;
    breakdown.parking = parkingNeeded ? modeConfig.parkingCostPerTrip : 0;
    breakdown.tolls = tollRoads ? distanceKm * modeConfig.tollCostPerKm : 0;
    totalCost = breakdown.fuel + breakdown.parking + breakdown.tolls;
  }
  else if (mode === 'walk' || mode === 'bike') {
    // Free modes (minimal maintenance for bike)
    breakdown.maintenance = distanceKm * (modeConfig.maintenanceCostPerKm || 0);
    totalCost = breakdown.maintenance;
  }
  else {
    // Car, motorcycle, electric vehicles, e-bikes, e-scooters
    breakdown.fuel = distanceKm * (modeConfig.fuelCostPerKm || 0);
    breakdown.maintenance = distanceKm * (modeConfig.maintenanceCostPerKm || 0);
    breakdown.parking = parkingNeeded ? (modeConfig.parkingCostPerTrip || 0) : 0;
    breakdown.tolls = tollRoads ? distanceKm * (modeConfig.tollCostPerKm || 0) : 0;
    breakdown.insurance = modeConfig.insuranceDailyShare || 0;

    totalCost = breakdown.fuel + breakdown.maintenance + breakdown.parking +
                breakdown.tolls + breakdown.insurance;
  }

  // CO2 emissions
  breakdown.co2Grams = Math.round(distanceKm * modeConfig.co2PerKm);

  // Round total cost to 2 decimal places
  breakdown.total = Math.round(totalCost * 100) / 100;

  return breakdown;
}

/**
 * Calculate costs for all available transport modes
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} options - Calculation options
 * @returns {Object} All mode costs and recommendations
 */
function calculateAllModeCosts(distanceKm, options = {}) {
  const results = {
    distanceKm,
    modes: {},
    optimal: {
      cheapest: null,
      fastest: null,
      greenest: null
    },
    savings: 0,
    calculatedAt: new Date().toISOString()
  };

  // Calculate costs for all applicable modes
  const applicableModes = getApplicableModesForDistance(distanceKm);

  for (const mode of applicableModes) {
    try {
      const cost = calculateModeCost(mode, distanceKm, options);
      results.modes[mode] = cost;
    } catch (error) {
      logger.warn(`Failed to calculate cost for mode ${mode}`, {
        error: error.message,
        distanceKm
      });
    }
  }

  // Find optimal modes
  const modeArray = Object.values(results.modes);

  if (modeArray.length > 0) {
    // Cheapest
    results.optimal.cheapest = modeArray.reduce((min, mode) =>
      mode.total < min.total ? mode : min
    );

    // Fastest
    results.optimal.fastest = modeArray.reduce((fastest, mode) =>
      mode.durationMinutes < fastest.durationMinutes ? mode : fastest
    );

    // Greenest (lowest CO2)
    results.optimal.greenest = modeArray.reduce((greenest, mode) =>
      mode.co2Grams < greenest.co2Grams ? mode : greenest
    );

    // Calculate savings potential
    const mostExpensive = modeArray.reduce((max, mode) =>
      mode.total > max.total ? mode : max
    );
    results.savings = Math.round((mostExpensive.total - results.optimal.cheapest.total) * 100) / 100;
  }

  return results;
}

/**
 * Get applicable transport modes based on distance
 * @param {number} distanceKm - Distance in km
 * @returns {string[]} Array of applicable mode keys
 */
function getApplicableModesForDistance(distanceKm) {
  const allModes = Object.keys(TRANSPORT_MODES);

  // Filter modes based on practicality
  return allModes.filter(mode => {
    // Walking only practical up to 5km
    if (mode === 'walk' && distanceKm > 5) return false;

    // Regular bike practical up to 15km
    if (mode === 'bike' && distanceKm > 15) return false;

    // E-bike practical up to 30km
    if (mode === 'bike_electric' && distanceKm > 30) return false;

    // E-scooter practical up to 15km
    if (mode === 'scooter_electric' && distanceKm > 15) return false;

    // Metro/bus practical in urban areas (< 50km)
    if ((mode === 'public_transport_metro' || mode === 'public_transport_bus') && distanceKm > 50) return false;

    // Regional train for longer distances (> 10km)
    if (mode === 'train_regional' && distanceKm < 10) return false;

    return true;
  });
}

/**
 * Validate trip input
 * @param {Object} tripData - Trip data object
 * @returns {Object} Validated trip data
 */
function validateTripInput(tripData) {
  const { origin, destination, distance, modes, recurring } = tripData;

  // Validate required fields
  if (!origin || typeof origin !== 'string') {
    throw new Error('Origin is required and must be a string');
  }

  if (!destination || typeof destination !== 'string') {
    throw new Error('Destination is required and must be a string');
  }

  // Validate distance (required)
  if (!distance || typeof distance !== 'number') {
    throw new Error('Distance is required and must be a number');
  }

  if (distance <= 0 || distance > 1000) {
    throw new Error('Distance must be between 0 and 1000 km');
  }

  // Validate modes (optional, specific modes to calculate)
  if (modes && !Array.isArray(modes)) {
    throw new Error('Modes must be an array');
  }

  if (modes) {
    const invalidModes = modes.filter(m => !TRANSPORT_MODES[m]);
    if (invalidModes.length > 0) {
      throw new Error(`Invalid modes: ${invalidModes.join(', ')}`);
    }
  }

  // Validate recurring (optional)
  if (recurring !== undefined && typeof recurring !== 'boolean') {
    throw new Error('Recurring must be a boolean');
  }

  // Sanitize strings (prevent XSS/injection)
  return {
    origin: origin.trim().substring(0, 200),
    destination: destination.trim().substring(0, 200),
    distance: Number(distance),
    modes: modes || null,
    recurring: Boolean(recurring)
  };
}

module.exports = {
  TRANSPORT_MODES,
  calculateModeCost,
  calculateAllModeCosts,
  getApplicableModesForDistance,
  validateTripInput
};
