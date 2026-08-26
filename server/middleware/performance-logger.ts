import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { sanitizeAdminLogText } from "../services/adminTelemetry";

/**
 * Sensitive endpoints where we should NOT log request/response bodies
 */
const SENSITIVE_ENDPOINTS = [
  '/api/auth',
  '/api/mobile',
  '/api/user/password',
  '/api/stripe',
  '/api/payment',
  '/api/chat',
  '/api/brief',
  '/api/athlete/summary',
  '/api/dashboard',
  '/api/activities',
  '/api/analytics',
  '/api/performance',
  '/api/fitness',
  '/api/ml',
  '/api/runner-score',
  '/api/training',
  '/api/goals',
  '/api/notifications',
  '/api/coach',
  '/api/integrations/hermes',
  '/api/users',
  // MCP requests can contain OAuth codes/tokens or private runner responses.
  // Keep bodies out of the generic performance log; the MCP subsystem emits
  // metadata-only audit rows instead.
  '/mcp'
];

export function isSensitiveEndpoint(endpoint: string): boolean {
  return SENSITIVE_ENDPOINTS.some((sensitive) => endpoint.startsWith(sensitive));
}

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
export function truncateData(data: any, maxBytes: number = 5120): string | null {
  if (!data) return null;
  
  try {
    // Express passes JSON responses to res.send as strings. Parse structured
    // JSON before redaction so nested tokens cannot bypass field-name checks.
    let structured = data;
    if (typeof data === 'string') {
      try {
        structured = JSON.parse(data);
      } catch {
        structured = data;
      }
    }
    const redacted = redactSensitiveFields(structured);
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
 * Middleware to log metadata-only API performance metrics to the database.
 * Request and response bodies are intentionally excluded.
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

    // Performance monitoring does not need payload bodies. Keeping them out of
    // the database prevents credentials, magic links and private runner data
    // from becoming visible through an admin troubleshooting surface.
    const requestBody = null;
    const responseBody = null;

    // Extract error message and details if this is an error response
    let errorMessage: string | null = null;
    let errorDetails: string | null = null;
    
    if (statusCode >= 400 && data) {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        errorMessage = sanitizeAdminLogText(parsedData?.message || parsedData?.error || `HTTP ${statusCode}`);
        errorDetails = sanitizeAdminLogText(parsedData?.details || parsedData?.stack || null, 1000);
        
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
