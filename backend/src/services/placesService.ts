import axios from 'axios';
import { env } from '../config/env.js';
import type { LatLng, Venue } from '../types/index.js';

const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceSearchOptions {
  center: LatLng;
  radiusMeters: number;
  type?: string;
  keyword?: string;
  limit?: number;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
}

// Map our categories to Google Places types
const CATEGORY_TO_GOOGLE_TYPE: Record<string, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  coffee: 'cafe',
  bar: 'bar',
  pub: 'bar',
  park: 'park',
  beach: 'natural_feature',
  museum: 'museum',
  library: 'library',
  gym: 'gym',
  shopping: 'shopping_mall',
  entertainment: 'movie_theater',
  cinema: 'movie_theater',
  theater: 'movie_theater',
  food: 'restaurant',
  outdoors: 'park',
};

export function getGooglePlaceType(category: string): string {
  return CATEGORY_TO_GOOGLE_TYPE[category.toLowerCase()] || 'restaurant';
}

/**
 * Search for places using Google Places Nearby Search
 */
export async function searchPlaces(options: PlaceSearchOptions): Promise<Venue[]> {
  const { center, radiusMeters, type, keyword, limit = 20 } = options;

  try {
    const params: Record<string, string | number> = {
      location: `${center.lat},${center.lng}`,
      radius: Math.min(radiusMeters, 50000), // Max 50km for Google
      key: env.googleMapsApiKey,
    };

    if (type) {
      params.type = type;
    }

    if (keyword) {
      params.keyword = keyword;
    }

    const response = await axios.get<{ results: GooglePlace[]; status: string }>(
      `${GOOGLE_PLACES_URL}/nearbysearch/json`,
      { params }
    );

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    const places = response.data.results.slice(0, limit);

    return places.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || 'Address not available',
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      category: formatPlaceType(place.types[0]),
      rating: place.rating,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Google Places API failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Text search for places (more flexible than nearby search)
 */
export async function textSearchPlaces(
  query: string,
  center: LatLng,
  radiusMeters: number = 5000,
  limit: number = 20
): Promise<Venue[]> {
  try {
    const response = await axios.get<{ results: GooglePlace[]; status: string }>(
      `${GOOGLE_PLACES_URL}/textsearch/json`,
      {
        params: {
          query,
          location: `${center.lat},${center.lng}`,
          radius: radiusMeters,
          key: env.googleMapsApiKey,
        },
      }
    );

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    return response.data.results.slice(0, limit).map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || 'Address not available',
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      category: formatPlaceType(place.types[0]),
      rating: place.rating,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error_message || error.message;
      throw new Error(`Google Places API failed: ${message}`);
    }
    throw error;
  }
}

function formatPlaceType(type: string): string {
  if (!type) return 'Place';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
