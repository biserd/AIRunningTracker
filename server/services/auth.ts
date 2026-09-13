import { storage } from '../storage';
import { getJwtSecret } from '../config/security';
import { AuthService as CoreAuthService } from './authCore';
export { AuthError, type AuthUser } from './authCore';

// PostgreSQL remains the production default until the tested cutover.
export class AuthService extends CoreAuthService {
  constructor() { super(storage, getJwtSecret()); }
}
export const authService = new AuthService();
