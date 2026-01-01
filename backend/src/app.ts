import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/api.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Trust proxy for services like Render, Heroku, etc.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: env.allowedOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  message: { error: 'TooManyRequests', message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const port = env.port;
app.listen(port, () => {
  console.log(`MMITM Backend running on http://localhost:${port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});

export default app;
