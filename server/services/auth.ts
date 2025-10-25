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

    // Create user
    const user = await storage.createUser({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.email, // Use email as username for now
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
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

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

  private generateToken(user: User): string {
    return jwt.sign(
      { 
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  async addToWaitlist(email: string): Promise<void> {
    await storage.addToEmailWaitlist(email);
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
}

export const authService = new AuthService();