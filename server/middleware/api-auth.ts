import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface ApiAuthRequest extends Request {
  apiUser?: {
    userId: number;
    scopes: string[];
    keyId: number;
  };
}

export function authenticateApiKey(requiredScope?: string) {
  return async (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          error: "unauthorized",
          message: "Missing Authorization header. Use: Authorization: Bearer ra_your_api_key" 
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({ 
          error: "invalid_auth_format",
          message: "Invalid authorization format. Use: Authorization: Bearer ra_your_api_key" 
        });
      }

      const apiKey = parts[1];
      
      if (!apiKey.startsWith('ra_')) {
        return res.status(401).json({ 
          error: "invalid_key_format",
          message: "Invalid API key format. Keys should start with 'ra_'" 
        });
      }

      const validation = await storage.validateApiKey(apiKey);
      
      if (!validation.valid) {
        return res.status(401).json({ 
          error: "invalid_key",
          message: "Invalid or inactive API key" 
        });
      }

      if (requiredScope && validation.scopes && !validation.scopes.includes(requiredScope)) {
        return res.status(403).json({ 
          error: "insufficient_scope",
          message: `This API key does not have the '${requiredScope}' scope` 
        });
      }

      req.apiUser = {
        userId: validation.userId!,
        scopes: validation.scopes!,
        keyId: validation.keyId!
      };

      storage.updateApiKeyLastUsed(validation.keyId!).catch(console.error);

      next();
    } catch (error: any) {
      console.error('API authentication error:', error);
      res.status(500).json({ 
        error: "server_error",
        message: "Authentication failed due to server error" 
      });
    }
  };
}
