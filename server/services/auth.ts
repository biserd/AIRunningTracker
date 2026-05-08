import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import type { RegisterData, LoginData, User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

export class AuthService {
  async register(userData: RegisterData): Promise<{ user: AuthUser; token: string }> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Create user as free user
    const user = await storage.createUser({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.email,
    });

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
      token,
    };
  }

  async login(loginData: LoginData): Promise<{ user: AuthUser; token: string }> {
    // Find user by email
    const user = await storage.getUserByEmail(loginData.email);
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password — Strava-only accounts have no password
    if (!user.password) {
      throw new AuthError(
        'STRAVA_ONLY',
        'This account uses Strava login. Please click "Continue with Strava" to sign in.',
      );
    }
    const isValidPassword = await bcrypt.compare(loginData.password, user.password);
    if (!isValidPassword) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionStatus: user.subscriptionStatus || 'free',
      },
      token,
    };
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  generateToken(user: User): string {
    return jwt.sign(
      { 
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async generatePasswordResetToken(email: string): Promise<string | null> {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Return null but don't reveal that user doesn't exist
      return null;
    }

    // Generate cryptographically random token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (security: prevent token leakage from DB compromise)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    
    // Store HASHED token in database (never store plaintext tokens)
    await storage.updateUserResetToken(user.id, hashedToken, resetTokenExpiry);
    
    // Return the original token (only sent to user via email)
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Hash the provided token to compare with stored hash
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user by hashed reset token
    const user = await storage.getUserByResetToken(hashedToken);
    
    if (!user) {
      return false;
    }
    
    // Check if token has expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return false;
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password and clear reset token (enforces single-use)
    await storage.updateUserPassword(user.id, hashedPassword);
    
    return true;
  }

  /**
   * Returns true when the email belongs to an existing account that has
   * NO password set (i.e. it was created via Strava OAuth and can only be
   * signed into with "Continue with Strava"). Used by /forgot-password to
   * send the right email instead of a useless password-reset link.
   */
  async isStravaOnlyAccount(email: string): Promise<boolean> {
    const user = await storage.getUserByEmail(email);
    if (!user) return false;
    return !user.password;
  }

  /**
   * Generate a short-lived JWT (15 min) that lets the user sign in with
   * one click from an email link. We sign with a separate-purpose payload
   * so a password-reset or session JWT can never be used as a magic link
   * and vice versa. Returns null if the email isn't on file (so callers
   * can stay anti-enumeration friendly).
   */
  async generateMagicLinkToken(email: string): Promise<string | null> {
    const user = await storage.getUserByEmail(email);
    if (!user) return null;
    return jwt.sign(
      { userId: user.id, email: user.email, purpose: 'magic-link' },
      JWT_SECRET,
      { expiresIn: '15m' },
    );
  }

  /**
   * Verify a magic-link token and, on success, mint a normal session JWT
   * (same shape as login()). Throws AuthError on any validation issue.
   */
  async verifyMagicLinkToken(token: string): Promise<{ user: AuthUser; token: string }> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new AuthError('INVALID_TOKEN', 'This sign-in link has expired. Request a new one.');
    }
    if (!decoded || decoded.purpose !== 'magic-link' || !decoded.userId) {
      throw new AuthError('INVALID_TOKEN', 'This sign-in link is invalid.');
    }
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      throw new AuthError('INVALID_TOKEN', 'Account no longer exists.');
    }
    const sessionToken = this.generateToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionStatus: user.subscriptionStatus || 'free',
      },
      token: sessionToken,
    };
  }
}

export const authService = new AuthService();