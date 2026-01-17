import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 4000;

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined');
  process.exit(1);
}

const connectDB = async (retries = 5, delay = 5000) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 45000, // 45s to find server
      socketTimeoutMS: 60000,          // 60s socket timeout
      connectTimeoutMS: 45000,         // 45s initial connection
      maxPoolSize: 5,                  // serverless-friendly
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      family: 4,                       // force IPv4 (Atlas/Vercel fix)
      retryWrites: true,
      w: 'majority',
    });

    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);

    if (retries > 0) {
      console.log(`🔁 Retrying in ${delay / 1000}s... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1, delay), delay);
    } else {
      console.error('❌ Max retries reached. Exiting.');
      process.exit(1);
    }
  }
};

// Connect DB then start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
