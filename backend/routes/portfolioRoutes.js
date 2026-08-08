const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Report = require('../models/Report');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { runFullPortfolioAnalysis, fetchStockDetails } = require('../services/aiClient');
const { generatePortfolioPDF } = require('../services/pdfExporter');
const { sendPortfolioCreationEmail } = require('../services/emailService');
const { Parser } = require('json2csv');

// @route   GET /api/portfolios/stock-details
// @desc    Fetch real stock details for NSE, BSE, NASDAQ, NYSE tickers
router.get('/stock-details', async (req, res) => {
  try {
    const ticker = req.query.ticker || 'AAPL';
    const details = await fetchStockDetails(ticker);
    res.json({ success: true, details });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/portfolios/optimize (and /api/portfolio/optimize)
// @desc    Proxies portfolio optimization request to Python service
router.post('/optimize', optionalProtect, async (req, res) => {
  try {
    const { tickers, riskScore, investmentAmount, maxAssetWeight, objective } = req.body;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ success: false, message: 'Must provide at least one valid ticker symbol.' });
    }

    const aiResponse = await runFullPortfolioAnalysis({
      tickers,
      riskScore: riskScore || 50,
      investmentAmount: investmentAmount || 10000.0,
      maxAssetWeight: maxAssetWeight || 0.40,
      objective: objective || 'max_sharpe'
    });

    res.json({ success: true, ...aiResponse });
  } catch (error) {
    console.error('Portfolio optimization proxy error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
});

// @route   POST /api/portfolios
// @desc    Create & optimize a new portfolio via Python AI service
router.post('/', optionalProtect, async (req, res) => {
  try {
    const { name, tickers, investmentAmount, maxAssetWeight, objective } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one asset ticker.' });
    }

    const userRiskProfile = req.user?.riskProfile || { score: 50, category: 'Balanced Moderate' };

    // Call Python AI Microservice
    const aiResponse = await runFullPortfolioAnalysis({
      tickers,
      riskScore: userRiskProfile.score,
      riskCategory: userRiskProfile.category,
      investmentAmount: investmentAmount || 10000.0,
      maxAssetWeight: maxAssetWeight || 0.40,
      objective: objective || 'max_sharpe'
    });

    if (!req.user) {
      return res.status(200).json({
        success: true,
        message: 'Portfolio analysis generated successfully (guest mode).',
        summary: aiResponse.summary,
        assets: aiResponse.assets,
        riskMetrics: aiResponse.riskMetrics,
        efficientFrontier: aiResponse.efficientFrontier,
        historicalPerformance: aiResponse.historicalPerformance,
        aiNarrative: aiResponse.narrative,
        sentimentSnapshot: aiResponse.sentimentSnapshot
      });
    }

    const portfolio = await Portfolio.create({
      userId: req.user._id,
      name: name || `Portfolio (${new Date().toLocaleDateString()})`,
      investmentAmount: investmentAmount || 10000.0,
      objective: objective || 'max_sharpe',
      assets: aiResponse.assets,
      metrics: {
        expectedReturn: aiResponse.summary.expectedReturn,
        volatility: aiResponse.summary.volatility,
        sharpeRatio: aiResponse.summary.sharpeRatio,
        leftoverCash: aiResponse.summary.leftoverCash || 0
      },
      riskMetrics: aiResponse.riskMetrics,
      efficientFrontier: aiResponse.efficientFrontier,
      historicalPerformance: aiResponse.historicalPerformance,
      aiNarrative: aiResponse.narrative,
      sentimentSnapshot: aiResponse.sentimentSnapshot
    });

    // Send email notification asynchronously
    sendPortfolioCreationEmail(req.user.email, req.user.name, portfolio).catch(err =>
      console.warn('Email dispatch notice:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Portfolio created & optimized successfully.',
      portfolio
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Portfolio creation failed', error: error.message });
  }
});

// @route   GET /api/portfolios
// @desc    Get all portfolios for current user
router.get('/', protect, async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: portfolios.length, portfolios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch portfolios', error: error.message });
  }
});

// @route   GET /api/portfolios/:id
// @desc    Get single portfolio by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }
    res.json({ success: true, portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio', error: error.message });
  }
});

// @route   PUT /api/portfolios/:id
// @desc    Re-optimize existing portfolio
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, tickers, investmentAmount, maxAssetWeight, objective } = req.body;
    let portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });

    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }

    const updatedTickers = tickers || portfolio.assets.map(a => a.ticker);
    const updatedAmount = investmentAmount || portfolio.investmentAmount;
    const userRiskProfile = req.user.riskProfile || { score: 50, category: 'Balanced Moderate' };

    const aiResponse = await runFullPortfolioAnalysis({
      tickers: updatedTickers,
      riskScore: userRiskProfile.score,
      riskCategory: userRiskProfile.category,
      investmentAmount: updatedAmount,
      maxAssetWeight: maxAssetWeight || 0.40,
      objective: objective || portfolio.objective
    });

    portfolio.name = name || portfolio.name;
    portfolio.investmentAmount = updatedAmount;
    portfolio.objective = objective || portfolio.objective;
    portfolio.assets = aiResponse.assets;
    portfolio.metrics = {
      expectedReturn: aiResponse.summary.expectedReturn,
      volatility: aiResponse.summary.volatility,
      sharpeRatio: aiResponse.summary.sharpeRatio,
      leftoverCash: aiResponse.summary.leftoverCash || 0
    };
    portfolio.riskMetrics = aiResponse.riskMetrics;
    portfolio.efficientFrontier = aiResponse.efficientFrontier;
    portfolio.historicalPerformance = aiResponse.historicalPerformance;
    portfolio.aiNarrative = aiResponse.narrative;
    portfolio.sentimentSnapshot = aiResponse.sentimentSnapshot;
    portfolio.updatedAt = new Date();

    await portfolio.save();

    res.json({ success: true, message: 'Portfolio re-optimized successfully', portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Portfolio update failed', error: error.message });
  }
});

// @route   DELETE /api/portfolios/:id
// @desc    Delete portfolio
router.delete('/:id', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }
    res.json({ success: true, message: 'Portfolio deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete portfolio', error: error.message });
  }
});

// @route   POST /api/portfolios/export-guest
// @desc    Export guest or local portfolio strategy payload to PDF or CSV
router.post('/export-guest', optionalProtect, async (req, res) => {
  try {
    const { format = 'pdf', portfolio } = req.body;
    const user = req.user || { name: 'Guest Advisory Client', email: 'guest@equinox.ai' };

    if (!portfolio || !Array.isArray(portfolio.assets)) {
      return res.status(400).json({ success: false, message: 'Invalid portfolio data provided' });
    }

    if (format === 'csv') {
      const csvData = (portfolio.assets || []).map(a => ({
        PortfolioName: portfolio.name || 'Equinox Portfolio Strategy',
        Ticker: a.ticker,
        AssetName: a.company || a.assetName || a.name || a.ticker,
        Sector: a.sector || 'Equity',
        AmountInvestedINR: a.amountInvested || Math.round((portfolio.investmentAmount || 100000) / portfolio.assets.length),
        WeightPct: ((a.weight || (1 / portfolio.assets.length)) * 100).toFixed(2),
        ExpectedReturnPct: a.returnPct || 12.0
      }));

      const parser = new Parser();
      const csv = parser.parse(csvData);

      res.header('Content-Type', 'text/csv');
      res.attachment(`${(portfolio.name || 'Equinox_Portfolio').replace(/\s+/g, '_')}_Report.csv`);
      return res.send(csv);
    } else {
      const pdfBuffer = await generatePortfolioPDF(portfolio, user);
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${(portfolio.name || 'Equinox_Portfolio').replace(/\s+/g, '_')}_Report.pdf`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Report export failed', error: error.message });
  }
});

// @route   GET /api/portfolios/:id/export?format=pdf|csv
// @desc    Export portfolio report to PDF or CSV
router.get('/:id/export', optionalProtect, async (req, res) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    let portfolio = null;
    if (req.user) {
      portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    }

    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found in database. Use POST /export-guest for local strategies.' });
    }

    if (format === 'csv') {
      const csvData = (portfolio.assets || []).map(a => ({
        PortfolioName: portfolio.name,
        Ticker: a.ticker,
        AssetName: a.assetName || a.ticker,
        Sector: a.sector || 'Equity',
        WeightPct: (a.weight * 100).toFixed(2),
        Shares: a.shares || 0,
        LatestPrice: a.latestPrice || 0,
        AllocationValueINR: a.allocationValue || 0
      }));

      const parser = new Parser();
      const csv = parser.parse(csvData);

      res.header('Content-Type', 'text/csv');
      res.attachment(`${portfolio.name.replace(/\s+/g, '_')}_Report.csv`);
      return res.send(csv);
    } else {
      // PDF export
      const pdfBuffer = await generatePortfolioPDF(portfolio, req.user || { name: 'Valued Client', email: '' });
      
      res.header('Content-Type', 'application/pdf');
      res.attachment(`${portfolio.name.replace(/\s+/g, '_')}_Report.pdf`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Report export failed', error: error.message });
  }
});

module.exports = router;
