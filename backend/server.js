const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const adminRoutes = require('./routes/adminRoutes');
const symbolRoutes = require('./routes/symbolRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Security & Base Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 200,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'backend-api-gateway',
    timestamp: new Date(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected/standby'
  });
});

// Database Connection with graceful retry
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-investment-advisor';

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 1500 })
    .then(() => console.log('✅ Connected to MongoDB Atlas / Local Database.'))
    .catch(err => {
      console.warn('⚠️ MongoDB connection warning:', err.message);
      console.log('Backend will operate with standard resilience.');
    });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Express API Gateway running on port ${PORT}`);
  });
}

module.exports = app;
