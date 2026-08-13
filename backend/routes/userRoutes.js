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
    const { 
      score: bodyScore, 
      category: bodyCategory, 
      timeHorizon, 
      primaryGoal, 
      maxLossTolerancePct, 
      lossTolerance,
      incomeStability,
      answers,
      driftHistory
    } = req.body;

    let score = bodyScore;
    let category = bodyCategory;

    if (score === undefined || score === null) {
      score = 50;
      if (timeHorizon === '>10 years' || timeHorizon === '10+ Years' || timeHorizon === '5-10 Years' || timeHorizon === '5-10y') score += 10;
      if (timeHorizon === '1-3y' || timeHorizon === '1-3 Years') score -= 15;

      if (maxLossTolerancePct >= 30 || lossTolerance === 'Aggressive') score += 25;
      else if (maxLossTolerancePct >= 15 || lossTolerance === 'Moderate') score += 10;

      if (primaryGoal === 'Aggressive Growth' || primaryGoal === 'Maximum Growth') score += 20;
      else if (primaryGoal === 'Capital Preservation') score -= 20;

      score = Math.max(0, Math.min(100, score));
    }

    if (!category) {
      if (score < 35) category = 'Conservative Investor';
      else if (score < 65) category = 'Balanced Investor';
      else if (score < 85) category = 'Balanced Aggressive Investor';
      else category = 'Aggressive Growth Investor';
    }

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
    let existingDrift = req.user.riskProfile?.driftHistory || [];
    if (!existingDrift || existingDrift.length === 0) {
      existingDrift = [
        { month: 'May', score: 50 },
        { month: 'Jun', score: 52 },
        { month: 'Jul', score: 48 },
        { month: 'Aug', score: 58 },
        { month: 'Sep', score: 62 },
      ];
    }
    const updatedDrift = [...existingDrift, { month: currentMonth, score, date: new Date() }];

    const riskProfile = {
      isConfigured: true,
      score,
      category,
      timeHorizon: timeHorizon || req.user.riskProfile?.timeHorizon || '5-10 Years',
      primaryGoal: primaryGoal || req.user.riskProfile?.primaryGoal || 'Growth',
      maxLossTolerancePct: maxLossTolerancePct || req.user.riskProfile?.maxLossTolerancePct || 20,
      lossTolerance: lossTolerance || req.user.riskProfile?.lossTolerance || 'Moderate',
      incomeStability: incomeStability || req.user.riskProfile?.incomeStability || 'High',
      answers: answers || req.user.riskProfile?.answers || {},
      driftHistory: driftHistory || updatedDrift,
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
