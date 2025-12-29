import { Router } from 'express';
import {
  geocodeHandler,
  interpretHandler,
  findMiddleHandler,
} from '../controllers/middleController.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Geocode an address
router.post('/geocode', geocodeHandler);

// Interpret destination intent
router.post('/interpret', interpretHandler);

// Main endpoint: find optimal meeting location
router.post('/find-middle', findMiddleHandler);

export default router;
