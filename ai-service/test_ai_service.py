import pytest
from fastapi.testclient import TestClient
from main import app
from optimizer import optimize_portfolio
from sentiment import analyze_asset_sentiment, analyze_portfolio_sentiment

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "PyPortfolioOpt" in data["features"]


def test_optimizer_unit():
    tickers = ["AAPL", "MSFT", "GOOGL", "SPY"]
    res = optimize_portfolio(tickers=tickers, risk_score=60, investment_amount=10000.0)
    
    assert "summary" in res
    assert "assets" in res
    assert "efficientFrontier" in res
    assert "riskMetrics" in res
    
    assert res["summary"]["expectedReturn"] > 0
    assert res["summary"]["sharpeRatio"] != 0
    assert len(res["assets"]) == len(tickers)
    
    # Weight sum sanity check
    total_weight = sum([a["weight"] for a in res["assets"]])
    assert abs(total_weight - 1.0) < 0.01


def test_sentiment_unit():
    sent = analyze_asset_sentiment("AAPL")
    assert sent["ticker"] == "AAPL"
    assert -1.0 <= sent["score"] <= 1.0
    assert sent["label"] in ["Positive", "Neutral", "Negative"]

    port_sent = analyze_portfolio_sentiment([{"ticker": "AAPL", "weight": 0.6}, {"ticker": "MSFT", "weight": 0.4}])
    assert "portfolioSentimentScore" in port_sent
    assert "sentimentTiltLabel" in port_sent


def test_full_analysis_api_endpoint():
    payload = {
        "tickers": ["AAPL", "MSFT", "NVDA", "SPY", "BND"],
        "riskScore": 65,
        "riskCategory": "Balanced Aggressive",
        "investmentAmount": 25000.0,
        "maxAssetWeight": 0.35,
        "objective": "max_sharpe"
    }
    response = client.post("/ai/full-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "summary" in data
    assert "assets" in data
    assert "narrative" in data
    assert "sentimentSnapshot" in data
    assert "driftStatus" in data
    assert data["executionLatencyMs"] > 0


def test_drift_status_endpoint():
    response = client.get("/ai/drift-status")
    assert response.status_code == 200
    data = response.json()
    assert "sentimentModel" in data
    assert "optimizationEngine" in data
