const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  ticker: { type: String, required: true },
  assetName: { type: String, required: true },
  sector: { type: String, default: 'General' },
  weight: { type: Number, required: true },
  percentage: { type: Number, required: true },
  shares: { type: Number, default: 0 },
  latestPrice: { type: Number, default: 0 },
  allocationValue: { type: Number, default: 0 }
});

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, default: 'My Optimized Portfolio' },
  investmentAmount: { type: Number, required: true, default: 10000 },
  objective: { type: String, default: 'max_sharpe' },
  assets: [assetSchema],
  metrics: {
    expectedReturn: { type: Number, required: true },
    volatility: { type: Number, required: true },
    sharpeRatio: { type: Number, required: true },
    leftoverCash: { type: Number, default: 0 }
  },
  riskMetrics: {
    maxDrawdown: { type: Number, default: 0 },
    valueAtRisk95: { type: Number, default: 0 },
    portfolioBeta: { type: Number, default: 1.0 }
  },
  efficientFrontier: [{
    volatility: Number,
    expectedReturn: Number,
    sharpe: Number
  }],
  historicalPerformance: [{
    date: String,
    portfolio: Number,
    benchmark: Number
  }],
  aiNarrative: {
    executiveSummary: String,
    allocationRationale: String,
    sentimentGrounding: String,
    riskAndVolatilityAnalysis: String,
    rebalancingAdvice: String,
    disclaimer: String,
    fullMarkdownNarrative: String
  },
  sentimentSnapshot: {
    portfolioSentimentScore: Number,
    sentimentTiltLabel: String,
    sentimentTiltSummary: String,
    tickerSentiments: [{
      ticker: String,
      score: Number,
      label: String,
      confidence: Number,
      headline: String,
      catalyst: String,
      risk: String
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
