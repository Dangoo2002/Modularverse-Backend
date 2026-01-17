import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: [
      'https://modularverse.vercel.app',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api', routes);


app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Server error', code: 500 });
});

export default app;