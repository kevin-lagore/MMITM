import axios from 'axios';
import { env } from '../config/env.js';
import type { LatLng, TransportMode } from '../types/index.js';

const ORS_BASE_URL = 'https://api.openrouteservice.org';

// Map our transport modes to ORS profiles
function getOrsProfile(mode: TransportMode): string {
  switch (mode) {
    case 'driving':
      return 'driving-car';
    case 'walking':
      return 'foot-walking';
    case 'cycling':
      return 'cycling-regular';
    case 'transit':
      // ORS doesn't support transit, this should be handled by Google Maps
      return 'driving-car';
    default:
      return 'driving-car';
  }
}

export interface MatrixResult {
  durations: number[][]; // seconds
  distances: number[][]; // meters
}

/**
 * Compute travel time/distance matrix from sources to destinations
 * Sources are participant locations, destinations are candidate points
 */
export async function computeMatrix(
  sources: LatLng[],
  destinations: LatLng[],
  mode: TransportMode
): Promise<MatrixResult> {
  const profile = getOrsProfile(mode);

  // ORS expects [lng, lat] format
  const locations = [
    ...sources.map(s => [s.lng, s.lat]),
    ...destinations.map(d => [d.lng, d.lat]),
  ];

  const sourceIndices = sources.map((_, i) => i);
  const destinationIndices = destinations.map((_, i) => sources.length + i);

  try {
    const response = await axios.post(
      `${ORS_BASE_URL}/v2/matrix/${profile}`,
      {
        locations,
        sources: sourceIndices,
        destinations: destinationIndices,
        metrics: ['duration', 'distance'],
      },
      {
        headers: {
          'Authorization': env.orsApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      durations: response.data.durations,
      distances: response.data.distances,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`ORS Matrix API failed: ${message}`);
    }
    throw error;
  }
}

export interface DirectionsResult {
  durationSeconds: number;
  distanceMeters: number;
  geometry?: string; // Encoded polyline
}

/**
 * Get directions between two points
 */
export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  mode: TransportMode
): Promise<DirectionsResult> {
  const profile = getOrsProfile(mode);

  try {
    const response = await axios.post(
      `${ORS_BASE_URL}/v2/directions/${profile}`,
      {
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat],
        ],
      },
      {
        headers: {
          'Authorization': env.orsApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const route = response.data.routes[0];
    return {
      durationSeconds: route.summary.duration,
      distanceMeters: route.summary.distance,
      geometry: route.geometry,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`ORS Directions API failed: ${message}`);
    }
    throw error;
  }
}

// GeoJSON Polygon type (simplified)
interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface IsochroneResult {
  geometry: GeoJSONPolygon;
  center: LatLng;
  range: number; // seconds
}

/**
 * Generate isochrone (area reachable within a time limit)
 */
export async function getIsochrone(
  center: LatLng,
  rangeSeconds: number,
  mode: TransportMode
): Promise<IsochroneResult> {
  const profile = getOrsProfile(mode);

  try {
    const response = await axios.post(
      `${ORS_BASE_URL}/v2/isochrones/${profile}`,
      {
        locations: [[center.lng, center.lat]],
        range: [rangeSeconds],
        range_type: 'time',
      },
      {
        headers: {
          'Authorization': env.orsApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const feature = response.data.features[0];
    return {
      geometry: feature.geometry,
      center,
      range: rangeSeconds,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`ORS Isochrone API failed: ${message}`);
    }
    throw error;
  }
}
