import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { validate } from '../middleware/validate.js';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXP || '7d';

// Updated cookie configuration (always secure in prod, with partitioned for cross-site compatibility)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  partitioned: true, // Added for CHIPS / Privacy Sandbox support (critical for mobile/cross-site)
  path: '/',         // Ensure cookie is available for all paths
};

// Validation for registration
export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password too short'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty if provided'),
  body('role')
    .optional()
    .isIn(['viewer', 'editor'])
    .withMessage('Invalid role. Only viewer or editor allowed during registration'),
];

// Register endpoint
export const register = [
  registerValidation,
  validate,
  async (req, res) => {
    try {
      const { email, password, name, role: clientRole } = req.body;
      // Check if email already exists
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered', code: 400 });
      }
      // Hash password
      const hashed = await bcrypt.hash(password, 10);
      // Force role to viewer/editor only
      let assignedRole = 'viewer'; // default
      if (clientRole && ['viewer', 'editor'].includes(clientRole)) {
        assignedRole = clientRole;
      }
      if (clientRole === 'admin') {
        assignedRole = 'viewer'; // block admin
      }
      // Create user
      const user = await User.create({
        email,
        password: hashed,
        name: name || null,
        role: assignedRole,
      });
      res.status(201).json({
        message: 'User created successfully',
        userId: user._id,
        role: user.role,
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Server error during registration', code: 500 });
    }
  },
];

// Login validation
export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password required'),
];

// Login endpoint
export const login = [
  loginValidation,
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Email not registered', code: 401 });
      }
      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password', code: 401 });
      }
      // Generate tokens
      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_EXP }
      );
      const refreshTokenStr = jwt.sign(
        { id: user._id },
        JWT_SECRET,
        { expiresIn: REFRESH_EXP }
      );
      // Store refresh token in DB
      await RefreshToken.create({
        token: refreshTokenStr,
        userId: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      // Set cookies with updated configuration
      res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', refreshTokenStr, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.json({
        message: 'Logged in successfully',
        role: user.role,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login', code: 500 });
    }
  },
];

// Refresh endpoint
export const refresh = async (req, res) => {
  try {
    const user = await User.findById(req.userId); // From verifyRefresh middleware
    if (!user) {
      return res.status(401).json({ error: 'Invalid user', code: 401 });
    }
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_EXP }
    );
    // Set new access token cookie with updated configuration
    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.json({ message: 'Token refreshed' });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Refresh failed', code: 401 });
  }
};

// Logout endpoint
export const logout = async (req, res) => {
  try {
    // Delete refresh token from DB
    if (req.cookies.refreshToken) {
      await RefreshToken.deleteOne({ token: req.cookies.refreshToken });
    }
    // Clear cookies with same updated options
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error during logout', code: 500 });
  }
};

// Me endpoint
export const me = (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    email: req.user.email
  });
};