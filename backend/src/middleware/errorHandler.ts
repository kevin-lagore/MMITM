import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types/index.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiError>,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details: err,
    });
    return;
  }

  // Handle axios errors
  if (err.name === 'AxiosError') {
    res.status(502).json({
      error: 'ExternalApiError',
      message: 'An external service is unavailable',
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}

export function notFoundHandler(req: Request, res: Response<ApiError>): void {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
