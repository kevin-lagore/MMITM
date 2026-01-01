import axios from 'axios';
import type { ParticipantInput, FindMiddleResponse } from '../types';

// Remove trailing slash if present
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GeocodeResponse {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResponse> {
  const response = await api.post<GeocodeResponse>('/geocode', { address });
  return response.data;
}

export interface InterpretResponse {
  category: string;
  subcategory?: string;
  keywords: string[];
}

export async function interpretIntent(intent: string): Promise<InterpretResponse> {
  const response = await api.post<InterpretResponse>('/interpret', { intent });
  return response.data;
}

export async function findMiddle(
  participants: ParticipantInput[],
  intent: string
): Promise<FindMiddleResponse> {
  const response = await api.post<FindMiddleResponse>('/find-middle', {
    participants: participants.map(p => ({
      name: p.name,
      address: p.address,
      transportMode: p.transportMode,
    })),
    intent,
  });
  return response.data;
}

// Map deep link generators
export const mapLinks = {
  googleMaps: (lat: number, lng: number, name: string) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`,

  googleMapsDirections: (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,

  appleMaps: (lat: number, lng: number, name: string) =>
    `https://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`,

  waze: (lat: number, lng: number) =>
    `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,

  openStreetMap: (lat: number, lng: number) =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`,
};
