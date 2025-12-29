// Transport modes supported by the application
export type TransportMode = 'driving' | 'walking' | 'cycling' | 'transit';

// Geographic coordinates
export interface LatLng {
  lat: number;
  lng: number;
}

// Participant input from client
export interface ParticipantInput {
  name: string;
  address: string;
  transportMode: TransportMode;
}

// Geocoded participant with coordinates
export interface Participant extends ParticipantInput {
  location: LatLng;
}

// Travel time result for a single participant to a destination
export interface TravelTimeResult {
  participantName: string;
  durationSeconds: number;
  distanceMeters: number;
  transportMode: TransportMode;
}

// Venue from place search
export interface Venue {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  category: string;
  rating?: number;
  distance?: number;
}

// Ranked venue with travel time analysis
export interface RankedVenue extends Venue {
  travelTimes: TravelTimeResult[];
  varianceScore: number;
  totalTimeSeconds: number;
  maxTimeSeconds: number;
  fairnessScore: number;
  explanation: string;
}

// Interpreted intent from OpenAI
export interface InterpretedIntent {
  category: string;
  subcategory?: string;
  keywords: string[];
  foursquareCategory?: string;
}

// API Request/Response types
export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  displayName: string;
}

export interface InterpretRequest {
  intent: string;
}

export interface InterpretResponse extends InterpretedIntent {}

export interface FindMiddleRequest {
  participants: ParticipantInput[];
  intent: string;
}

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

// Candidate point for algorithm
export interface CandidatePoint {
  location: LatLng;
  travelTimes: number[];
  variance: number;
  totalTime: number;
  maxTime: number;
  meanTime: number;
  fairnessScore: number;
}

// API Error response
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
