import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { validate } from '../middleware/validate.js';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXP;
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXP;

// Validation for registration - only allow viewer/editor roles
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

      // Check if email already exists - specific error
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

// Login endpoint - specific errors for email not found vs wrong password
export const login = [
  loginValidation,
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user - specific "not found" error
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Email not registered', code: 401 });
      }

      // Check password - specific "incorrect password" error
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

      await RefreshToken.create({
        token: refreshTokenStr,
        userId: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.cookie('refreshToken', refreshTokenStr, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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

// Refresh endpoint (unchanged)
export const refresh = async (req, res) => {
  try {
    const decoded = jwt.verify(req.cookies.refreshToken, JWT_SECRET);
    const user = await User.findById(req.userId); // From verifyRefresh
    if (!user) return res.status(401).json({ error: 'Invalid user', code: 401 });

    const newAccess = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    res.cookie('accessToken', newAccess, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ message: 'Token refreshed' });
  } catch (err) {
    res.status(401).json({ error: 'Refresh failed', code: 401 });
  }
};

// Logout endpoint (unchanged)
export const logout = async (req, res) => {
  await RefreshToken.deleteOne({ token: req.cookies.refreshToken });
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

// Me endpoint (unchanged)
export const me = (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
};