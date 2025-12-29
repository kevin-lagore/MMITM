import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  // Server
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  // API Keys
  openaiApiKey: requireEnv('OPENAI_API_KEY'),
  orsApiKey: requireEnv('ORS_API_KEY'),
  foursquareApiKey: requireEnv('FOURSQUARE_API_KEY'),
  googleMapsApiKey: requireEnv('GOOGLE_MAPS_API_KEY'),

  // CORS
  allowedOrigins: optionalEnv('ALLOWED_ORIGINS', 'http://localhost:5173').split(','),

  // Rate limiting
  rateLimitMax: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),
  rateLimitWindowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
};
