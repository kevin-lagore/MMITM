import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { geocodeAddress } from '../services/nominatimService.js';
import { interpretIntent } from '../services/openaiService.js';
import { findTimeMiddle } from '../services/timeMiddleAlgorithm.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  GeocodeRequest,
  GeocodeResponse,
  InterpretRequest,
  InterpretResponse,
  FindMiddleRequest,
  FindMiddleResponse,
  Participant,
} from '../types/index.js';

// Validation schemas
const geocodeSchema = z.object({
  address: z.string().min(1, 'Address is required'),
});

const interpretSchema = z.object({
  intent: z.string().min(1, 'Intent is required'),
});

const participantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  transportMode: z.enum(['driving', 'walking', 'cycling', 'transit']),
});

const findMiddleSchema = z.object({
  participants: z.array(participantSchema).min(2, 'At least 2 participants required'),
  intent: z.string().min(1, 'Intent is required'),
});

/**
 * POST /api/geocode
 * Geocode an address to lat/lng coordinates
 */
export async function geocodeHandler(
  req: Request<{}, GeocodeResponse, GeocodeRequest>,
  res: Response<GeocodeResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { address } = geocodeSchema.parse(req.body);
    const result = await geocodeAddress(address);

    res.json({
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400));
      return;
    }
    if (error instanceof Error && error.message.includes('Could not geocode')) {
      next(new AppError(error.message, 404));
      return;
    }
    next(error);
  }
}

/**
 * POST /api/interpret
 * Interpret a free-text destination intent
 */
export async function interpretHandler(
  req: Request<{}, InterpretResponse, InterpretRequest>,
  res: Response<InterpretResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { intent } = interpretSchema.parse(req.body);
    const result = await interpretIntent(intent);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400));
      return;
    }
    next(error);
  }
}

/**
 * POST /api/find-middle
 * Main endpoint: find the optimal meeting location
 */
export async function findMiddleHandler(
  req: Request<{}, FindMiddleResponse, FindMiddleRequest>,
  res: Response<FindMiddleResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { participants: inputParticipants, intent } = findMiddleSchema.parse(req.body);

    // Step 1: Geocode all participant addresses
    const geocodedParticipants: Participant[] = [];
    const participantLocations: FindMiddleResponse['participantLocations'] = [];

    for (const p of inputParticipants) {
      try {
        const geocoded = await geocodeAddress(p.address);
        geocodedParticipants.push({
          ...p,
          location: { lat: geocoded.lat, lng: geocoded.lng },
        });
        participantLocations.push({
          name: p.name,
          location: { lat: geocoded.lat, lng: geocoded.lng },
        });
      } catch (error) {
        throw new AppError(
          `Could not find location for "${p.name}": ${p.address}. Please check the address.`,
          400
        );
      }
    }

    // Step 2: Interpret the destination intent
    const interpretedIntent = await interpretIntent(intent);

    // Step 3: Find the time middle and rank venues
    const result = await findTimeMiddle(geocodedParticipants, interpretedIntent);

    if (result.venues.length === 0) {
      throw new AppError(
        `No ${interpretedIntent.category} venues found in the search area. Try a different type of place.`,
        404
      );
    }

    res.json({
      recommendedVenues: result.venues,
      searchArea: result.searchArea,
      participantLocations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      next(new AppError(messages, 400));
      return;
    }
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(error);
  }
}
