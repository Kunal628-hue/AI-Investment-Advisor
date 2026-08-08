const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/users/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      riskProfile: req.user.riskProfile,
      darkMode: req.user.darkMode
    }
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile name/email in MongoDB
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (name) req.user.name = name.trim();
    if (email) req.user.email = email.trim().toLowerCase();
    await req.user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully in MongoDB Atlas.',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        riskProfile: req.user.riskProfile,
        darkMode: req.user.darkMode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

// @route   POST /api/users/risk-profile
// @desc    Submit investor questionnaire & calculate risk profile
router.post('/risk-profile', protect, async (req, res) => {
  try {
    const { timeHorizon, primaryGoal, maxLossTolerancePct, liquidityNeed, ageGroup } = req.body;

    let score = 50;

    // Time horizon scoring
    if (timeHorizon === '>10 years') score += 20;
    else if (timeHorizon === '5-10 years') score += 10;
    else if (timeHorizon === '1-3 years') score -= 15;

    // Loss tolerance scoring
    if (maxLossTolerancePct >= 30) score += 25;
    else if (maxLossTolerancePct >= 15) score += 10;
    else if (maxLossTolerancePct <= 5) score -= 20;

    // Primary goal
    if (primaryGoal === 'Aggressive Growth') score += 20;
    else if (primaryGoal === 'Capital Preservation') score -= 20;

    // Bound score to 0 - 100
    score = Math.max(0, Math.min(100, score));

    let category = 'Balanced Moderate';
    if (score < 30) category = 'Conservative';
    else if (score < 60) category = 'Balanced Moderate';
    else if (score < 80) category = 'Balanced Aggressive';
    else category = 'Aggressive Growth';

    const riskProfile = {
      score,
      category,
      timeHorizon: timeHorizon || '5-10 years',
      primaryGoal: primaryGoal || 'Wealth Growth',
      maxLossTolerancePct: maxLossTolerancePct || 15,
      updatedAt: new Date()
    };

    req.user.riskProfile = riskProfile;
    await req.user.save();

    res.json({
      success: true,
      message: 'Risk profile updated successfully.',
      riskProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Risk profile update failed', error: error.message });
  }
});

// @route   PUT /api/users/theme
// @desc    Toggle dark/light mode
router.put('/theme', protect, async (req, res) => {
  try {
    const { darkMode } = req.body;
    req.user.darkMode = !!darkMode;
    await req.user.save();
    res.json({ success: true, darkMode: req.user.darkMode });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Theme update failed' });
  }
});

module.exports = router;
