const express = require('express');
const axios = require('axios');
const router = express.Router();
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const smsService = require('../services/smsService');
const bookingScheduler = require('../services/RedisBookingScheduler');

const GRAPH_HOPPER_API_KEY = '0086de71-3a18-474a-a401-139651689d1f';
const GRAPH_HOPPER_URL = 'https://graphhopper.com/api/1';

// Helper function for consistent pricing calculation across trip planning and booking
function calculateConsistentPricing(energyKWh, pricePerKWh) {
  const baseCost = energyKWh * pricePerKWh;
  const platformFee = 10; // ₹10 platform fee per station (Nepal pricing)
  const totalAmount = baseCost + platformFee;
  
  return {
    baseCost: Math.round(baseCost),
    platformFee,
    taxes: 0, // No GST in Nepal
    totalAmount: Math.round(totalAmount)
  };
}

// Trip Planning Algorithm
router.post('/plan', protect, async (req, res) => {
  try {
    const { vehicleEfficiency, currentBatteryPercent, thresholdPercent, fromLocation, toLocation, viaLocations = [] } = req.body;

    // Validate input
    if (!vehicleEfficiency || !currentBatteryPercent || !thresholdPercent || !fromLocation || !toLocation) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: vehicleEfficiency, currentBatteryPercent, thresholdPercent, fromLocation, toLocation'
      });
    }

    // Convert to numbers
    const efficiency = parseFloat(vehicleEfficiency); // km per 100%
    const currentBattery = parseFloat(currentBatteryPercent);
    const threshold = parseFloat(thresholdPercent);

    // Calculate current available range
    const currentRange = (efficiency * currentBattery) / 100;
    const thresholdRange = (efficiency * threshold) / 100;
    const usableRange = currentRange - thresholdRange;

    console.log('Trip Planning Input:', {
      efficiency,
      currentBattery,
      threshold,
      currentRange,
      thresholdRange,
      usableRange,
      from: fromLocation.name,
      to: toLocation.name
    });

    // Handle low battery by including initial charging in trip plan
    let initialChargingSession = null;
    let adjustedCurrentBattery = currentBattery;
    let adjustedCurrentRange = currentRange;

    if (currentRange < thresholdRange) {
      console.log('Edge case detected: Current range is less than threshold range. Including initial charging session...');
      
      // Find stations near current location
      let nearbyStations = await findNearbyChargingStations(fromLocation.latitude, fromLocation.longitude, 20);
      
      if (nearbyStations.length === 0) {
        // Try wider search if no stations found
        nearbyStations = await findNearbyChargingStations(fromLocation.latitude, fromLocation.longitude, 50);
        
        if (nearbyStations.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Your current battery level is insufficient for this trip and no charging stations were found within 50km of your starting location. Please charge your vehicle before starting the trip or choose a different starting location.'
          });
        }
      }
      
      // Select best station for initial charging with slot availability check
      // Calculate estimated arrival time for initial charging (current time + 15 minutes preparation + travel time)
      const estimatedInitialArrival = new Date(Date.now() + 15 * 60 * 1000); // Start with 15 minutes preparation
      const estimatedInitialChargingTime = 60; // Assume 1 hour for initial charging
      
      const bestInitialStationResult = await selectBestStationWithAvailability(nearbyStations, estimatedInitialArrival.toISOString(), estimatedInitialChargingTime);
      
      if (!bestInitialStationResult) {
        return res.status(400).json({
          success: false,
          message: 'No charging stations with available slots found near your starting location. Please try again later or choose a different starting location.'
        });
      }
      
      const bestInitialStation = bestInitialStationResult.station;
      
      // Calculate initial charging session details
      const initialBatteryOnArrival = currentBattery;
      const initialBatteryAfterCharging = 100; // Charge to full
      
      // Calculate realistic battery capacity from efficiency
      // Assume typical EV efficiency of 4-6 km/kWh
      const assumedEfficiencyPerKWh = 5; // km per kWh (realistic for most EVs)
      const estimatedBatteryCapacity = efficiency / assumedEfficiencyPerKWh; // kWh
      const initialEnergyRequired = (initialBatteryAfterCharging - initialBatteryOnArrival) / 100 * estimatedBatteryCapacity;
      const originalInitialEnergyRequired = initialEnergyRequired; // Store original value before rounding
      
      // Calculate charging time and cost
      // FIX: Use the same port that was selected for availability, not just the first port
      const selectedInitialPort = bestInitialStationResult.availablePort;
      const stationPowerOutput = selectedInitialPort?.powerOutput || bestInitialStation.chargingPorts?.[0]?.powerOutput || 22; // kW from station
      const effectiveChargingSpeed = Math.min(stationPowerOutput, 50); // Cap at 50kW for safety
      const initialChargingTime = Math.ceil((initialEnergyRequired / effectiveChargingSpeed) * 60); // minutes
      const averagePricePerKWh = selectedInitialPort?.pricePerUnit || bestInitialStation.chargingPorts?.[0]?.pricePerUnit || 15;
      const initialPricing = calculateConsistentPricing(initialEnergyRequired, averagePricePerKWh);
      const initialCost = initialPricing.totalAmount;
      
      // Debug initial charging pricing
      console.log('Initial charging pricing:', {
        stationName: bestInitialStation.name,
        selectedPort: selectedInitialPort ? {
          id: selectedInitialPort._id.toString(),
          portNumber: selectedInitialPort.portNumber,
          pricePerUnit: selectedInitialPort.pricePerUnit
        } : 'NO PORT SELECTED',
        energyRequired: initialEnergyRequired,
        pricePerUnit: averagePricePerKWh,
        baseCost: initialPricing.baseCost,
        platformFee: initialPricing.platformFee,
        totalAmount: initialCost,
        rawCalculation: `${initialEnergyRequired} kWh × ₹${averagePricePerKWh} + ₹10 = ₹${initialEnergyRequired * averagePricePerKWh + 10}`
      });
      
      // Calculate actual direct distance using Haversine formula for accuracy
      const stationLat = bestInitialStation.location.coordinates[1];
      const stationLng = bestInitialStation.location.coordinates[0];
      const startLat = fromLocation.latitude;
      const startLng = fromLocation.longitude;
      
      // Haversine formula for direct distance
      const R = 6371; // Earth's radius in km
      const dLat = (stationLat - startLat) * Math.PI / 180;
      const dLng = (stationLng - startLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(startLat * Math.PI / 180) * Math.cos(stationLat * Math.PI / 180) *
               Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const stationDistanceKmFloat = R * c; // Direct distance in km
      const stationDistanceKm = stationDistanceKmFloat.toFixed(1);
      
      // Check if station is actually reachable with current range
      if (stationDistanceKmFloat > currentRange) {
        return res.status(400).json({
          success: false,
          message: `Your current battery level (${currentRange.toFixed(1)}km range) is insufficient to reach the nearest charging station (${stationDistanceKm}km away). Please charge your vehicle before starting the trip.`
        });
      }
      
      // Calculate actual arrival time using GraphHopper API
      let actualTravelTimeMinutes = 0;
      let arrivalTime = new Date();
      
      try {
        // Validate coordinates before making API call
        const startLng = parseFloat(fromLocation.longitude);
        const startLat = parseFloat(fromLocation.latitude);
        const stationLng = parseFloat(bestInitialStation.location.coordinates[0]);
        const stationLat = parseFloat(bestInitialStation.location.coordinates[1]);
        
        // Check if coordinates are valid
        if (isNaN(startLng) || isNaN(startLat) || isNaN(stationLng) || isNaN(stationLat)) {
          throw new Error('Invalid coordinates provided');
        }
        
        // Check coordinate bounds
        if (startLng < -180 || startLng > 180 || stationLng < -180 || stationLng > 180) {
          throw new Error('Longitude out of bounds (-180 to 180)');
        }
        if (startLat < -90 || startLat > 90 || stationLat < -90 || stationLat > 90) {
          throw new Error('Latitude out of bounds (-90 to 90)');
        }
        
        // Create route from starting point to initial charging station
        const initialStationRoutePoints = [
          [startLng, startLat],
          [stationLng, stationLat]
        ];
        
        console.log('Initial station GraphHopper API request:', {
          points: initialStationRoutePoints,
          distance: stationDistanceKmFloat.toFixed(2) + 'km'
        });
        
        const initialStationRouteResponse = await axios.post(`${GRAPH_HOPPER_URL}/route`, {
          points: initialStationRoutePoints,
          profile: 'car',
          elevation: true,
          'ch.disable': true,
          custom_model: {
            speed: [
              { if: "average_slope > 8 || average_slope < -8", multiply_by: "0.7" },
              { if: "average_slope > 15 || average_slope < -15", multiply_by: "0.5" },
              { if: "surface == GRAVEL || surface == DIRT || surface == UNPAVED", multiply_by: "0.6" },
              { if: "road_class == TRACK || road_class == PATH", multiply_by: "0.4" },
              { if: "country == NPL", multiply_by: "0.8" }
            ]
          }
        }, {
          params: {
            key: GRAPH_HOPPER_API_KEY
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (initialStationRouteResponse.data?.paths?.[0]) {
          const initialStationRoute = initialStationRouteResponse.data.paths[0];
          actualTravelTimeMinutes = Math.round(initialStationRoute.time / 60000); // Convert ms to minutes
          
          // Apply terrain multiplier for additional safety
          const initialElevationGain = calculateElevationGain(initialStationRoute.points.coordinates || []);
          const initialTerrainDifficulty = assessTerrainDifficulty(initialStationRoute.details || {}, initialElevationGain);
          const initialTerrainMultiplier = calculateTerrainTimeMultiplier(initialTerrainDifficulty, initialElevationGain, initialStationRoute.distance / 1000);
          
          actualTravelTimeMinutes = Math.round(actualTravelTimeMinutes * initialTerrainMultiplier);
          
          console.log('Initial station GraphHopper route calculated:', {
            distance: (initialStationRoute.distance / 1000).toFixed(2) + 'km',
            time: actualTravelTimeMinutes + ' minutes',
            terrainMultiplier: initialTerrainMultiplier.toFixed(2)
          });
        } else {
          throw new Error('No route found in GraphHopper response');
        }
        
        // Use reasonable departure time (current time + 15 minutes for preparation)
        const departureTime = new Date(Date.now() + 15 * 60 * 1000);
        arrivalTime = new Date(departureTime.getTime() + actualTravelTimeMinutes * 60 * 1000);
        
      } catch (error) {
        console.log('Error calculating travel time to initial station, using fallback:', error.message);
        if (error.response) {
          console.log('Initial station GraphHopper API error details:', {
            status: error.response.status,
            data: error.response.data
          });
        }
        // Fallback calculation
        actualTravelTimeMinutes = Math.round((stationDistanceKmFloat / 50) * 60);
        const departureTime = new Date(Date.now() + 15 * 60 * 1000);
        arrivalTime = new Date(departureTime.getTime() + actualTravelTimeMinutes * 60 * 1000);
      }
      
      // Create initial charging session
      initialChargingSession = {
        sessionNumber: 0, // Special session number for initial charge
        station: bestInitialStation,
        coordinate: { 
          lat: bestInitialStation.location.coordinates[1], 
          lng: bestInitialStation.location.coordinates[0] 
        },
        distanceFromStart: stationDistanceKm,
        batteryOnArrival: Math.max(Math.round(initialBatteryOnArrival - (stationDistanceKmFloat / efficiency * 100)), 0),
        batteryAfterCharging: Math.round(initialBatteryAfterCharging),
        energyRequired: Math.round(initialEnergyRequired),
        originalEnergyRequired: originalInitialEnergyRequired,
        chargingTime: initialChargingTime,
        cost: initialCost,
        estimatedArrival: arrivalTime.toISOString(),
        travelTimeToStation: actualTravelTimeMinutes,
        recommendedPort: bestInitialStationResult.availablePort || bestInitialStation.chargingPorts?.[0] || null,
        isInitialCharge: true
      };
      
      // Update battery levels for trip calculation
      adjustedCurrentBattery = initialBatteryAfterCharging;
      adjustedCurrentRange = (efficiency * adjustedCurrentBattery) / 100;
      
             console.log('Initial charging session added:', {
         station: bestInitialStation.name,
         actualDistance: `${stationDistanceKm}km (direct distance)`,
         batteryBefore: initialBatteryOnArrival,
         batteryAfter: initialBatteryAfterCharging,
         estimatedBatteryCapacity: Math.round(estimatedBatteryCapacity * 10) / 10, // kWh
         energyRequired: Math.round(initialEnergyRequired * 10) / 10, // kWh
         chargingSpeed: effectiveChargingSpeed, // kW
         cost: initialCost,
         chargingTime: initialChargingTime,
         recommendedPort: selectedInitialPort ? {
           id: selectedInitialPort._id.toString(),
           portNumber: selectedInitialPort.portNumber,
           pricePerUnit: selectedInitialPort.pricePerUnit
         } : 'NO PORT SELECTED'
       });
    }

    // Build route points including via locations
    const routePoints = [
      [fromLocation.longitude, fromLocation.latitude]
    ];
    
    // Add via points
    viaLocations.forEach(viaLocation => {
      if (viaLocation && viaLocation.longitude && viaLocation.latitude) {
        routePoints.push([viaLocation.longitude, viaLocation.latitude]);
      }
    });
    
    // Add destination
    routePoints.push([toLocation.longitude, toLocation.latitude]);

    console.log('Route points:', routePoints);

    // Enhanced GraphHopper request for Nepal terrain
    const routeResponse = await axios.post(`${GRAPH_HOPPER_URL}/route`, {
      points: routePoints,
      profile: 'car',
      points_encoded: false,
      elevation: true, // Enable elevation data for mountainous terrain
      details: [
        'distance', 
        'time', 
        'average_slope', 
        'max_slope', 
        'road_class', 
        'surface', 
        'country'
      ], // Get detailed path information
      instructions: false,
      'ch.disable': true, // Required for custom model
      custom_model: {
        // Nepal-specific terrain adjustments
        speed: [
          {
            // Reduce speed on steep slopes (>8%)
            if: "average_slope > 8 || average_slope < -8",
            multiply_by: "0.7"
          },
          {
            // Further reduce on very steep slopes (>15%)
            if: "average_slope > 15 || average_slope < -15", 
            multiply_by: "0.5"
          },
          {
            // Reduce speed on unpaved surfaces common in Nepal
            if: "surface == GRAVEL || surface == DIRT || surface == UNPAVED",
            multiply_by: "0.6"
          },
          {
            // Reduce speed on mountain roads and tracks
            if: "road_class == TRACK || road_class == PATH",
            multiply_by: "0.4"
          },
          {
            // Account for Nepal's general road conditions
            if: "country == NPL",
            multiply_by: "0.8"
          }
        ],
        // Adjust for mountain driving preferences  
        distance_influence: 50 // Slightly prefer shorter routes in mountains
      }
    }, {
      params: {
        key: GRAPH_HOPPER_API_KEY
      }
    });

    if (!routeResponse.data.paths || routeResponse.data.paths.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to find route between locations'
      });
    }

    const route = routeResponse.data.paths[0];
    const totalDistance = route.distance / 1000; // Convert to km
    const totalTime = route.time / (1000 * 60); // Convert to minutes
    const routeCoordinates = route.points.coordinates;
    
    // Enhanced route analysis for Nepal terrain
    const pathDetails = route.details || {};
    const elevationGain = calculateElevationGain(routeCoordinates);
    const averageSlope = calculateAverageSlope(pathDetails);
    const terrainDifficulty = assessTerrainDifficulty(pathDetails, elevationGain);
    
    // Apply Nepal-specific time adjustments
    const terrainTimeMultiplier = calculateTerrainTimeMultiplier(terrainDifficulty, elevationGain, totalDistance);
    const adjustedTotalTime = totalTime * terrainTimeMultiplier;

    console.log('Enhanced Route Data:', {
      totalDistance,
      originalTime: totalTime,
      adjustedTotalTime,
      elevationGain,
      averageSlope,
      terrainDifficulty,
      terrainMultiplier: terrainTimeMultiplier,
      coordinatesCount: routeCoordinates.length
    });

    // Check if trip is possible with adjusted battery level (after initial charging if needed)
    const adjustedUsableRange = adjustedCurrentRange - thresholdRange;
    
    console.log('Early return check:', {
      adjustedCurrentRange,
      thresholdRange,
      adjustedUsableRange,
      totalDistance,
      willReturnEarly: adjustedUsableRange >= totalDistance
    });
    
    if (adjustedUsableRange >= totalDistance) {
      // Trip possible without additional charging (or only initial charging)
      const allChargingSessions = initialChargingSession ? [initialChargingSession] : [];
      const totalCost = allChargingSessions.reduce((sum, session) => sum + session.cost, 0);
      const totalChargingTime = allChargingSessions.reduce((sum, session) => sum + session.chargingTime, 0);
      
      return res.json({
        success: true,
        data: {
          id: `trip_${Date.now()}`,
          route: {
            from: fromLocation,
            to: toLocation,
            viaLocations: viaLocations.filter(loc => loc && loc.latitude && loc.longitude)
          },
          totalDistance: totalDistance.toFixed(1),
          totalTime: Math.round(adjustedTotalTime + totalChargingTime),
          travelTime: Math.round(adjustedTotalTime),
          chargingTime: totalChargingTime,
          routeCoordinates: routeCoordinates.map(coord => ({ lat: coord[1], lng: coord[0] })),
          chargingSessions: allChargingSessions,
          totalCost,
          initialBatteryPercent: currentBattery,
          finalBatteryPercentage: Math.round(adjustedCurrentBattery - (totalDistance * 100 / efficiency)),
          hasInitialCharging: !!initialChargingSession,
          message: initialChargingSession 
            ? `Trip plan includes initial charging at ${initialChargingSession.station.name} due to low battery (${currentBattery}%). No additional charging required.`
            : 'No charging required for this trip!'
        }
      });
    }

    // Calculate charging sessions needed using intelligent station-aware planning
    const chargingSessions = [];
    let remainingDistance = totalDistance;
    let currentBatteryLevel = adjustedCurrentBattery;
    let traveledDistance = 0;
    let sessionNumber = initialChargingSession ? 1 : 1;

    // Enhanced algorithm: Look for stations and plan accordingly
    const minSafetyBuffer = 5; // Minimum 5km regardless of threshold
    let maxReachableRange = adjustedCurrentRange - minSafetyBuffer; // Maximum distance we can travel safely

    console.log('Enhanced Trip Planning:', {
      remainingDistance,
      adjustedCurrentRange,
      thresholdRange,
      maxReachableRange,
      minSafetyBuffer,
      willNeedCharging: remainingDistance > maxReachableRange
    });

    while (remainingDistance > maxReachableRange) {
      // Smart station-aware planning: Look for stations within reachable range
      let bestStationInfo = null;
      let searchAttempts = 0;
      const maxSearchAttempts = 5;
      let actualArrivalTime = null;
      let actualTravelTimeToSearchPoint = 0;

      // Try multiple distances to find optimal charging point
      for (let searchDistance = Math.min(maxReachableRange - 10, remainingDistance - 20); 
           searchDistance >= 10 && searchAttempts < maxSearchAttempts; 
           searchDistance -= 15, searchAttempts++) {
        
        const searchTraveledDistance = traveledDistance + searchDistance;
        const searchCoordinate = findCoordinateAtDistance(
          routeCoordinates,
          route.details.distance,
          searchTraveledDistance * 1000
        );

        console.log(`Search attempt ${searchAttempts + 1}: Looking for stations at ${searchDistance}km ahead`);
        
        // Look for stations with expanding radius
        for (let radius = 15; radius <= 40; radius += 10) {
          const stations = await findNearbyChargingStations(searchCoordinate.lat, searchCoordinate.lng, radius);
          
          if (stations.length > 0) {
            // Calculate actual arrival time using GraphHopper API for accurate slot availability checking
            let searchTravelTime = 0;
            let searchArrivalTime = new Date();
            
            try {
              // Calculate travel time to the search point using GraphHopper
              const searchPointLat = searchCoordinate.lat;
              const searchPointLng = searchCoordinate.lng;
              const startLat = fromLocation.latitude;
              const startLng = fromLocation.longitude;
              
              const searchRoutePoints = [
                [startLng, startLat],
                [searchPointLng, searchPointLat]
              ];
              
              const searchRouteResponse = await axios.post(`${GRAPH_HOPPER_URL}/route`, {
                points: searchRoutePoints,
                profile: 'car',
                elevation: true,
                'ch.disable': true,
                custom_model: {
                  speed: [
                    { if: "average_slope > 8 || average_slope < -8", multiply_by: "0.7" },
                    { if: "average_slope > 15 || average_slope < -15", multiply_by: "0.5" },
                    { if: "surface == GRAVEL || surface == DIRT || surface == UNPAVED", multiply_by: "0.6" },
                    { if: "road_class == TRACK || road_class == PATH", multiply_by: "0.4" },
                    { if: "country == NPL", multiply_by: "0.8" }
                  ]
                }
              }, {
                params: {
                  key: GRAPH_HOPPER_API_KEY
                },
                timeout: 10000
              });
              
              if (searchRouteResponse.data?.paths?.[0]) {
                const searchRoute = searchRouteResponse.data.paths[0];
                searchTravelTime = Math.round(searchRoute.time / 60000); // Convert ms to minutes
                
                // Apply terrain multiplier
                const searchElevationGain = calculateElevationGain(searchRoute.points.coordinates || []);
                const searchTerrainDifficulty = assessTerrainDifficulty(searchRoute.details || {}, searchElevationGain);
                const searchTerrainMultiplier = calculateTerrainTimeMultiplier(searchTerrainDifficulty, searchElevationGain, searchRoute.distance / 1000);
                
                searchTravelTime = Math.round(searchTravelTime * searchTerrainMultiplier);
              } else {
                throw new Error('No route found for search point');
              }
              
              const departureTime = new Date(Date.now() + 15 * 60 * 1000);
              searchArrivalTime = new Date(departureTime.getTime() + searchTravelTime * 60 * 1000);
              
            } catch (error) {
              console.log('Error calculating travel time to search point, using fallback:', error.message);
              // Fallback calculation
              searchTravelTime = Math.round((searchDistance / 50) * 60);
              const departureTime = new Date(Date.now() + 15 * 60 * 1000);
              searchArrivalTime = new Date(departureTime.getTime() + searchTravelTime * 60 * 1000);
            }
            
            const estimatedChargingTime = 60; // Assume 1 hour charging
            
            console.log(`Checking slot availability for search point at ${searchDistance}km with arrival time: ${searchArrivalTime.toLocaleString()}`);
            
            const bestStationResult = await selectBestStationWithAvailability(stations, searchArrivalTime.toISOString(), estimatedChargingTime);
            
            if (bestStationResult) {
              const bestStation = bestStationResult.station;
            
            // Calculate actual direct distance from starting point to station using Haversine formula
            const stationLat = bestStation.location.coordinates[1];
            const stationLng = bestStation.location.coordinates[0];
            const startLat = fromLocation.latitude;
            const startLng = fromLocation.longitude;
            
            // Haversine formula for direct distance
            const R = 6371; // Earth's radius in km
            const dLat = (stationLat - startLat) * Math.PI / 180;
            const dLng = (stationLng - startLng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(startLat * Math.PI / 180) * Math.cos(stationLat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const actualDistanceToStation = R * c; // Direct distance in km
            
            if (actualDistanceToStation <= maxReachableRange) {
                console.log(`Station found with available slots: ${bestStation.name}, Direct distance: ${actualDistanceToStation.toFixed(2)}km, Search radius: ${radius}km`);
              bestStationInfo = {
                station: bestStation,
                coordinate: searchCoordinate,
                distanceToStation: actualDistanceToStation,
                searchRadius: radius,
                availablePort: bestStationResult.availablePort
              };
              // Store the arrival time and travel time for this station
              actualArrivalTime = searchArrivalTime;
              actualTravelTimeToSearchPoint = searchTravelTime;
              break;
              }
            }
          }
        }
        
        if (bestStationInfo) break;
      }

      // If no station found within safe range, show appropriate error
      if (!bestStationInfo) {
        return res.status(400).json({
          success: false,
          message: `No charging stations with available slots found within your vehicle's range (${maxReachableRange.toFixed(1)}km). ${
            initialChargingSession 
              ? 'Please ensure your vehicle is charged before starting this trip or try again later when slots become available.' 
              : 'Please charge your vehicle before attempting this trip, choose a route with better charging infrastructure, or try again later when slots become available.'
          }`
        });
      }

      console.log(`Charging Session ${sessionNumber}:`, {
        stationName: bestStationInfo.station.name,
        directDistanceToStation: `${bestStationInfo.distanceToStation.toFixed(2)}km`,
        remainingAfterCharging: remainingDistance - bestStationInfo.distanceToStation,
        searchRadius: bestStationInfo.searchRadius
      });

      // Calculate charging requirements using the found station
      const actualTraveledDistance = traveledDistance + bestStationInfo.distanceToStation;
      const batteryUsedToReachStation = (bestStationInfo.distanceToStation / efficiency) * 100;
      const batteryOnArrival = Math.max(currentBatteryLevel - batteryUsedToReachStation, 0);
      
      // Smart charging: Don't always charge to 100%, optimize based on remaining journey
      const remainingAfterThisStation = remainingDistance - bestStationInfo.distanceToStation;
      const neededForNextLeg = Math.min(remainingAfterThisStation + 30, efficiency); // 30km buffer for next leg
      const optimalChargeTo = Math.min(100, Math.max(80, (neededForNextLeg / efficiency) * 100)); // At least 80%, max 100%
      
      const batteryAfterCharging = optimalChargeTo;
      
      // Calculate realistic energy required using estimated battery capacity
      const assumedEfficiencyPerKWh = 5; // km per kWh (realistic for most EVs)
      const estimatedBatteryCapacity = efficiency / assumedEfficiencyPerKWh; // kWh
      const energyRequired = (batteryAfterCharging - batteryOnArrival) / 100 * estimatedBatteryCapacity;
      const originalEnergyRequired = energyRequired; // Store original value before rounding
      
      // Estimate charging time based on station's actual power output
      const stationPowerOutput = bestStationInfo.station.chargingPorts?.[0]?.powerOutput || 22;
      const effectiveChargingSpeed = Math.min(stationPowerOutput, 50); // Cap at 50kW for safety
      const chargingTime = Math.ceil((energyRequired / effectiveChargingSpeed) * 60); // minutes
      
      // Calculate cost using consistent pricing
      // FIX: Use the same port that was selected for availability, not just the first port
      const selectedPort = bestStationInfo.availablePort;
      const averagePricePerKWh = selectedPort?.pricePerUnit || bestStationInfo.station.chargingPorts?.[0]?.pricePerUnit || 15;
      const stationPricing = calculateConsistentPricing(energyRequired, averagePricePerKWh);
      const cost = stationPricing.totalAmount;
      
      // Debug regular charging session pricing
      console.log(`Charging session ${sessionNumber} pricing:`, {
        stationName: bestStationInfo.station.name,
        selectedPort: selectedPort ? {
          id: selectedPort._id.toString(),
          portNumber: selectedPort.portNumber,
          pricePerUnit: selectedPort.pricePerUnit
        } : 'NO PORT SELECTED',
        energyRequired: energyRequired,
        pricePerUnit: averagePricePerKWh,
        baseCost: stationPricing.baseCost,
        platformFee: stationPricing.platformFee,
        totalAmount: cost,
        rawCalculation: `${energyRequired} kWh × ₹${averagePricePerKWh} + ₹10 = ₹${energyRequired * averagePricePerKWh + 10}`
      });

      // Use the arrival time that was already calculated for slot availability checking
      const estimatedArrival = actualArrivalTime;
      const travelTimeToStationMinutes = actualTravelTimeToSearchPoint;

      chargingSessions.push({
        sessionNumber,
        station: bestStationInfo.station,
        coordinate: bestStationInfo.coordinate,
        distanceFromStart: actualTraveledDistance.toFixed(1),
        batteryOnArrival: Math.round(batteryOnArrival),
        batteryAfterCharging: Math.round(batteryAfterCharging),
        energyRequired: Math.round(energyRequired),
        originalEnergyRequired: originalEnergyRequired,
        chargingTime,
        cost,
        estimatedArrival: estimatedArrival.toISOString(),
        travelTimeToStation: travelTimeToStationMinutes,
        recommendedPort: selectedPort || bestStationInfo.station.chargingPorts?.[0] || null,
        searchInfo: {
          radius: bestStationInfo.searchRadius,
          attempts: searchAttempts + 1
        }
      });
      
      // Debug the charging session that was created
      console.log(`Charging session ${sessionNumber} created with:`, {
        stationName: bestStationInfo.station.name,
        recommendedPort: selectedPort ? {
          id: selectedPort._id.toString(),
          portNumber: selectedPort.portNumber,
          pricePerUnit: selectedPort.pricePerUnit
        } : 'NO PORT SELECTED',
        cost: cost
      });

      // Update for next iteration with the new range calculation
      traveledDistance = actualTraveledDistance;
      remainingDistance -= bestStationInfo.distanceToStation;
      currentBatteryLevel = batteryAfterCharging;
      
      // Recalculate max reachable range with new battery level
      const newCurrentRange = (currentBatteryLevel / 100) * efficiency;
      maxReachableRange = newCurrentRange - minSafetyBuffer;
      
      sessionNumber++;

      // Safety check to prevent infinite loops (increased limit due to smarter planning)
      if (sessionNumber > 8) {
        console.log('Too many charging sessions required, trip may not be feasible');
        return res.status(400).json({
          success: false,
          message: `Trip requires more than 8 charging sessions due to limited charging infrastructure. Total distance: ${totalDistance.toFixed(1)}km, Vehicle range: ${efficiency}km. Consider: 1) Charging vehicle to full before starting, 2) Choosing a route with better charging infrastructure, or 3) Breaking the trip into multiple days.`
        });
      }
    }

    // Calculate final battery percentage with remaining distance
    const finalBatteryUsed = (remainingDistance / efficiency) * 100;
    const finalBatteryPercentage = Math.max(Math.round(currentBatteryLevel - finalBatteryUsed), 0);
    
    console.log('Trip planning completed:', {
      totalChargingSessions: chargingSessions.length,
      finalBatteryPercentage,
      remainingDistanceAfterLastCharge: remainingDistance
    });
    
    // Combine initial charging session with regular sessions if exists
    const allChargingSessions = initialChargingSession 
      ? [initialChargingSession, ...chargingSessions]
      : chargingSessions;
    
    // Calculate total cost (including initial charging if exists)
    const totalCost = allChargingSessions.reduce((sum, session) => sum + session.cost, 0);

    // Add charging time to total trip time (including initial charging if exists)
    const totalChargingTime = allChargingSessions.reduce((sum, session) => sum + session.chargingTime, 0);
    const totalTripTime = adjustedTotalTime + totalChargingTime;

    const tripPlan = {
      id: `trip_${Date.now()}`,
      route: {
        from: fromLocation,
        to: toLocation,
        viaLocations: viaLocations.filter(loc => loc && loc.latitude && loc.longitude)
      },
      totalDistance: totalDistance.toFixed(1),
      totalTime: Math.round(totalTripTime),
      travelTime: Math.round(adjustedTotalTime),
      chargingTime: totalChargingTime,
      routeCoordinates: routeCoordinates.map(coord => ({ lat: coord[1], lng: coord[0] })),
      chargingSessions: allChargingSessions,
      totalCost,
      initialBatteryPercent: currentBattery,
      finalBatteryPercentage: Math.max(0, finalBatteryPercentage),
      vehicleEfficiency: efficiency,
      thresholdPercent: threshold,
      hasInitialCharging: !!initialChargingSession, // Flag to indicate if initial charging was needed
      message: initialChargingSession 
        ? `Trip plan includes initial charging at ${initialChargingSession.station.name} due to low battery (${currentBattery}%).`
        : null
    };

    res.json({
      success: true,
      data: tripPlan
    });

  } catch (error) {
    console.error('Trip planning error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate trip plan',
      error: error.message
    });
  }
});

// Bulk Booking Endpoint
router.post('/bulk-book', protect, async (req, res) => {
  try {
    const { tripPlanId, stationBookings } = req.body;
    const userId = req.user.id;

    if (!tripPlanId || !stationBookings || !Array.isArray(stationBookings)) {
      return res.status(400).json({
        success: false,
        message: 'tripPlanId and stationBookings array are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const bookingResults = [];
    const failedBookings = [];
    let totalAmount = 0;

    for (const [index, booking] of stationBookings.entries()) {
      try {
        const { stationId, portId, timeSlot, estimatedUnits } = booking;
        
        // Debug the incoming booking data
        console.log(`Processing booking ${index + 1}:`, {
          stationId,
          estimatedUnits,
          estimatedUnitsType: typeof estimatedUnits,
          timeSlot
        });

        // Validate booking data
        if (!stationId || !timeSlot || !timeSlot.startTime || !timeSlot.duration) {
          failedBookings.push({
            index,
            error: 'Invalid booking data'
          });
          continue;
        }

        // Get station details
        const station = await ChargingStation.findById(stationId).populate('vendor');
        if (!station) {
          failedBookings.push({
            index,
            error: 'Station not found'
          });
          continue;
        }

        // Find charging port - FIX: Use the same port that was used in trip planning
        let port = null;
        console.log(`Port selection for booking ${index + 1}:`, {
          requestedPortId: portId,
          availablePorts: station.chargingPorts.map(p => ({
            id: p._id.toString(),
            portNumber: p.portNumber,
            pricePerUnit: p.pricePerUnit,
            isOperational: p.isOperational,
            currentStatus: p.currentStatus
          }))
        });
        
        if (portId) {
          port = station.chargingPorts.id(portId);
          console.log(`Found port by ID:`, port ? {
            id: port._id.toString(),
            portNumber: port.portNumber,
            pricePerUnit: port.pricePerUnit
          } : 'NOT FOUND');
        }
        
        // If no specific port ID or port not found, find the first available port
        if (!port) {
          port = station.chargingPorts.find(p => p.isOperational && p.currentStatus === 'available');
          console.log(`Found first available port:`, port ? {
            id: port._id.toString(),
            portNumber: port.portNumber,
            pricePerUnit: port.pricePerUnit
          } : 'NOT FOUND');
        }
        
        // Fallback to first port if no available ports found
        if (!port) {
          port = station.chargingPorts[0];
          console.log(`Using fallback first port:`, port ? {
            id: port._id.toString(),
            portNumber: port.portNumber,
            pricePerUnit: port.pricePerUnit
          } : 'NOT FOUND');
        }
        
        if (!port) {
          failedBookings.push({
            index,
            error: 'Charging port not found'
          });
          continue;
        }
        
        console.log(`Final selected port for booking ${index + 1}:`, {
          id: port._id.toString(),
          portNumber: port.portNumber,
          pricePerUnit: port.pricePerUnit
        });

        // Calculate pricing using consistent pricing function
        // FIX: Use the estimatedUnits from trip plan instead of default 20kWh
        // This ensures pricing consistency between trip planning and booking
        let units = parseFloat(estimatedUnits) || 0;
        if (!units || units <= 0) {
          // Calculate energy based on duration and port power output as fallback
          const durationHours = timeSlot.duration / 60;
          units = Math.round(port.powerOutput * durationHours);
        }
        // Ensure minimum energy requirement
        units = Math.max(units, 5); // Minimum 5 kWh
        
        const bookingPricing = calculateConsistentPricing(units, port.pricePerUnit);
        const totalBookingAmount = bookingPricing.totalAmount;
        const merchantAmount = bookingPricing.baseCost; // Merchant gets base cost only
        
        // Debug pricing calculation
        console.log(`Booking ${index + 1} pricing:`, {
          stationName: station.name,
          estimatedUnitsFromRequest: estimatedUnits,
          calculatedUnits: units,
          pricePerUnit: port.pricePerUnit,
          baseCost: bookingPricing.baseCost,
          platformFee: bookingPricing.platformFee,
          totalAmount: totalBookingAmount,
          rawCalculation: `${units} kWh × ₹${port.pricePerUnit} + ₹10 = ₹${units * port.pricePerUnit + 10}`
        });

        // Generate booking ID
        const bookingId = `TRIP${Date.now()}${index + 1}`;

        // Create booking
        const newBooking = new Booking({
          bookingId,
          user: userId,
          chargingStation: stationId,
          vendor: station.vendor._id,
          chargingPort: {
            portId: port._id,
            portNumber: port.portNumber,
            connectorType: port.connectorType,
            powerOutput: port.powerOutput,
            chargingType: port.chargingType
          },
          vehicle: {
            vehicleNumber: user.defaultVehicle?.vehicleNumber || 'UNKNOWN',
            vehicleType: user.defaultVehicle?.vehicleType || 'car'
          },
          timeSlot: {
            startTime: new Date(timeSlot.startTime),
            endTime: new Date(new Date(timeSlot.startTime).getTime() + timeSlot.duration * 60 * 1000),
            duration: timeSlot.duration
          },
          pricing: {
            pricePerUnit: port.pricePerUnit,
            estimatedUnits: units,
            baseCost: bookingPricing.baseCost,
            taxes: bookingPricing.taxes,
            serviceCharges: 0,
            platformFee: bookingPricing.platformFee,
            merchantAmount,
            totalAmount: totalBookingAmount
          },
          status: 'confirmed', // Auto-confirm for trip bookings
          paymentStatus: 'pending', // Will be processed in bulk
          source: 'trip_ai',
          tripPlanId,
          sessionNumber: index + 1
        });

        await newBooking.save();
        totalAmount += totalBookingAmount;
        
        console.log(`Running total after booking ${index + 1}: ₹${totalAmount}`);
        
        // Validate pricing consistency with trip plan
        if (estimatedUnits && estimatedUnits > 0) {
          const expectedCost = calculateConsistentPricing(estimatedUnits, port.pricePerUnit).totalAmount;
          if (Math.abs(totalBookingAmount - expectedCost) > 1) {
            console.warn(`⚠️ Pricing mismatch for ${station.name}: Expected ₹${expectedCost} (${estimatedUnits}kWh), Actual ₹${totalBookingAmount}`);
          }
        }

        // Schedule booking notifications for each successful booking
        try {
          await bookingScheduler.scheduleBookingNotifications(newBooking);
          console.log(`📅 Scheduled notifications for TripAI booking ${newBooking.bookingId}`);
        } catch (schedulerError) {
          console.error('Scheduler error for TripAI booking:', schedulerError);
          // Don't fail the booking if scheduler fails
        }

        bookingResults.push({
          bookingId,
          stationName: station.name,
          amount: totalBookingAmount,
          startTime: timeSlot.startTime,
          success: true
        });

      } catch (error) {
        console.error(`Booking ${index + 1} failed:`, error);
        failedBookings.push({
          index,
          error: error.message
        });
      }
    }

    // Send confirmation email and SMS
    if (bookingResults.length > 0) {
      try {
        console.log('Sending notifications with totalAmount:', totalAmount);
        await sendTripConfirmationEmail(user, bookingResults, totalAmount, tripPlanId);
        await sendTripConfirmationSMS(user, bookingResults.length, totalAmount);
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the booking if notifications fail
      }
    }

    res.json({
      success: true,
      data: {
        tripPlanId,
        successfulBookings: bookingResults.length,
        failedBookings: failedBookings.length,
        bookings: bookingResults,
        failures: failedBookings,
        totalAmount
      },
      message: `Successfully booked ${bookingResults.length} charging sessions`
    });

  } catch (error) {
    console.error('Bulk booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk booking',
      error: error.message
    });
  }
});

// Helper Functions

// Find coordinate at specific distance along route
function findCoordinateAtDistance(coordinates, segments, targetDistanceMeters) {
  let traveled = 0;

  for (const [from, to, distance] of segments) {
    if (traveled + distance >= targetDistanceMeters) {
      const remaining = targetDistanceMeters - traveled;
      const fraction = remaining / distance;

      const start = coordinates[from];
      const end = coordinates[to];

      const interpolatedLng = start[0] + (end[0] - start[0]) * fraction;
      const interpolatedLat = start[1] + (end[1] - start[1]) * fraction;

      return { lat: interpolatedLat, lng: interpolatedLng };
    }
    traveled += distance;
  }

  // If distance is more than route length, return end coordinate
  const last = coordinates[coordinates.length - 1];
  return { lat: last[1], lng: last[0] };
}

// Find nearby charging stations
async function findNearbyChargingStations(latitude, longitude, radiusKm ) {
  try {
    const stations = await ChargingStation.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000, // Convert to meters
          spherical: true,
          query: {
            isActive: true,
            'chargingPorts.isOperational': true
          }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendor',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $addFields: {
          vendor: { $arrayElemAt: ['$vendorInfo', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          location: 1,
          address: 1,
          chargingPorts: 1,
          amenities: 1,
          rating: 1,
          dockitRecommended: 1,
          isActive: 1,
          isVerified: 1,
          operatingHours: 1,
          vendor: {
            businessName: 1,
            isVerified: 1
          },
          distance: 1
        }
      },
      {
        $limit: 10
      }
    ]);

    console.log(`Found ${stations.length} nearby stations:`, stations.map(s => ({
      name: s.name,
      isActive: s.isActive,
      isVerified: s.isVerified,
      distance: s.distance
    })));

    // Debug: Log first station's complete data structure
    if (stations.length > 0) {
      console.log('First station complete data:', JSON.stringify(stations[0], null, 2));
    }

    return stations;
  } catch (error) {
    console.error('Error finding nearby stations:', error);
    return [];
  }
}

// Check slot availability for a specific station and time frame
async function checkStationSlotAvailability(station, startTime, duration) {
  try {
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    
    // Debug logging to see station data
    console.log(`Checking station: ${station.name}`, {
      isActive: station.isActive,
      isVerified: station.isVerified,
      hasOperatingHours: !!station.operatingHours,
      chargingPortsCount: station.chargingPorts?.length || 0
    });
    
    // 1. Check if station is active and verified
    if (!station.isActive || !station.isVerified) {
      return { available: false, reason: 'Station is not active or verified' };
    }
    
    // 2. Check operating hours for the entire charging duration
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const startDay = dayNames[startDateTime.getDay()];
    const endDay = dayNames[endDateTime.getDay()];
    
    // Debug day calculation
    console.log(`Day calculation for ${station.name}:`, {
      startDateTime: startDateTime.toLocaleString(),
      startDayIndex: startDateTime.getDay(),
      startDay: startDay,
      endDateTime: endDateTime.toLocaleString(),
      endDayIndex: endDateTime.getDay(),
      endDay: endDay,
      spansMultipleDays: startDay !== endDay
    });
    
    // Check if charging spans multiple days
    if (startDay !== endDay) {
      return { available: false, reason: 'Charging session cannot span multiple days' };
    }
    
    const daySchedule = station.operatingHours[startDay];
    console.log(`Day schedule for ${station.name} on ${startDay}:`, daySchedule);
    
    if (!daySchedule) {
      return { available: false, reason: `Station is closed on ${startDay}` };
    }
    
    console.log(`Checking 24-hour status for ${station.name}: is24Hours = ${daySchedule.is24Hours}`);
    
    if (!daySchedule.is24Hours) {
      if (!daySchedule.open || !daySchedule.close) {
        return { available: false, reason: `Station operating hours not set for ${startDay}` };
      }
      
      // Convert times to minutes for comparison
      const [openHour, openMin] = daySchedule.open.split(':').map(Number);
      const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      
      const startTimeMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
      const endTimeMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();
      
      // Debug operating hours check
      console.log(`Operating hours check for ${station.name}:`, {
        day: startDay,
        is24Hours: daySchedule.is24Hours,
        openTime: `${daySchedule.open} (${openTime} minutes)`,
        closeTime: `${daySchedule.close} (${closeTime} minutes)`,
        startTime: `${startDateTime.getHours()}:${startDateTime.getMinutes()} (${startTimeMinutes} minutes)`,
        endTime: `${endDateTime.getHours()}:${endDateTime.getMinutes()} (${endTimeMinutes} minutes)`,
        startTimeValid: startTimeMinutes >= openTime,
        endTimeValid: endTimeMinutes <= closeTime
      });
      
      // Check if charging session is within operating hours
      if (startTimeMinutes < openTime || endTimeMinutes > closeTime) {
        console.log(`Operating hours check FAILED for ${station.name}: startTime (${startTimeMinutes}) < openTime (${openTime}) OR endTime (${endTimeMinutes}) > closeTime (${closeTime})`);
        return { 
          available: false, 
          reason: `Station operating hours: ${daySchedule.open} - ${daySchedule.close} on ${startDay}` 
        };
      }
      
      console.log(`Operating hours check PASSED for ${station.name}: session is within operating hours`);
    }
    
    // 3. Check each port for availability and conflicts
    console.log(`Checking ports for ${station.name}:`, station.chargingPorts.map(p => ({
      portNumber: p.portNumber,
      isOperational: p.isOperational,
      currentStatus: p.currentStatus
    })));
    
    for (const port of station.chargingPorts) {
      if (!port.isOperational || port.currentStatus !== 'available') {
        console.log(`Skipping port ${port.portNumber} for ${station.name}: isOperational=${port.isOperational}, currentStatus=${port.currentStatus}`);
        continue;
      }
      
      // Check for conflicting bookings
      console.log(`Checking booking conflicts for port ${port.portNumber} at ${station.name} from ${startDateTime.toLocaleString()} to ${endDateTime.toLocaleString()}`);
      
      const conflictingBooking = await Booking.findOne({
        chargingStation: station._id,
        'chargingPort.portId': port._id,
        status: { $in: ['confirmed', 'active'] },
        $or: [
          {
            'timeSlot.startTime': { $lt: endDateTime },
            'timeSlot.endTime': { $gt: startDateTime }
          }
        ]
      });
      
      if (!conflictingBooking) {
        console.log(`Port ${port.portNumber} at ${station.name} is AVAILABLE - no conflicting bookings found`);
        return {
          available: true,
          port: port,
          startTime: startDateTime,
          endTime: endDateTime,
          operatingHours: `${daySchedule.open} - ${daySchedule.close}`,
          day: startDay
        };
      } else {
        console.log(`Port ${port.portNumber} at ${station.name} has CONFLICTING BOOKING:`, conflictingBooking.bookingId);
      }
    }
    
    console.log(`No available ports found for ${station.name} - all operational ports are booked for this time slot`);
    return { available: false, reason: 'All operational ports are booked for this time slot' };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return { available: false, reason: 'Error checking availability' };
  }
}

// Filter stations by slot availability and select the best one
async function selectBestStationWithAvailability(stations, startTime, duration) {
  if (!stations || stations.length === 0) {
    return null;
  }
  
  console.log(`Checking slot availability for ${stations.length} stations at ${new Date(startTime).toLocaleString()} for ${duration} minutes`);
  
  // Check slot availability for each station
  const availabilityResults = await Promise.all(
    stations.map(async (station) => {
      const availability = await checkStationSlotAvailability(station, startTime, duration);
      return {
        station,
        availability
      };
    })
  );
  
  // Log detailed availability results
  availabilityResults.forEach((result, index) => {
    if (result.availability.available) {
      console.log(`✓ Station ${index + 1}: ${result.station.name} - Available (${result.availability.operatingHours} on ${result.availability.day})`);
    } else {
      console.log(`✗ Station ${index + 1}: ${result.station.name} - ${result.availability.reason}`);
    }
  });
  
  // Filter to only stations with available slots
  const availableStations = availabilityResults.filter(result => result.availability.available);
  
  console.log(`Found ${availableStations.length} stations with available slots out of ${stations.length} total stations`);
  
  if (availableStations.length === 0) {
    console.log('No stations have available slots for the requested time');
    return null;
  }
  
  // Sort by priority: 1) Dockit Recommended, 2) Rating, 3) Distance
  const sortedStations = availableStations.sort((a, b) => {
    // First priority: Dockit recommended
    if (a.station.dockitRecommended !== b.station.dockitRecommended) {
      return b.station.dockitRecommended ? 1 : -1;
    }
    
    // Second priority: Rating
    const aRating = a.station.rating?.average || 0;
    const bRating = b.station.rating?.average || 0;
    if (aRating !== bRating) return bRating - aRating;
    
    // Third priority: Distance (closer is better)
    return a.station.distance - b.station.distance;
  });
  
  const bestStation = sortedStations[0];
  console.log(`Selected station: ${bestStation.station.name} (Dockit: ${bestStation.station.dockitRecommended}, Rating: ${bestStation.station.rating?.average || 'N/A'}, Distance: ${bestStation.station.distance.toFixed(1)}km)`);
  
  return {
    station: bestStation.station,
    availablePort: bestStation.availability.port,
    startTime: bestStation.availability.startTime,
    endTime: bestStation.availability.endTime
  };
}

// Legacy function for backward compatibility (deprecated)
function selectBestStation(stations) {
  // Priority: 1) Availability, 2) Dockit Recommended, 3) Rating, 4) Distance
  return stations.sort((a, b) => {
    // Check availability (simplified - in real implementation, check actual slot availability)
    const aAvailable = a.chargingPorts?.some(port => port.currentStatus === 'available') ? 1 : 0;
    const bAvailable = b.chargingPorts?.some(port => port.currentStatus === 'available') ? 1 : 0;
    
    if (aAvailable !== bAvailable) return bAvailable - aAvailable;
    
    // Check if Dockit recommended
    if (a.dockitRecommended !== b.dockitRecommended) {
      return b.dockitRecommended ? 1 : -1;
    }
    
    // Check rating
    const aRating = a.rating?.average || 0;
    const bRating = b.rating?.average || 0;
    if (aRating !== bRating) return bRating - aRating;
    
    // Check distance (closer is better)
    return a.distance - b.distance;
  })[0];
}

// Send trip confirmation email
async function sendTripConfirmationEmail(user, bookings, totalAmount, tripPlanId) {
  const subject = 'Trip AI Booking Confirmation - Your Charging Stations are Reserved!';
  
  let bookingsList = bookings.map((booking, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${booking.stationName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(booking.startTime).toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">₹${booking.amount}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🚗⚡ Trip AI Booking Confirmed!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your intelligent charging plan is ready</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">Hello ${user.name}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Great news! Your AI-powered trip has been successfully planned and all charging stations have been reserved. 
          Our intelligent algorithm has optimized your route for the best charging experience.
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #1f2937;">Charging Session Details</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: #8b5cf6; color: white;">
              <th style="padding: 12px; text-align: left;">Stop #</th>
              <th style="padding: 12px; text-align: left;">Station</th>
              <th style="padding: 12px; text-align: left;">Time</th>
              <th style="padding: 12px; text-align: left;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${bookingsList}
          </tbody>
        </table>
      </div>

      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Total Trip Cost: ₹${totalAmount.toLocaleString()}</h3>
        <p style="margin-bottom: 0; opacity: 0.9;">All ${bookings.length} charging sessions included</p>
      </div>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h4 style="color: #92400e; margin-top: 0;">📱 Important Reminders:</h4>
        <ul style="color: #92400e; margin-bottom: 0;">
          <li>Arrive at each station on time for your reserved slot</li>
          <li>Payment will be processed at each station</li>
          <li>Cancel at least 1 hour before if plans change</li>
          <li>Contact station directly for any issues</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/my-bookings" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Bookings</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>Happy Charging! 🔋</p>
        <p>Team Dockit & Dally Tech</p>
      </div>
    </div>
  `;

  // Use the correct EmailService format
  await sendEmail({
    to: user.email,
    subject: subject,
    htmlBody: html,
    data: { userName: user.name }
  });
}

// Send trip confirmation SMS
async function sendTripConfirmationSMS(user, sessionCount, totalAmount) {
  // Check if user has a phone number and SMS service is configured
  if (!user.phoneNumber) {
    console.log('No phone number provided for user, skipping SMS');
    return;
  }
  
  if (!process.env.AKASHSMS_API_URL || !process.env.AKASHSMS_API_KEY) {
    console.log('SMS service not configured, skipping SMS notification');
    return;
  }
  
  const message = `🚗⚡ Trip AI Success! ${sessionCount} charging stations booked for ₹${totalAmount}. Check email for details. Safe travels! - Dockit`;
  
  try {
    const result = await smsService.sendSMS(user.phoneNumber, message);
    if (result.success) {
      console.log('Trip confirmation SMS sent successfully');
    } else {
      console.error('Failed to send trip confirmation SMS:', result.error);
    }
  } catch (error) {
    console.error('Error sending trip confirmation SMS:', error);
  }
}

// Nepal Terrain Analysis Helper Functions

// Calculate elevation gain from route coordinates
function calculateElevationGain(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let totalGain = 0;
  let totalLoss = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const prevElevation = coordinates[i-1][2] || 0;
    const currentElevation = coordinates[i][2] || 0;
    const diff = currentElevation - prevElevation;
    
    if (diff > 0) {
      totalGain += diff;
    } else {
      totalLoss += Math.abs(diff);
    }
  }
  
  return {
    gain: Math.round(totalGain),
    loss: Math.round(totalLoss),
    net: Math.round(totalGain - totalLoss)
  };
}

// Calculate average slope from path details
function calculateAverageSlope(pathDetails) {
  if (!pathDetails.average_slope) return 0;
  
  const slopes = pathDetails.average_slope;
  const validSlopes = slopes.filter(slope => slope !== null && !isNaN(slope));
  
  if (validSlopes.length === 0) return 0;
  
  const sum = validSlopes.reduce((acc, slope) => acc + Math.abs(slope), 0);
  return Math.round(sum / validSlopes.length * 100) / 100; // Round to 2 decimals
}

// Assess terrain difficulty based on various factors
function assessTerrainDifficulty(pathDetails, elevationGain) {
  let difficulty = 'easy';
  let score = 0;
  
  // Elevation gain factor
  if (elevationGain.gain > 500) score += 2;
  else if (elevationGain.gain > 200) score += 1;
  
  // Road class factor
  const roadClasses = pathDetails.road_class || [];
  const difficultRoads = roadClasses.filter(road => 
    road === 'TRACK' || road === 'PATH' || road === 'UNCLASSIFIED'
  );
  if (difficultRoads.length > roadClasses.length * 0.3) score += 2;
  
  // Surface factor
  const surfaces = pathDetails.surface || [];
  const roughSurfaces = surfaces.filter(surface => 
    surface === 'GRAVEL' || surface === 'DIRT' || surface === 'UNPAVED'
  );
  if (roughSurfaces.length > surfaces.length * 0.2) score += 1;
  
  // Slope factor
  const slopes = pathDetails.average_slope || [];
  const steepSlopes = slopes.filter(slope => Math.abs(slope) > 10);
  if (steepSlopes.length > slopes.length * 0.2) score += 2;
  
  if (score >= 4) difficulty = 'hard';
  else if (score >= 2) difficulty = 'moderate';
  
  return { difficulty, score };
}

// Calculate terrain-based time multiplier for Nepal
function calculateTerrainTimeMultiplier(terrainDifficulty, elevationGain, distance) {
  let multiplier = 1.0;
  
  // Base Nepal road condition multiplier
  multiplier *= 1.15; // 15% slower than ideal conditions
  
  // Terrain difficulty multiplier
  switch (terrainDifficulty.difficulty) {
    case 'hard':
      multiplier *= 1.4; // 40% slower
      break;
    case 'moderate':
      multiplier *= 1.2; // 20% slower
      break;
    case 'easy':
      multiplier *= 1.05; // 5% slower
      break;
  }
  
  // Elevation gain multiplier (more pronounced for shorter distances)
  const elevationFactor = elevationGain.gain / distance; // meters per km
  if (elevationFactor > 50) {
    multiplier *= 1.3; // Very mountainous
  } else if (elevationFactor > 25) {
    multiplier *= 1.15; // Moderately mountainous
  } else if (elevationFactor > 10) {
    multiplier *= 1.08; // Slightly hilly
  }
  
  // Cap the multiplier to reasonable bounds
  return Math.max(1.0, Math.min(multiplier, 2.5));
}

module.exports = router; 