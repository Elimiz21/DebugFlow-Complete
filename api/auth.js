import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import Joi from 'joi';

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  company: Joi.string().max(100).optional(),
  timezone: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export default async function handler(req, res) {
  // Initialize database connection
  if (!database.db) {
    try {
      await database.initialize();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Database initialization failed'
      });
    }
  }

  const { method } = req;

  switch (method) {
    case 'POST':
      return handleAuthPost(req, res);
    case 'GET':
      return handleAuthGet(req, res);
    case 'DELETE':
      return handleAuthDelete(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

async function handleAuthPost(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'register':
      return handleRegister(req, res);
    case 'login':
      return handleLogin(req, res);
    case 'verify-token':
      return handleVerifyToken(req, res);
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use register, login, or verify-token'
      });
  }
}

async function handleRegister(req, res) {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, password, company, timezone } = value;

    // Validate password strength
    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const password_hash = await AuthUtils.hashPassword(password);

    // Create user
    const result = await database.createUser({
      name,
      email,
      password_hash,
      company,
      timezone
    });

    // Get the created user
    const user = await database.getUserById(result.lastID);
    
    // Generate JWT token
    const token = AuthUtils.generateToken(user);

    // Remove password hash from response
    const { password_hash: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
}

async function handleLogin(req, res) {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = value;

    // Get user by email
    const user = await database.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = AuthUtils.generateToken(user);

    // Remove password hash from response
    const { password_hash: _, ...userResponse } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
}

async function handleVerifyToken(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = AuthUtils.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Get fresh user data
    const user = await database.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password hash from response
    const { password_hash: _, ...userResponse } = user;

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token verification'
    });
  }
}

async function handleAuthGet(req, res) {
  // Get current user profile
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = AuthUtils.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const user = await database.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password hash from response
    const { password_hash: _, ...userResponse } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleAuthDelete(req, res) {
  // Logout - invalidate token (client-side for JWT)
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
}