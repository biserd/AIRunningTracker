import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Sensitive endpoints where we should NOT log request/response bodies
 */
const SENSITIVE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/confirm-reset',
  '/api/user/password',
  '/api/stripe',
  '/api/payment'
];

/**
 * Sensitive field names to redact from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'stravaAccessToken',
  'stravaRefreshToken',
  'resetToken',
  'secret',
  'apiKey',
  'clientSecret',
  'cardNumber',
  'cvv',
  'ssn'
];

/**
 * Helper function to redact sensitive fields from objects
 */
function redactSensitiveFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const redacted = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    
    // Redact if the field name matches sensitive patterns
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveFields(redacted[key]);
    }
  }
  
  return redacted;
}

/**
 * Helper function to truncate data if it exceeds max size
 */
function truncateData(data: any, maxBytes: number = 5120): string | null {
  if (!data) return null;
  
  try {
    // Redact sensitive fields before logging
    const redacted = redactSensitiveFields(data);
    const jsonString = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
    
    if (jsonString.length > maxBytes) {
      return jsonString.substring(0, maxBytes) + '... [truncated]';
    }
    return jsonString;
  } catch (e) {
    return '[Unable to serialize data]';
  }
}

/**
 * Middleware to log API performance metrics to the database
 * Captures: endpoint, method, status code, elapsed time, user ID, request/response bodies
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

    // Check if this is a sensitive endpoint where we should NOT log bodies
    const isSensitiveEndpoint = SENSITIVE_ENDPOINTS.some(sensitive => 
      endpoint.startsWith(sensitive)
    );

    // Capture request body (for POST, PUT, PATCH requests) - skip for sensitive endpoints
    const requestBody = (
      !isSensitiveEndpoint && 
      ['POST', 'PUT', 'PATCH'].includes(method) && 
      req.body
    ) ? truncateData(req.body) : null;

    // Capture response body - skip for sensitive endpoints
    const responseBody = (!isSensitiveEndpoint && data) ? truncateData(data) : null;

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
      requestBody,
      responseBody,
    }).catch(error => {
      // Silently fail - don't impact user experience if logging fails
      console.error('Failed to log performance metric:', error);
    });

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
}
