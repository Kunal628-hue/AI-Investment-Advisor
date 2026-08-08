const mongoose = require('mongoose');

const riskProfileSchema = new mongoose.Schema({
  score: { type: Number, default: 50, min: 0, max: 100 },
  category: { 
    type: String, 
    enum: ['Conservative', 'Balanced Moderate', 'Balanced Aggressive', 'Aggressive Growth'], 
    default: 'Balanced Moderate' 
  },
  timeHorizon: { type: String, default: '5-10 years' },
  primaryGoal: { type: String, default: 'Wealth Growth' },
  maxLossTolerancePct: { type: Number, default: 15 },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  riskProfile: { type: riskProfileSchema, default: () => ({}) },
  darkMode: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
