const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is missing. Add it to backend/.env');
}

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URI, {
    // Mongoose 8 enables these by default, listed explicitly for clarity
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;
  console.log('Connected to MongoDB');
}

// Initiate connection immediately so the first request is not delayed
connectDB().catch((err) => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

module.exports = { connectDB, mongoose };
