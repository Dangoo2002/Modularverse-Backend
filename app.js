import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';

const app = express();

// Define allowed origins
const allowedOrigins = [
  'https://modularverse.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    exposedHeaders: ['Set-Cookie'], // Expose Set-Cookie header
  })
);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Test endpoint to verify CORS and cookies
app.get('/api/test-cookies', (req, res) => {
  console.log('Cookies received:', req.cookies);
  console.log('Origin:', req.headers.origin);
  
  // Set a test cookie
  res.cookie('test_cookie', 'test_value', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60000,
  });
  
  res.json({ 
    message: 'Test successful',
    cookiesReceived: req.cookies,
    origin: req.headers.origin,
    environment: process.env.NODE_ENV
  });
});

app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error', code: 500 });
});

export default app;