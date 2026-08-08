# Equinox Fintech — AI Investment Advisor Platform

> **Personalized Portfolio Optimization, Markowitz Efficient Frontier Analysis, FinBERT Market Sentiment, & Gemini 2.5 GenAI Advisory**

Equinox Fintech is a state-of-the-art, full-stack AI Investment Advisor platform designed for retail and institutional investors across **US (NASDAQ/NYSE)** and **Indian (NSE/BSE)** stock markets.

---

## 🚀 Key Features

* **Real-time Live Market Data & Symbol Resolution**: Automatic symbol search via Finnhub API with instant `.NS` (NSE) / `.BO` (BSE) ticker resolution for Indian equities (e.g., `IRFC.NS`, `IRIS.NS`, `PCBL.NS`, `NHPC.NS`, `SJVN.NS`).
* **Formula-Based Weight Calculation**: Automatically calculates holding weights based on invested capital:
  $$\text{Weight (\%)} = \left( \frac{\text{Amount Invested}}{\text{Total Portfolio Capital}} \right) \times 100$$
* **Markowitz Mean-Variance Optimization (PyPortfolioOpt)**: Inline Efficient Frontier calculation with expected annual returns, volatility, Sharpe ratio, and target rebalance weights.
* **Actionable AI Recommendations Workspace**: Interactive "Before vs After" rebalance simulator, per-asset trade orders (`+Buy` / `-Sell`), and FinBERT news sentiment stream.
* **Institutional Executive PDF & CSV Exporter**: Generates branded PDF reports using PDFKit with standardized `Rs.` currency formatting, clean 6-section layout, and raw holdings CSV downloads.
* **Ask Equinox AI Assistant**: Gemini 2.5 Flash conversational assistant injected with your real portfolio context (holdings, capital, risk score).

---

## 🏗️ Architecture & Technology Stack

```
                        ┌──────────────────────────────────────────┐
                        │      Frontend (React 18 + Vite)          │
                        │    Port 3000 | Tailwind CSS | Recharts   │
                        └────────────────────┬─────────────────────┘
                                             │ API Requests (/api/*)
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │    Express API Gateway (Node.js)         │
                        │    Port 5001 | JWT Auth | PDFKit Exporter│
                        └────────────────────┬─────────────────────┘
                                             │ Internal Proxy (/ai/*)
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │     AI Microservice (Python FastAPI)     │
                        │   Port 8000 | PyPortfolioOpt | yfinance  │
                        │    FinBERT Sentiment | Gemini 2.5 LLM    │
                        └──────────────────────────────────────────┘
```

---

## 🛠️ Prerequisites

* **Node.js**: `v18.0.0` or higher
* **Python**: `v3.10` or higher
* **MongoDB**: MongoDB Atlas URI or Local Instance (`mongodb://localhost:27017`)
* **API Keys (Optional but Recommended)**:
  * [Google Gemini API Key](https://aistudio.google.com/) for GenAI recommendations & chat.
  * [Finnhub API Key](https://finnhub.io/) for live market quote search.

---

## 🔑 Environment Setup (`.env`)

### 1. Backend Service (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```bash
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ai-investment-advisor
JWT_SECRET=super_secret_jwt_key_ai_investment_advisor_2026
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_2026
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### 2. Python AI Service (`ai-service/.env`)

Copy `ai-service/.env.example` to `ai-service/.env`:

```bash
PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
```

---

## 💻 Step-by-Step Commands to Run Locally

### Terminal 1: Python AI Microservice (Port 8000)

```bash
# Navigate to ai-service directory
cd ai-service

# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Terminal 2: Node Express API Gateway (Port 5001)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start Express Gateway
npm start
```

---

### Terminal 3: Vite React Frontend (Port 3000)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```

Open **http://localhost:3000** in your browser!

---

## 🐳 Docker Option (Single Command Setup)

If you have Docker installed, you can start the entire stack simultaneously:

```bash
docker-compose up --build
```

---

## 📋 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/symbols/search?q=:query` | Live symbol lookup (Finnhub + `.NS` suffix retry) |
| `GET` | `/api/symbols/:ticker/quote` | Fetch live market price and historical return |
| `POST` | `/api/portfolio/optimize` | PyPortfolioOpt Markowitz Mean-Variance optimization |
| `POST` | `/api/symbols/chat` | Conversational Gemini 2.5 LLM chat assistant |
| `POST` | `/api/portfolios/export-guest` | Generate PDF (PDFKit) or CSV report binaries |

---

## 🔒 Security Notice

All sensitive credentials (`GEMINI_API_KEY`, `FINNHUB_API_KEY`, `MONGODB_URI`, `JWT_SECRET`) are strictly excluded from version control via `.gitignore`. Never commit `.env` files to public repositories.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.