import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 4000;
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { retryWrites: true, w: 'majority' });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Mongo connection failed:', err);
    setTimeout(connectDB, 5000);  // Retry
  }
};

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server on ${PORT}`));
});