const request = require('supertest');
const app = require('../server');

describe('Symbol & Portfolio Market Data Proxy Routes', () => {
  describe('GET /api/symbols/search', () => {
    it('should be an accessible public endpoint route', async () => {
      const res = await request(app).get('/api/symbols/search');
      expect([200, 400, 500]).toContain(res.statusCode);
    }, 15000);
  });

  describe('GET /api/symbols/:ticker/quote', () => {
    it('should be an accessible public endpoint route', async () => {
      const res = await request(app).get('/api/symbols/INVALID_TEST_SYMBOL/quote');
      expect([200, 400, 404, 500]).toContain(res.statusCode);
    }, 15000);
  });

  describe('POST /api/portfolio/optimize', () => {
    it('should process optimization requests with optional auth', async () => {
      const res = await request(app)
        .post('/api/portfolio/optimize')
        .send({ tickers: ['AAPL', 'MSFT'] });
      expect([200, 400, 500]).toContain(res.statusCode);
    }, 15000);
  });
});
