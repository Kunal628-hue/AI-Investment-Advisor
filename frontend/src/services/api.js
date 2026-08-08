import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken })
};

export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  updateRiskProfile: (data) => api.post('/users/risk-profile', data),
  toggleTheme: (darkMode) => api.put('/users/theme', { darkMode })
};

export const portfolioAPI = {
  createPortfolio: (data) => api.post('/portfolios', data),
  getPortfolios: () => api.get('/portfolios'),
  getPortfolioById: (id) => api.get(`/portfolios/${id}`),
  updatePortfolio: (id, data) => api.put(`/portfolios/${id}`, data),
  deletePortfolio: (id) => api.delete(`/portfolios/${id}`),
  getStockDetails: (ticker) => api.get(`/portfolios/stock-details?ticker=${encodeURIComponent(ticker)}`),
  exportReport: (id, format = 'pdf') => api.get(`/portfolios/${id}/export?format=${format}`, { responseType: 'blob' }),
  exportGuestReport: (data, format = 'pdf') => api.post(`/portfolios/export-guest`, { portfolio: data, format }, { responseType: 'blob' })
};

export const symbolAPI = {
  searchSymbols: (query) => api.get(`/symbols/search?q=${encodeURIComponent(query)}`),
  getQuote: (ticker) => api.get(`/symbols/${encodeURIComponent(ticker)}/quote`),
  optimizePortfolio: (data) => api.post('/portfolio/optimize', data)
};

export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getModelDrift: () => api.get('/admin/model-drift')
};

export default api;
