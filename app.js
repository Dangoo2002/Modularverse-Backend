// backend/src/app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet'; // Security headers (install: npm i helmet)
import morgan from 'morgan'; // Request logging (install: npm i morgan)
import routes from './routes/index.js';

// Optional: if you have rate-limit defined in routes or here
// import RateLimit from 'express-rate-limit';
// const limiter = RateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

const app = express();

// === VERY IMPORTANT FOR VERCEL + express-rate-limit ===
app.set('trust proxy', 1); // Trust first proxy (Vercel edge). Fixes X-Forwarded-For error

// Security headers (helmet is lightweight and recommended)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS - ONLY allow your real frontend domain (update this!)
app.use(
  cors({
    origin: [
      'https://modularverse.vercel.app',     // Your production frontend
      'http://localhost:3000',                // Local dev
    ],
    credentials: true,                        // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (only in development - Vercel logs are enough in prod)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // Shows requests in terminal
}

// Body parsing
app.use(express.json({ limit: '10mb' })); // Increase limit if needed
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Apply rate limiting (if you have it defined)
// app.use('/api', limiter); // Apply globally or per-route

// Health check endpoint (useful for monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api', routes);

// Catch-all for unknown routes (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 404 });
});

// Global error handler (improved)
app.use((err, req, res, next) => {
  console.error('Global error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.path,
    method: req.method,
  });

  const status = err.status || 500;
  const message =
    status === 500
      ? 'Internal server error – please try again later'
      : err.message || 'Something went wrong';

  res.status(status).json({
    error: message,
    code: status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }), // Only show stack in dev
  });
});

export default app;