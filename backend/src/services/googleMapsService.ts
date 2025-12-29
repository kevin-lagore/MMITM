import axios from 'axios';
import { env } from '../config/env.js';
import type { LatLng } from '../types/index.js';

const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

export interface TransitDirectionsResult {
  durationSeconds: number;
  distanceMeters: number;
  departureTime?: string;
  arrivalTime?: string;
  transitDetails?: {
    line: string;
    vehicle: string;
    numStops: number;
  }[];
}

/**
 * Get transit directions using Google Maps Directions API
 * Used only for public transit since ORS doesn't support it
 */
export async function getTransitDirections(
  origin: LatLng,
  destination: LatLng
): Promise<TransitDirectionsResult> {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/directions/json`, {
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: 'transit',
        key: env.googleMapsApiKey,
        departure_time: 'now',
      },
    });

    if (response.data.status !== 'OK') {
      // If no transit route found, return a fallback estimate
      if (response.data.status === 'ZERO_RESULTS') {
        return {
          durationSeconds: -1, // Indicates no route found
          distanceMeters: -1,
        };
      }
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    // Extract transit details if available
    const transitDetails: TransitDirectionsResult['transitDetails'] = [];
    for (const step of leg.steps) {
      if (step.transit_details) {
        transitDetails.push({
          line: step.transit_details.line.short_name || step.transit_details.line.name,
          vehicle: step.transit_details.line.vehicle.type,
          numStops: step.transit_details.num_stops,
        });
      }
    }

    return {
      durationSeconds: leg.duration.value,
      distanceMeters: leg.distance.value,
      departureTime: leg.departure_time?.text,
      arrivalTime: leg.arrival_time?.text,
      transitDetails: transitDetails.length > 0 ? transitDetails : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Google Maps API failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get transit travel times from multiple origins to a single destination
 * More efficient than multiple individual requests using Distance Matrix API
 */
export async function getTransitMatrix(
  origins: LatLng[],
  destinations: LatLng[]
): Promise<{ durations: number[][]; distances: number[][] }> {
  // Google Distance Matrix has a limit of 25 origins or 25 destinations per request
  // and 100 elements (origins * destinations) per request
  const maxElements = 100;
  const maxOriginsPerRequest = Math.min(25, Math.floor(maxElements / destinations.length));

  const allDurations: number[][] = [];
  const allDistances: number[][] = [];

  // Process in batches if needed
  for (let i = 0; i < origins.length; i += maxOriginsPerRequest) {
    const batchOrigins = origins.slice(i, i + maxOriginsPerRequest);

    try {
      const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/distancematrix/json`, {
        params: {
          origins: batchOrigins.map(o => `${o.lat},${o.lng}`).join('|'),
          destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|'),
          mode: 'transit',
          key: env.googleMapsApiKey,
          departure_time: 'now',
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Distance Matrix API error: ${response.data.status}`);
      }

      for (const row of response.data.rows) {
        const durations: number[] = [];
        const distances: number[] = [];

        for (const element of row.elements) {
          if (element.status === 'OK') {
            durations.push(element.duration.value);
            distances.push(element.distance.value);
          } else {
            // No route found, use -1 as indicator
            durations.push(-1);
            distances.push(-1);
          }
        }

        allDurations.push(durations);
        allDistances.push(distances);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google Distance Matrix API failed: ${error.message}`);
      }
      throw error;
    }
  }

  return {
    durations: allDurations,
    distances: allDistances,
  };
}
