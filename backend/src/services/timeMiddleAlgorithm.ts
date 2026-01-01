import type {
  LatLng,
  Participant,
  CandidatePoint,
  Venue,
  RankedVenue,
  TravelTimeResult,
  TransportMode,
  InterpretedIntent,
} from '../types/index.js';
import * as ors from './openRouteService.js';
import * as google from './googleMapsService.js';
import * as places from './placesService.js';

// Configuration
const GRID_SIZE = 5; // 5x5 grid = 25 candidate points
const COARSE_RADIUS_KM = 20; // Coarse pass search radius
const FINE_RADIUS_KM = 3; // Fine pass search radius (refinement around best coarse candidates)
const VENUE_SEARCH_RADIUS_METERS = 3000; // Search venues within 3km of best point
const MAX_VENUES = 10; // Return top 10 venues

// Weights for scoring
const WEIGHTS = {
  fairness: 0.5, // Minimize variance in travel times
  totalTime: 0.3, // Minimize total travel time
  maxTime: 0.2, // Minimize maximum individual travel time
};

/**
 * Compute the geographic centroid of all participant locations
 */
export function computeCentroid(participants: Participant[]): LatLng {
  const sumLat = participants.reduce((sum, p) => sum + p.location.lat, 0);
  const sumLng = participants.reduce((sum, p) => sum + p.location.lng, 0);
  return {
    lat: sumLat / participants.length,
    lng: sumLng / participants.length,
  };
}

/**
 * Generate a grid of candidate points around a center
 */
export function generateCandidateGrid(
  center: LatLng,
  radiusKm: number,
  gridSize: number
): LatLng[] {
  const candidates: LatLng[] = [center]; // Include center as first candidate
  const stepKm = (2 * radiusKm) / gridSize;

  for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
    for (let j = -Math.floor(gridSize / 2); j <= Math.floor(gridSize / 2); j++) {
      if (i === 0 && j === 0) continue; // Skip center, already added

      // Convert km offset to lat/lng
      // ~111km per degree of latitude
      // ~111km * cos(lat) per degree of longitude
      const latOffset = (i * stepKm) / 111;
      const lngOffset = (j * stepKm) / (111 * Math.cos(center.lat * Math.PI / 180));

      candidates.push({
        lat: center.lat + latOffset,
        lng: center.lng + lngOffset,
      });
    }
  }

  return candidates;
}

/**
 * Compute travel times from all participants to all candidates
 * Groups participants by transport mode for efficient API calls
 */
async function computeTravelTimes(
  participants: Participant[],
  candidates: LatLng[]
): Promise<Map<string, number[]>> {
  // Map: participantName -> array of travel times (seconds) to each candidate
  const travelTimes = new Map<string, number[]>();

  // Group participants by transport mode
  const byMode = new Map<TransportMode, Participant[]>();
  for (const p of participants) {
    const group = byMode.get(p.transportMode) || [];
    group.push(p);
    byMode.set(p.transportMode, group);
  }

  // Process each transport mode group
  for (const [mode, group] of byMode.entries()) {
    const sources = group.map(p => p.location);

    let durations: number[][];

    if (mode === 'transit') {
      // Use Google Maps for transit
      const result = await google.getTransitMatrix(sources, candidates);
      durations = result.durations;
    } else {
      // Use ORS for other modes
      const result = await ors.computeMatrix(sources, candidates, mode);
      durations = result.durations;
    }

    // Store results by participant name
    for (let i = 0; i < group.length; i++) {
      const times = durations[i].map(d => {
        // Handle missing routes (-1 or null)
        if (d < 0 || d === null) {
          return Infinity; // No route available
        }
        return d;
      });
      travelTimes.set(group[i].name, times);
    }
  }

  return travelTimes;
}

/**
 * Score each candidate point based on travel time fairness
 */
function scoreCandidates(
  candidates: LatLng[],
  travelTimes: Map<string, number[]>,
  participantNames: string[]
): CandidatePoint[] {
  const results: CandidatePoint[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const times: number[] = [];

    for (const name of participantNames) {
      const participantTimes = travelTimes.get(name);
      if (participantTimes) {
        times.push(participantTimes[i]);
      }
    }

    // Skip candidates with unreachable routes
    if (times.some(t => t === Infinity)) {
      continue;
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const meanTime = totalTime / times.length;
    const maxTime = Math.max(...times);

    // Variance calculation
    const variance = times.reduce((sum, t) => sum + Math.pow(t - meanTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (normalized variance) - lower is fairer
    const coefficientOfVariation = meanTime > 0 ? stdDev / meanTime : 0;

    results.push({
      location: candidates[i],
      travelTimes: times,
      variance,
      totalTime,
      maxTime,
      meanTime,
      fairnessScore: coefficientOfVariation,
    });
  }

  return results;
}

/**
 * Select the best candidate points (top N by combined score)
 */
function selectBestCandidates(
  candidates: CandidatePoint[],
  topN: number = 3
): CandidatePoint[] {
  if (candidates.length === 0) {
    return [];
  }

  // Normalize metrics to 0-1 range
  const maxVariance = Math.max(...candidates.map(c => c.variance));
  const maxTotal = Math.max(...candidates.map(c => c.totalTime));
  const maxMax = Math.max(...candidates.map(c => c.maxTime));

  const scored = candidates.map(c => {
    const normalizedVariance = maxVariance > 0 ? c.variance / maxVariance : 0;
    const normalizedTotal = maxTotal > 0 ? c.totalTime / maxTotal : 0;
    const normalizedMax = maxMax > 0 ? c.maxTime / maxMax : 0;

    // Combined score (higher is better, so we use 1 - normalized)
    const combinedScore =
      WEIGHTS.fairness * (1 - normalizedVariance) +
      WEIGHTS.totalTime * (1 - normalizedTotal) +
      WEIGHTS.maxTime * (1 - normalizedMax);

    return { ...c, combinedScore };
  });

  // Sort by combined score (descending) and return top N
  return scored
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, topN);
}

/**
 * Get detailed travel times for each participant to a specific venue
 */
async function getVenueTravelTimes(
  participants: Participant[],
  venueLocation: LatLng
): Promise<TravelTimeResult[]> {
  const results: TravelTimeResult[] = [];

  // Group by mode for efficiency
  const byMode = new Map<TransportMode, Participant[]>();
  for (const p of participants) {
    const group = byMode.get(p.transportMode) || [];
    group.push(p);
    byMode.set(p.transportMode, group);
  }

  for (const [mode, group] of byMode.entries()) {
    const sources = group.map(p => p.location);

    if (mode === 'transit') {
      const matrix = await google.getTransitMatrix(sources, [venueLocation]);
      for (let i = 0; i < group.length; i++) {
        results.push({
          participantName: group[i].name,
          durationSeconds: matrix.durations[i][0],
          distanceMeters: matrix.distances[i][0],
          transportMode: mode,
        });
      }
    } else {
      const matrix = await ors.computeMatrix(sources, [venueLocation], mode);
      for (let i = 0; i < group.length; i++) {
        results.push({
          participantName: group[i].name,
          durationSeconds: matrix.durations[i][0],
          distanceMeters: matrix.distances[i][0],
          transportMode: mode,
        });
      }
    }
  }

  return results;
}

/**
 * Rank venues by fairness, relevance, and total time
 */
async function rankVenues(
  venues: Venue[],
  participants: Participant[],
  intent: InterpretedIntent
): Promise<RankedVenue[]> {
  const rankedVenues: RankedVenue[] = [];

  // Get travel times for all venues at once (more efficient)
  // We process venues in parallel to speed things up
  const venuePromises = venues.map(async (venue) => {
    const travelTimes = await getVenueTravelTimes(participants, venue.location);

    const durations = travelTimes.map(t => t.durationSeconds);
    const validDurations = durations.filter(d => d > 0);

    if (validDurations.length === 0) {
      return null; // Skip venues with no valid routes
    }

    const totalTime = validDurations.reduce((a, b) => a + b, 0);
    const meanTime = totalTime / validDurations.length;
    const maxTime = Math.max(...validDurations);
    const variance = validDurations.reduce((sum, t) => sum + Math.pow(t - meanTime, 2), 0) / validDurations.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = meanTime > 0 ? stdDev / meanTime : 0;

    // Calculate relevance score based on rating and category match
    let relevanceScore = 0.5; // Base score
    if (venue.rating) {
      relevanceScore += (venue.rating / 10) * 0.3; // Rating contributes up to 0.3
    }
    // Category match
    if (venue.category.toLowerCase().includes(intent.category.toLowerCase())) {
      relevanceScore += 0.2;
    }

    // Calculate fairness score (lower variance = better)
    const fairnessScore = 1 / (1 + coefficientOfVariation);

    // Generate explanation
    const minTime = Math.min(...validDurations);
    const timeDiffMinutes = Math.round((maxTime - minTime) / 60);
    const avgTimeMinutes = Math.round(meanTime / 60);

    let explanation: string;
    if (timeDiffMinutes <= 5) {
      explanation = `Great fairness! Everyone arrives within 5 minutes of each other (avg ${avgTimeMinutes} min).`;
    } else if (timeDiffMinutes <= 10) {
      explanation = `Good balance. Travel times differ by about ${timeDiffMinutes} minutes (avg ${avgTimeMinutes} min).`;
    } else {
      explanation = `Some variation in travel times (${timeDiffMinutes} min difference, avg ${avgTimeMinutes} min).`;
    }

    return {
      ...venue,
      travelTimes,
      varianceScore: variance,
      totalTimeSeconds: totalTime,
      maxTimeSeconds: maxTime,
      fairnessScore,
      explanation,
    } as RankedVenue;
  });

  // Wait for all venue processing
  const results = await Promise.all(venuePromises);

  // Filter out nulls and sort
  for (const result of results) {
    if (result) {
      rankedVenues.push(result);
    }
  }

  // Sort by combined score
  rankedVenues.sort((a, b) => {
    const scoreA = a.fairnessScore * 0.5 + (1 / (1 + a.totalTimeSeconds / 3600)) * 0.3 + 0.2;
    const scoreB = b.fairnessScore * 0.5 + (1 / (1 + b.totalTimeSeconds / 3600)) * 0.3 + 0.2;
    return scoreB - scoreA;
  });

  return rankedVenues.slice(0, MAX_VENUES);
}

/**
 * Main algorithm: Find the best meeting venues using two-pass refinement
 * Pass 1 (Coarse): Large grid to find promising regions
 * Pass 2 (Fine): Small grid around top candidates to avoid local minima
 */
export async function findTimeMiddle(
  participants: Participant[],
  intent: InterpretedIntent
): Promise<{
  venues: RankedVenue[];
  searchArea: { center: LatLng; radiusMeters: number };
}> {
  const participantNames = participants.map(p => p.name);

  // Step 1: Compute geographic centroid
  const centroid = computeCentroid(participants);

  // Step 2a: COARSE PASS - Generate wide grid to find promising regions
  const coarseCandidates = generateCandidateGrid(centroid, COARSE_RADIUS_KM, GRID_SIZE);

  // Step 3a: Compute travel times for coarse candidates
  const coarseTravelTimes = await computeTravelTimes(participants, coarseCandidates);

  // Step 4a: Score coarse candidates
  const scoredCoarseCandidates = scoreCandidates(coarseCandidates, coarseTravelTimes, participantNames);

  // Step 5a: Select top 3 coarse candidates for refinement
  const topCoarseCandidates = selectBestCandidates(scoredCoarseCandidates, 3);

  if (topCoarseCandidates.length === 0) {
    // Fallback to centroid if no valid candidates
    const googleType = places.getGooglePlaceType(intent.category);
    const venues = await places.searchPlaces({
      center: centroid,
      radiusMeters: VENUE_SEARCH_RADIUS_METERS,
      type: googleType,
      keyword: intent.subcategory || intent.keywords[0],
    });

    const rankedVenues = await rankVenues(venues, participants, intent);

    return {
      venues: rankedVenues,
      searchArea: { center: centroid, radiusMeters: VENUE_SEARCH_RADIUS_METERS },
    };
  }

  // Step 2b: FINE PASS - Generate smaller grids around each top coarse candidate
  const fineCandidates: LatLng[] = [];
  for (const coarseCandidate of topCoarseCandidates) {
    const localGrid = generateCandidateGrid(coarseCandidate.location, FINE_RADIUS_KM, GRID_SIZE);
    fineCandidates.push(...localGrid);
  }

  // Remove duplicate points (can happen at grid edges)
  const uniqueFineCandidates = fineCandidates.filter((candidate, index, self) =>
    index === self.findIndex(c =>
      Math.abs(c.lat - candidate.lat) < 0.0001 && Math.abs(c.lng - candidate.lng) < 0.0001
    )
  );

  // Step 3b: Compute travel times for fine candidates
  const fineTravelTimes = await computeTravelTimes(participants, uniqueFineCandidates);

  // Step 4b: Score fine candidates
  const scoredFineCandidates = scoreCandidates(uniqueFineCandidates, fineTravelTimes, participantNames);

  // Step 5b: Select the single best refined candidate
  const bestCandidates = selectBestCandidates(scoredFineCandidates, 1);

  // Use the best refined candidate's location for venue search
  const bestPoint = bestCandidates.length > 0
    ? bestCandidates[0].location
    : topCoarseCandidates[0].location;

  // Step 6: Search for venues near the best point
  const googleType = places.getGooglePlaceType(intent.category);
  const venues = await places.searchPlaces({
    center: bestPoint,
    radiusMeters: VENUE_SEARCH_RADIUS_METERS,
    type: googleType,
    keyword: intent.subcategory || intent.keywords[0],
  });

  // If no venues found with category, try a broader search
  if (venues.length === 0) {
    const broaderVenues = await places.textSearchPlaces(
      intent.category,
      bestPoint,
      VENUE_SEARCH_RADIUS_METERS * 2
    );
    const rankedVenues = await rankVenues(broaderVenues, participants, intent);
    return {
      venues: rankedVenues,
      searchArea: { center: bestPoint, radiusMeters: VENUE_SEARCH_RADIUS_METERS * 2 },
    };
  }

  // Step 7: Rank venues
  const rankedVenues = await rankVenues(venues, participants, intent);

  return {
    venues: rankedVenues,
    searchArea: { center: bestPoint, radiusMeters: VENUE_SEARCH_RADIUS_METERS },
  };
}
