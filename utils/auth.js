import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'debugflow-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthUtils {
  
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   * @param {object} user - User object with id and email
   * @returns {string} - JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - JWT token
   * @returns {object|null} - Decoded token payload or null if invalid
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Token verification error:', error.message);
      return null;
    }
  }

  /**
   * Generate a secure session ID
   * @returns {string} - Random session ID
   */
  static generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} - True if email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} - Validation result with isValid and message
   */
  static validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return {
        isValid: false,
        message: `Password must be at least ${minLength} characters long`
      };
    }

    if (!hasUpperCase || !hasLowerCase) {
      return {
        isValid: false,
        message: 'Password must contain both uppercase and lowercase letters'
      };
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        message: 'Password must contain at least one number'
      };
    }

    if (!hasSpecialChar) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character'
      };
    }

    return {
      isValid: true,
      message: 'Password is strong'
    };
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - JWT token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate a secure API key hash for storage
   * @param {string} apiKey - Plain text API key
   * @returns {string} - Hashed API key
   */
  static hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Create a password reset token
   * @returns {object} - Token and expiry date
   */
  static generateResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
    
    return {
      token,
      expiresAt
    };
  }
}

/**
 * Middleware to authenticate JWT tokens
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware function
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const decoded = AuthUtils.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware for optional authentication (user may or may not be logged in)
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware function
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (token) {
    const decoded = AuthUtils.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

// Export commonly used functions directly
export const verifyToken = AuthUtils.verifyToken;
export const generateToken = AuthUtils.generateToken;
export const hashPassword = AuthUtils.hashPassword;
export const comparePassword = AuthUtils.comparePassword;