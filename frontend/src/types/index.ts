// Transport modes
export type TransportMode = 'driving' | 'walking' | 'cycling' | 'transit';

// Geographic coordinates
export interface LatLng {
  lat: number;
  lng: number;
}

// Participant input
export interface ParticipantInput {
  id: string;
  name: string;
  address: string;
  transportMode: TransportMode;
}

// Travel time result
export interface TravelTimeResult {
  participantName: string;
  durationSeconds: number;
  distanceMeters: number;
  transportMode: TransportMode;
}

// Venue with ranking
export interface RankedVenue {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  category: string;
  rating?: number;
  travelTimes: TravelTimeResult[];
  varianceScore: number;
  totalTimeSeconds: number;
  maxTimeSeconds: number;
  fairnessScore: number;
  explanation: string;
}

// API Response
export interface FindMiddleResponse {
  recommendedVenues: RankedVenue[];
  searchArea: {
    center: LatLng;
    radiusMeters: number;
  };
  participantLocations: {
    name: string;
    location: LatLng;
  }[];
}

// App state
export type AppStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AppState {
  participants: ParticipantInput[];
  intent: string;
  status: AppStatus;
  error: string | null;
  result: FindMiddleResponse | null;
  selectedVenueId: string | null;
}
