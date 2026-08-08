require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Portfolio = require('./models/Portfolio');
const ModelMetrics = require('./models/ModelMetrics');

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // Clear existing data in seed Collections
    await User.deleteMany({});
    await Portfolio.deleteMany({});
    await ModelMetrics.deleteMany({});

    // Create password hashes
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // Create Demo User & Admin
    const demoUser = await User.create({
      name: 'Demo Investor',
      email: 'demo@aiadvisor.com',
      passwordHash: passwordHash,
      role: 'user',
      riskProfile: {
        score: 65,
        category: 'Balanced Aggressive',
        timeHorizon: '5-10 years',
        primaryGoal: 'Wealth Growth',
        maxLossTolerancePct: 20
      }
    });

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@aiadvisor.com',
      passwordHash: passwordHash,
      role: 'admin'
    });

    console.log(`✅ Seeded Users: ${demoUser.email}, ${adminUser.email}`);

    // Create Sample Portfolio for Demo User
    const demoPortfolio = await Portfolio.create({
      userId: demoUser._id,
      name: 'Core Tech & Growth Portfolio',
      investmentAmount: 25000,
      objective: 'max_sharpe',
      assets: [
        { ticker: 'AAPL', assetName: 'Apple Inc.', sector: 'Technology', weight: 0.25, percentage: 25, shares: 35, latestPrice: 180, allocationValue: 6250 },
        { ticker: 'MSFT', assetName: 'Microsoft Corp.', sector: 'Technology', weight: 0.25, percentage: 25, shares: 15, latestPrice: 415, allocationValue: 6250 },
        { ticker: 'NVDA', assetName: 'NVIDIA Corp.', sector: 'Technology', weight: 0.20, percentage: 20, shares: 40, latestPrice: 125, allocationValue: 5000 },
        { ticker: 'AMZN', assetName: 'Amazon.com Inc.', sector: 'Consumer Cyclical', weight: 0.15, percentage: 15, shares: 20, latestPrice: 185, allocationValue: 3750 },
        { ticker: 'JPM', assetName: 'JPMorgan Chase', sector: 'Financial Services', weight: 0.15, percentage: 15, shares: 18, latestPrice: 205, allocationValue: 3750 }
      ],
      metrics: {
        expectedReturn: 0.185,
        volatility: 0.142,
        sharpeRatio: 1.30,
        leftoverCash: 0
      },
      riskMetrics: {
        maxDrawdown: 0.125,
        valueAtRisk95: 0.018,
        portfolioBeta: 1.12
      },
      aiNarrative: {
        executiveSummary: "Based on your Balanced Aggressive risk profile (Score: 65/100), this portfolio optimizes your $25,000 capital across 5 top-tier growth holdings targeting an expected return of 18.50% with Sharpe Ratio 1.30.",
        allocationRationale: "Top allocations include AAPL (25%), MSFT (25%), and NVDA (20%), balancing semiconductor and cloud growth with financial sector resilience.",
        sentimentGrounding: "Financial news sentiment indicates a Bullish Sentiment Tilt (+0.42 composite score).",
        riskAndVolatilityAnalysis: "Annual volatility is 14.20% with 1-Year Max Drawdown of 12.50%.",
        rebalancingAdvice: "Quarterly rebalancing recommended if asset weights drift > 5%.",
        disclaimer: "Educational & Informational Disclaimer: This AI-generated portfolio recommendation is produced for decision-support purposes only."
      }
    });

    console.log(`✅ Seeded Sample Portfolio ID: ${demoPortfolio._id}`);

    // Create Initial System Log Metric
    await ModelMetrics.create({
      type: 'optimization_run',
      metricValue: 0.98,
      threshold: 0.95,
      flagged: false,
      details: { algorithm: 'Markowitz Efficient Frontier', assetsCount: 5 }
    });

    console.log('✅ Seeded Initial ModelMetrics.');
    console.log('\n🎉 SUCCESS! MongoDB Atlas populated with "ai-investment-advisor" database and initial collections.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
    process.exit(1);
  }
}

seedDatabase();
