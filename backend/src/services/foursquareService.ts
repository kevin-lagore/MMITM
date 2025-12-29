import axios from 'axios';
import { env } from '../config/env.js';
import type { LatLng, Venue } from '../types/index.js';

const FOURSQUARE_BASE_URL = 'https://api.foursquare.com/v3';

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    formatted_address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
  };
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  rating?: number;
  distance?: number;
}

export interface PlaceSearchOptions {
  center: LatLng;
  radiusMeters: number;
  categoryId?: string;
  query?: string;
  limit?: number;
}

/**
 * Search for places near a location
 */
export async function searchPlaces(options: PlaceSearchOptions): Promise<Venue[]> {
  const { center, radiusMeters, categoryId, query, limit = 20 } = options;

  try {
    const params: Record<string, string | number> = {
      ll: `${center.lat},${center.lng}`,
      radius: Math.min(radiusMeters, 100000), // Max 100km
      limit,
      sort: 'RELEVANCE',
    };

    if (categoryId) {
      params.categories = categoryId;
    }

    if (query) {
      params.query = query;
    }

    const response = await axios.get<{ results: FoursquarePlace[] }>(
      `${FOURSQUARE_BASE_URL}/places/search`,
      {
        params,
        headers: {
          'Authorization': env.foursquareApiKey,
          'Accept': 'application/json',
        },
      }
    );

    return response.data.results.map(place => ({
      id: place.fsq_id,
      name: place.name,
      address: place.location.formatted_address ||
               place.location.address ||
               [place.location.locality, place.location.region].filter(Boolean).join(', ') ||
               'Address not available',
      location: {
        lat: place.geocodes.main.latitude,
        lng: place.geocodes.main.longitude,
      },
      category: place.categories[0]?.name || 'Unknown',
      rating: place.rating,
      distance: place.distance,
    }));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Foursquare API failed: ${message}`);
    }
    throw error;
  }
}

/**
 * Get details for a specific place
 */
export async function getPlaceDetails(placeId: string): Promise<Venue | null> {
  try {
    const response = await axios.get<FoursquarePlace>(
      `${FOURSQUARE_BASE_URL}/places/${placeId}`,
      {
        headers: {
          'Authorization': env.foursquareApiKey,
          'Accept': 'application/json',
        },
      }
    );

    const place = response.data;
    return {
      id: place.fsq_id,
      name: place.name,
      address: place.location.formatted_address ||
               place.location.address ||
               'Address not available',
      location: {
        lat: place.geocodes.main.latitude,
        lng: place.geocodes.main.longitude,
      },
      category: place.categories[0]?.name || 'Unknown',
      rating: place.rating,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Search with a text query (useful for specific venue types)
 */
export async function searchByQuery(
  center: LatLng,
  query: string,
  radiusMeters: number = 5000,
  limit: number = 20
): Promise<Venue[]> {
  return searchPlaces({
    center,
    radiusMeters,
    query,
    limit,
  });
}
