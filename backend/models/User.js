const mongoose = require('mongoose');

const riskProfileSchema = new mongoose.Schema({
  isConfigured: { type: Boolean, default: false },
  score: { type: Number, default: 62, min: 0, max: 100 },
  category: { 
    type: String, 
    default: 'Balanced Investor' 
  },
  timeHorizon: { type: String, default: '5-10 Years' },
  primaryGoal: { type: String, default: 'Growth' },
  maxLossTolerancePct: { type: Number, default: 20 },
  lossTolerance: { type: String, default: 'Moderate' },
  incomeStability: { type: String, default: 'High' },
  answers: { type: Object, default: {} },
  driftHistory: [{
    month: { type: String },
    score: { type: Number },
    date: { type: Date, default: Date.now }
  }],
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
