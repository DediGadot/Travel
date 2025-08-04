import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // requests per window

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries
  Object.keys(store).forEach(key => {
    if (store[key].resetTime <= now) {
      delete store[key];
    }
  });

  // Initialize or update client entry
  if (!store[clientId]) {
    store[clientId] = {
      count: 1,
      resetTime: now + WINDOW_SIZE
    };
  } else {
    store[clientId].count++;
  }

  const clientData = store[clientId];

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - clientData.count).toString(),
    'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
  });

  // Check if limit exceeded
  if (clientData.count > MAX_REQUESTS) {
    res.set('Retry-After', Math.ceil((clientData.resetTime - now) / 1000).toString());
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`
    });
  }

  next();
};