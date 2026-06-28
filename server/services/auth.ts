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
   * Generate a short-lived JWT (15 min) for on-demand web magic links
   * (e.g. "Email me a sign-in link" in Settings). The short TTL is
   * intentional — the user just requested it and is watching their inbox.
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
   * Generate a longer-lived JWT (7 days) for links embedded inside
   * outgoing emails (post-run recap, coach recap, drip campaigns, etc.).
   * Runners often open emails hours or days after receiving them, so
   * the 15-minute web TTL is nearly always expired by then.
   */
  async generateEmailMagicLinkToken(email: string): Promise<string | null> {
    const user = await storage.getUserByEmail(email);
    if (!user) return null;
    return jwt.sign(
      { userId: user.id, email: user.email, purpose: 'email-magic-link' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
  }

  /**
   * Wrap an internal app path with a 15-minute magic-link URL.
   * Use for on-demand web sign-in links only (Settings → "Email me a link").
   */
  async wrapWithMagicLink(
    email: string | null | undefined,
    path: string,
    baseUrl: string = 'https://aitracker.run',
  ): Promise<string> {
    const base = baseUrl.replace(/\/$/, '');
    if (!path.startsWith('/') || path.startsWith('//')) {
      return path.startsWith('http') ? path : `${base}${path}`;
    }
    if (!email) return `${base}${path}`;
    try {
      const token = await this.generateMagicLinkToken(email);
      if (!token) return `${base}${path}`;
      return `${base}/auth/magic-link?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(path)}`;
    } catch {
      return `${base}${path}`;
    }
  }

  /**
   * Wrap an internal app path with a 7-day magic-link URL.
   * Use for every link embedded in an outgoing email so it works
   * days after the email was delivered.
   */
  async wrapWithEmailMagicLink(
    email: string | null | undefined,
    path: string,
    baseUrl: string = 'https://aitracker.run',
  ): Promise<string> {
    const base = baseUrl.replace(/\/$/, '');
    if (!path.startsWith('/') || path.startsWith('//')) {
      return path.startsWith('http') ? path : `${base}${path}`;
    }
    if (!email) return `${base}${path}`;
    try {
      const token = await this.generateEmailMagicLinkToken(email);
      if (!token) return `${base}${path}`;
      return `${base}/auth/magic-link?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(path)}`;
    } catch {
      return `${base}${path}`;
    }
  }

  /**
   * Verify a magic-link token (either the 15-min web or 7-day email
   * variant) and mint a normal session JWT on success.
   * Throws AuthError with code:
   *   EXPIRED_TOKEN  — valid JWT but past its expiry (show "link expired" UI)
   *   INVALID_TOKEN  — malformed, wrong purpose, or account gone
   */
  async verifyMagicLinkToken(token: string): Promise<{ user: AuthUser; token: string }> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        throw new AuthError('EXPIRED_TOKEN', 'This sign-in link has expired. Please request a new one.');
      }
      throw new AuthError('INVALID_TOKEN', 'This sign-in link is invalid.');
    }
    const validPurposes = ['magic-link', 'email-magic-link'];
    if (!decoded || !validPurposes.includes(decoded.purpose) || !decoded.userId) {
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