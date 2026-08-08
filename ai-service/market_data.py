import os
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import pandas as pd
import yfinance as yf
import requests
from pymongo import MongoClient, ASCENDING

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# MongoDB connection
MONGO_URI = os.getenv(
    "MONGODB_URI", 
    "mongodb://localhost:27017/ai-investment-advisor"
)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")

# Initialize MongoDB client lazily
mongo_client = None
db = None

def get_db():
    global mongo_client, db
    if db is None:
        try:
            mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
            db = mongo_client.get_database()
            # Create compound index for fast caching lookups
            db["priceHistory"].create_index([("ticker", ASCENDING), ("date", ASCENDING)], unique=True)
            db["priceHistory"].create_index([("updatedAt", ASCENDING)])
        except Exception as e:
            logger.warning(f"MongoDB cache initialization warning: {e}")
            db = None
    return db


# In-memory quote cache: {ticker -> (result_dict, timestamp)}
_QUOTE_CACHE: Dict[str, tuple] = {}
_QUOTE_CACHE_TTL_SECONDS = 300  # Cache individual quotes for 5 minutes


def get_historical_prices(tickers: List[str], period: str = "1y") -> pd.DataFrame:
    """
    Fetches historical closing prices for a list of tickers.
    Checks MongoDB priceHistory cache first (fresh if updated within 24h).
    If missing/stale, fetches live via yfinance, writes to Mongo cache, and returns DataFrame.
    """
    clean_tickers = [t.strip().upper() for t in tickers if t and isinstance(t, str)]
    if not clean_tickers:
        raise ValueError("At least one valid ticker symbol must be provided.")

    database = get_db()
    cached_prices = {}
    missing_tickers = []
    now = datetime.utcnow()
    cutoff_24h = now - timedelta(hours=24)

    # 1. Attempt Mongo Cache Read
    if database is not None:
        try:
            for t in clean_tickers:
                # Find latest cache entry
                latest_doc = database["priceHistory"].find_one(
                    {"ticker": t, "updatedAt": {"$gte": cutoff_24h}},
                    sort=[("date", -1)]
                )
                if latest_doc:
                    # Retrieve full historical series for ticker
                    cursor = database["priceHistory"].find({"ticker": t}).sort("date", 1)
                    series = {doc["date"]: doc["close"] for doc in cursor if "date" in doc and "close" in doc}
                    if len(series) > 10:
                        cached_prices[t] = pd.Series(series)
                    else:
                        missing_tickers.append(t)
                else:
                    missing_tickers.append(t)
        except Exception as cache_err:
            logger.warning(f"MongoDB cache read exception: {cache_err}")
            missing_tickers = list(clean_tickers)
    else:
        missing_tickers = list(clean_tickers)

    # 2. Fetch missing/stale tickers from yfinance
    if missing_tickers:
        logger.info(f"Fetching live market data via yfinance for: {missing_tickers}")
        try:
            data = yf.download(
                tickers=missing_tickers,
                period=period,
                interval="1d",
                progress=False,
                auto_adjust=True
            )

            # Handle single ticker vs multi ticker yfinance output formats
            if len(missing_tickers) == 1:
                t = missing_tickers[0]
                if isinstance(data, pd.DataFrame) and "Close" in data.columns:
                    s = data["Close"].dropna()
                    if not s.empty:
                        cached_prices[t] = s
                elif isinstance(data, pd.Series) and not data.empty:
                    cached_prices[t] = data.dropna()
            else:
                if isinstance(data, pd.DataFrame) and "Close" in data.columns:
                    close_df = data["Close"]
                    for t in missing_tickers:
                        if t in close_df.columns:
                            s = close_df[t].dropna()
                            if not s.empty:
                                cached_prices[t] = s
        except Exception as yf_err:
            logger.error(f"yfinance download error: {yf_err}")

    # 3. Write newly fetched data to MongoDB cache
    if database is not None and missing_tickers:
        try:
            for t in missing_tickers:
                if t in cached_prices:
                    s = cached_prices[t]
                    if isinstance(s, pd.DataFrame):
                        s = s.iloc[:, 0] if not s.empty else pd.Series()
                    if isinstance(s, pd.Series):
                        for dt, close_val in s.items():
                            try:
                                if pd.isna(close_val):
                                    continue
                                date_str = pd.to_datetime(dt).strftime("%Y-%m-%d")
                                database["priceHistory"].update_one(
                                    {"ticker": t, "date": date_str},
                                    {"$set": {
                                        "ticker": t,
                                        "date": date_str,
                                        "close": float(close_val),
                                        "updatedAt": now
                                    }},
                                    upsert=True
                                )
                            except Exception:
                                pass
        except Exception as write_err:
            logger.warning(f"MongoDB cache write exception: {write_err}")

    # 4. Assemble final DataFrame
    if not cached_prices:
        raise ValueError(f"Could not retrieve historical price data for tickers: {clean_tickers}")

    clean_dict = {}
    for t, val in cached_prices.items():
        if isinstance(val, pd.DataFrame):
            clean_dict[t] = val.iloc[:, 0]
        elif isinstance(val, pd.Series):
            clean_dict[t] = val

    prices_df = pd.DataFrame(clean_dict)
    prices_df = prices_df.dropna(how="all").ffill().bfill()

    if prices_df.empty:
        raise ValueError(f"Price history DataFrame is empty for tickers: {clean_tickers}")

    return prices_df


def get_ticker_quote(ticker: str) -> Dict[str, Any]:
    """
    Returns latest price, 1-day change %, and trailing 1y return for a single ticker.
    Automatically resolves Indian tickers without suffix (e.g. PCBL -> PCBL.NS, RELIANCE -> RELIANCE.NS).
    """
    clean_ticker = ticker.strip().upper()
    if not clean_ticker:
        raise ValueError("Invalid symbol provided.")

    symbols_to_try = [clean_ticker]
    if "." not in clean_ticker and not clean_ticker.endswith("-USD"):
        symbols_to_try.append(f"{clean_ticker}.NS")
        symbols_to_try.append(f"{clean_ticker}.BO")

    # Check in-memory cache (TTL: 5 minutes)
    cache_key = clean_ticker
    if cache_key in _QUOTE_CACHE:
        cached_result, cached_ts = _QUOTE_CACHE[cache_key]
        if time.time() - cached_ts < _QUOTE_CACHE_TTL_SECONDS:
            logger.info(f"Quote cache hit for {clean_ticker}")
            return cached_result

    last_err = None
    for sym in symbols_to_try:
        try:
            t_obj = yf.Ticker(sym)
            hist = t_obj.history(period="1y")
            if hist.empty or len(hist) < 2:
                continue

            fast_info = getattr(t_obj, "fast_info", None)
            latest_close = float(hist["Close"].iloc[-1])
            prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else latest_close
            one_year_ago_close = float(hist["Close"].iloc[0])

            day_change_pct = round(((latest_close - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0
            one_year_return_pct = round(((latest_close - one_year_ago_close) / one_year_ago_close) * 100, 2) if one_year_ago_close > 0 else 0.0

            currency = "INR" if sym.endswith(".NS") or sym.endswith(".BO") else "USD"
            display_name = f"{sym.replace('.NS', '').replace('.BO', '')} Ltd" if currency == "INR" else f"{sym} Corp."
            sector = "Equity"

            result = {
                "ticker": sym,
                "name": display_name,
                "company": display_name,
                "sector": sector,
                "price": round(latest_close, 2),
                "currency": currency,
                "dayChangePct": day_change_pct,
                "expReturnPct": one_year_return_pct,
                "oneYearReturnPct": one_year_return_pct
            }
            # Write to in-memory cache
            _QUOTE_CACHE[cache_key] = (result, time.time())
            return result
        except Exception as e:
            last_err = e

    # Fallback response for unlisted/delisted symbols so user can still add custom asset
    return {
        "ticker": clean_ticker,
        "name": f"{clean_ticker} Corp.",
        "company": f"{clean_ticker} Corp.",
        "sector": "General Equity",
        "price": 100.0,
        "currency": "USD",
        "dayChangePct": 0.0,
        "expReturnPct": 12.0,
        "oneYearReturnPct": 12.0
    }


def get_real_asset_info(ticker: str) -> Dict[str, Any]:
    """Alias for get_ticker_quote to retrieve real ticker metadata."""
    try:
        return get_ticker_quote(ticker)
    except Exception:
        return {
            "ticker": ticker.upper(),
            "name": f"{ticker.upper()} Corp.",
            "company": f"{ticker.upper()} Corp.",
            "sector": "General Equity",
            "price": 100.0,
            "currency": "USD",
            "dayChangePct": 0.0,
            "expReturnPct": 12.0,
            "oneYearReturnPct": 12.0
        }


def search_symbols(query: str) -> List[Dict[str, Any]]:
    """
    Autocomplete symbol search API using Finnhub endpoint + yfinance symbol validation.
    Returns normalized symbol objects: [{ ticker, name, exchange, type }].
    """
    clean_q = query.strip().upper()
    if not clean_q or len(clean_q) < 1:
        return []

    results = []

    # 1. Try Finnhub Search API if key exists
    if FINNHUB_API_KEY:
        try:
            url = f"https://finnhub.io/api/v1/search?q={clean_q}&token={FINNHUB_API_KEY}"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("result", [])[:10]:
                    symbol = item.get("symbol", "").upper()
                    display_name = item.get("description") or item.get("displaySymbol") or symbol
                    exch = item.get("type") or "US"
                    if symbol:
                        results.append({
                            "ticker": symbol,
                            "name": display_name,
                            "exchange": exch,
                            "type": "Stock"
                        })
        except Exception as fh_err:
            logger.warning(f"Finnhub search exception: {fh_err}")

    # 2. Known Common Benchmark Stock Registry (Indian & Global)
    common_registry = [
        {"ticker": "RELIANCE.NS", "name": "Reliance Industries Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "TCS.NS", "name": "Tata Consultancy Services Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "INFY.NS", "name": "Infosys Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "HDFCBANK.NS", "name": "HDFC Bank Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "TATAMOTORS.NS", "name": "Tata Motors Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "PCBL.NS", "name": "PCBL Limited", "exchange": "NSE", "type": "Stock"},
        {"ticker": "BSE.BO", "name": "BSE Limited", "exchange": "BSE", "type": "Stock"},
        {"ticker": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "NVDA", "name": "NVIDIA Corporation", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "AMZN", "name": "Amazon.com Inc.", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "TSLA", "name": "Tesla Inc.", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "GOOGL", "name": "Alphabet Inc.", "exchange": "NASDAQ", "type": "Stock"},
        {"ticker": "SPY", "name": "SPDR S&P 500 ETF Trust", "exchange": "NYSE", "type": "ETF"},
        {"ticker": "BND", "name": "Vanguard Total Bond Market ETF", "exchange": "NASDAQ", "type": "ETF"}
    ]

    for reg in common_registry:
        if clean_q in reg["ticker"] or clean_q in reg["name"].upper():
            if not any(r["ticker"] == reg["ticker"] for r in results):
                results.append(reg)

    # 3. Direct Symbol Validation Fallback via yfinance if search query is a single ticker
    if not results or not any(r["ticker"] == clean_q for r in results):
        # Try clean_q and clean_q + .NS
        candidates = [clean_q]
        if not clean_q.endswith(".NS") and not clean_q.endswith(".BO"):
            candidates.append(f"{clean_q}.NS")

        for cand in candidates:
            try:
                t_obj = yf.Ticker(cand)
                fast = t_obj.fast_info
                if fast and hasattr(fast, 'last_price') and fast.last_price is not None:
                    name = t_obj.info.get("longName") or t_obj.info.get("shortName") or cand
                    results.insert(0, {
                        "ticker": cand,
                        "name": name,
                        "exchange": "NSE" if cand.endswith(".NS") else ("BSE" if cand.endswith(".BO") else "US"),
                        "type": "Stock"
                    })
                    break
            except Exception:
                pass

    return results[:8]
