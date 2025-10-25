import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware to log API performance metrics to the database
 * Captures: endpoint, method, status code, elapsed time, user ID (if authenticated)
 */
export function performanceLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Intercept the response to capture timing and status
  res.send = function (data: any) {
    const elapsedTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const endpoint = req.path;
    const method = req.method;
    
    // Extract user ID if authenticated (from session)
    const userId = req.session?.userId || null;

    // Log to database asynchronously (don't block response)
    storage.createPerformanceLog({
      userId,
      endpoint,
      method,
      statusCode,
      elapsedTime,
    }).catch(error => {
      // Silently fail - don't impact user experience if logging fails
      console.error('Failed to log performance metric:', error);
    });

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
}
