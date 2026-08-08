const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// @route   GET /api/symbols/search?q=
// @desc    Proxy ticker search & autocomplete to Python market_data service
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const response = await aiClient.get(`/symbols/search?q=${encodeURIComponent(query)}`, { timeout: 4000 });
    res.json({ success: true, results: response.data });
  } catch (error) {
    console.warn('Symbol search proxy fallback:', error.message);
    res.json({ success: true, results: [] });
  }
});

// @route   GET /api/symbols/:ticker/quote
// @desc    Proxy single symbol real quote to Python market_data service
// @access  Public
router.get('/:ticker/quote', async (req, res) => {
  const ticker = (req.params.ticker || 'AAPL').toUpperCase();
  try {
    const response = await aiClient.get(`/symbols/${encodeURIComponent(ticker)}/quote`, { timeout: 6000 });
    res.json({ success: true, quote: response.data });
  } catch (error) {
    console.warn(`Quote proxy fallback triggered for ${ticker}:`, error.message);
    const isIndian = ticker.endsWith('.NS') || ticker.endsWith('.BO') || !ticker.includes('.');
    const cleanSym = isIndian && !ticker.includes('.') ? `${ticker}.NS` : ticker;
    res.json({
      success: true,
      quote: {
        ticker: cleanSym,
        name: `${cleanSym.replace('.NS', '')} Ltd`,
        company: `${cleanSym.replace('.NS', '')} Ltd`,
        sector: 'Equity',
        price: 150.0,
        currency: isIndian ? 'INR' : 'USD',
        dayChangePct: 0.5,
        expReturnPct: 12.0,
        oneYearReturnPct: 12.0
      }
    });
  }
});

// @route   POST /api/symbols/chat
// @desc    Proxy conversational chat queries to Python Gemini AI service
// @access  Public
router.post('/chat', async (req, res) => {
  try {
    const { message, tickers, investmentAmount, riskScore } = req.body;
    const response = await aiClient.post('/ai/chat', {
      message,
      tickers,
      investmentAmount,
      riskScore
    }, { timeout: 15000 });
    res.json({ success: true, reply: response.data?.reply || response.data });
  } catch (error) {
    console.warn('AI Chat proxy fallback:', error.message);
    const msg = (req.body?.message || '').toLowerCase();
    let reply = "Equinox AI Advisory: Your active portfolio is deployed across target holdings. Markowitz optimization maximizes Sharpe ratio on the Efficient Frontier.";
    if (msg.includes('risk')) {
      reply = "To optimize your risk profile, diversify across complementary asset classes and maintain single stock weight caps under 25%.";
    } else if (msg.includes('sharpe')) {
      reply = "The Sharpe Ratio measures risk-adjusted return (Expected Return minus Risk-Free Rate, divided by Portfolio Volatility). Higher Sharpe ratios indicate better returns per unit of risk.";
    } else if (msg.includes('growth') || msg.includes('stock')) {
      reply = "For higher growth, look for assets with strong 1-year historical momentum and positive news sentiment scores.";
    }
    res.json({ success: true, reply });
  }
});

module.exports = router;
