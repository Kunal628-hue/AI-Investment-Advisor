import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from market_data import get_historical_prices, get_ticker_quote, search_symbols

client = TestClient(app)


def test_search_symbols_returns_valid_list():
    results = search_symbols("AAPL")
    assert isinstance(results, list)
    assert len(results) > 0
    first = results[0]
    assert "ticker" in first
    assert "name" in first
    assert "exchange" in first


@patch("market_data.yf.download")
def test_get_historical_prices_mocked(mock_yf_download):
    # Mock yfinance return DataFrame
    dates = pd.date_range(end=pd.Timestamp.today(), periods=5, freq="D")
    mock_df = pd.DataFrame({
        ("Close", "AAPL"): [150.0, 152.0, 151.5, 153.0, 155.0],
        ("Close", "MSFT"): [300.0, 302.0, 301.0, 304.0, 305.0]
    }, index=dates)
    
    mock_yf_download.return_value = mock_df

    df = get_historical_prices(["AAPL", "MSFT"])
    assert isinstance(df, pd.DataFrame)
    assert not df.empty


def test_optimize_endpoint_validates_tickers_and_normalizes_weights():
    response = client.post("/portfolio/optimize", json={
        "tickers": ["AAPL", "MSFT", "GOOGL"],
        "riskScore": 50,
        "investmentAmount": 10000.0,
        "maxAssetWeight": 0.50,
        "objective": "max_sharpe"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "assets" in data
    
    total_weight = sum(a["weight"] for a in data["assets"])
    assert abs(total_weight - 1.0) < 0.05
    assert data["summary"]["sharpeRatio"] is not None


def test_optimize_endpoint_rejects_empty_tickers():
    response = client.post("/portfolio/optimize", json={
        "tickers": [],
        "riskScore": 50,
        "investmentAmount": 10000.0
    })
    assert response.status_code == 400
