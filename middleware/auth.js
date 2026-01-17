import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const protect = async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ error: 'No access token', code: 401 });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid access token', code: 401 });
  }
};

export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden', code: 403 });
  }
  next();
};

// New: Refresh middleware (for /refresh endpoint)
export const verifyRefresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token', code: 401 });

  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
  if (!tokenDoc || tokenDoc.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Invalid refresh token', code: 401 });
  }

  req.userId = tokenDoc.userId;
  next();
};