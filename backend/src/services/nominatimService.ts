import axios from 'axios';
import type { LatLng } from '../types/index.js';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, { lat: number; lng: number; displayName: string }>();

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // Check cache first
  const cacheKey = address.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  await waitForRateLimit();

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MMITM/1.0 (Meet in the Middle App)',
      },
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`Could not geocode address: ${address}`);
    }

    const result = response.data[0];
    const geocoded: GeocodeResult = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };

    // Cache the result
    geocodeCache.set(cacheKey, geocoded);

    return geocoded;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
    throw error;
  }
}

export async function reverseGeocode(location: LatLng): Promise<string> {
  await waitForRateLimit();

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: location.lat,
        lon: location.lng,
        format: 'json',
      },
      headers: {
        'User-Agent': 'MMITM/1.0 (Meet in the Middle App)',
      },
    });

    return response.data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return 'Unknown location';
  }
}
