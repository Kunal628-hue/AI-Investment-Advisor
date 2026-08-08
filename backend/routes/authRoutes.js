const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_ai_investment_advisor_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_2026';

// Helper: Generate tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

// In-memory fallback for testing when DB is offline
const inMemoryUsers = [];

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.toLowerCase();
    
    // Check if DB is connected
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: cleanEmail,
        passwordHash,
        role: role === 'admin' ? 'admin' : 'user',
        riskProfile: { score: 50, category: 'Balanced Moderate' }
      });

      const { accessToken, refreshToken } = generateTokens(user);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        tokens: { accessToken, refreshToken },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          riskProfile: user.riskProfile,
          darkMode: user.darkMode
        }
      });
    } else {
      // In-Memory Fallback
      if (inMemoryUsers.find(u => u.email === cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const mockId = 'mock_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const user = {
        _id: mockId,
        id: mockId,
        name,
        email: cleanEmail,
        passwordHash,
        role: role === 'admin' ? 'admin' : 'user',
        riskProfile: { score: 50, category: 'Balanced Moderate' },
        darkMode: true
      };
      inMemoryUsers.push(user);

      const { accessToken, refreshToken } = generateTokens(user);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully (in-memory mode).',
        tokens: { accessToken, refreshToken },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          riskProfile: user.riskProfile,
          darkMode: user.darkMode
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get JWT tokens
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase();
    const isDbConnected = mongoose.connection.readyState === 1;

    let user;
    if (isDbConnected) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = inMemoryUsers.find(u => u.email === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Login successful.',
      tokens: { accessToken, refreshToken },
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        riskProfile: user.riskProfile,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const tokens = generateTokens(user);
    res.json({ success: true, tokens });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
});

module.exports = router;
