import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware to log API performance metrics to the database
 * Captures: endpoint, method, status code, elapsed time, user ID (if authenticated), user agent
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
    
    // Extract user ID if authenticated (from JWT token)
    const userId = (req as any).user?.id || null;
    
    // Extract user agent from headers
    const userAgent = req.headers['user-agent'] || null;

    // Extract error message and details if this is an error response
    let errorMessage: string | null = null;
    let errorDetails: string | null = null;
    
    if (statusCode >= 400 && data) {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        errorMessage = parsedData?.message || parsedData?.error || `HTTP ${statusCode}`;
        errorDetails = parsedData?.details || parsedData?.stack || null;
        
        // Log slow requests (>10 seconds) to console for debugging
        if (elapsedTime > 10000) {
          console.warn(`[SLOW REQUEST] ${method} ${endpoint} took ${elapsedTime}ms for User ID ${userId || 'unauthenticated'}`);
        }
      } catch (e) {
        // If parsing fails, just use status code as error message
        errorMessage = `HTTP ${statusCode}`;
      }
    } else if (elapsedTime > 10000) {
      // Log slow successful requests too
      console.warn(`[SLOW REQUEST] ${method} ${endpoint} took ${elapsedTime}ms for User ID ${userId || 'unauthenticated'}`);
    }

    // Log to database asynchronously (don't block response)
    storage.createPerformanceLog({
      userId,
      endpoint,
      method,
      statusCode,
      elapsedTime,
      userAgent,
      errorMessage,
      errorDetails,
    }).catch(error => {
      // Silently fail - don't impact user experience if logging fails
      console.error('Failed to log performance metric:', error);
    });

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
}
