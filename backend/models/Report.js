const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  type: { type: String, enum: ['pdf', 'csv'], required: true },
  filename: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
