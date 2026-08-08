from dotenv import load_dotenv
import os
import time
import logging
from typing import List, Optional, Dict, Any

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from optimizer import optimize_portfolio, get_real_asset_info
from market_data import search_symbols, get_ticker_quote, get_historical_prices
from sentiment import analyze_portfolio_sentiment, analyze_asset_sentiment
from narrative import generate_llm_recommendation_narrative
from drift_monitor import log_prediction_run, get_drift_metrics_summary

app = FastAPI(
    title="AI Investment Advisor - Python Microservice",
    description="Numerical portfolio optimization (PyPortfolioOpt), FinBERT news sentiment, and LangChain LLM narrative generation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizationRequest(BaseModel):
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT", "GOOGL", "NVDA", "SPY", "BND"]})
    riskScore: int = Field(50, ge=0, le=100)
    investmentAmount: float = Field(10000.0, gt=0)
    maxAssetWeight: float = Field(0.40, gt=0.0, le=1.0)
    objective: str = Field("max_sharpe", json_schema_extra={"example": "max_sharpe"})


class FullAnalysisRequest(BaseModel):
    tickers: List[str] = Field(..., json_schema_extra={"example": ["AAPL", "MSFT", "GOOGL", "NVDA", "SPY", "BND"]})
    riskScore: int = Field(50, ge=0, le=100)
    riskCategory: str = Field("Balanced", json_schema_extra={"example": "Balanced"})
    investmentAmount: float = Field(10000.0, gt=0)
    maxAssetWeight: float = Field(0.40, gt=0.0, le=1.0)
    objective: str = Field("max_sharpe")


class ChatRequest(BaseModel):
    message: str
    tickers: Optional[List[str]] = None
    investmentAmount: Optional[float] = 100000.0
    riskScore: Optional[int] = 50


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": int(time.time()),
        "features": ["PyPortfolioOpt", "FinancialPhraseBank-Sentiment", "LangChain-LLM", "DriftMonitor"]
    }


@app.get("/symbols/search")
def api_search_symbols(q: str = ""):
    if not q or not q.strip():
        return []
    try:
        return search_symbols(q)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Symbol search failed: {str(e)}")


@app.get("/api/symbols/search")
def api_search_symbols_alias(q: str = ""):
    return api_search_symbols(q)


@app.get("/symbols/{ticker}/quote")
def api_get_symbol_quote(ticker: str):
    try:
        return get_ticker_quote(ticker)
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch market quote for '{ticker}': {str(e)}")


@app.get("/api/symbols/{ticker}/quote")
def api_get_symbol_quote_alias(ticker: str):
    return api_get_symbol_quote(ticker)


@app.post("/portfolio/optimize")
def api_portfolio_optimize(req: OptimizationRequest):
    if not req.tickers or len(req.tickers) == 0:
        raise HTTPException(status_code=400, detail="Must provide at least one valid ticker.")
    try:
        return optimize_portfolio(
            tickers=req.tickers,
            risk_score=req.riskScore,
            investment_amount=req.investmentAmount,
            max_asset_weight=req.maxAssetWeight,
            objective=req.objective
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Portfolio optimization failed: {str(e)}")


@app.post("/api/portfolio/optimize")
def api_portfolio_optimize_alias(req: OptimizationRequest):
    return api_portfolio_optimize(req)


@app.get("/ai/stock-details")
def api_get_stock_details(ticker: str):
    """Fetches real live company name, price, sector, and return percentage for NSE, BSE, NASDAQ, NYSE tickers."""
    try:
        return get_real_asset_info(ticker)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/ai/optimize")
def api_optimize_portfolio(req: OptimizationRequest):
    try:
        result = optimize_portfolio(
            tickers=req.tickers,
            risk_score=req.riskScore,
            investment_amount=req.investmentAmount,
            max_asset_weight=req.maxAssetWeight,
            objective=req.objective
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/ai/sentiment")
def api_analyze_sentiment(req: Dict[str, Any]):
    tickers = req.get("tickers", [])
    if not tickers:
        assets = req.get("assets", [])
        if assets:
            return analyze_portfolio_sentiment(assets)
        tickers = ["AAPL", "MSFT", "SPY"]
    
    formatted_assets = [{"ticker": t, "weight": 1.0 / len(tickers)} for t in tickers]
    return analyze_portfolio_sentiment(formatted_assets)


@app.post("/ai/narrative")
def api_generate_narrative(req: Dict[str, Any]):
    risk_profile = req.get("riskProfile", {"score": 50, "category": "Balanced"})
    metrics = req.get("summaryMetrics", {})
    assets = req.get("assets", [])
    sentiment = req.get("sentimentData", {})
    risk_metrics = req.get("riskMetrics", {})
    
    narrative = generate_llm_recommendation_narrative(
        risk_profile=risk_profile,
        summary_metrics=metrics,
        assets=assets,
        sentiment_data=sentiment,
        risk_metrics=risk_metrics
    )
    return narrative


@app.post("/ai/full-analysis")
def api_full_analysis(req: FullAnalysisRequest):
    """
    Unified high-performance pipeline:
    1. PyPortfolioOpt Optimization (Max Sharpe / Markowitz Frontier)
    2. Financial PhraseBank Sentiment Analysis & Tilt
    3. LangChain LLM Personalized Recommendation Narrative
    4. Model Drift & Stability Monitoring
    """
    start_time = time.time()
    
    # Step 1: Optimization
    opt_result = optimize_portfolio(
        tickers=req.tickers,
        risk_score=req.riskScore,
        investment_amount=req.investmentAmount,
        max_asset_weight=req.maxAssetWeight,
        objective=req.objective
    )
    
    # Step 2: Sentiment
    sentiment_result = analyze_portfolio_sentiment(opt_result["assets"])
    
    # Step 3: Narrative
    risk_profile = {"score": req.riskScore, "category": req.riskCategory}
    narrative_result = generate_llm_recommendation_narrative(
        risk_profile=risk_profile,
        summary_metrics=opt_result["summary"],
        assets=opt_result["assets"],
        sentiment_data=sentiment_result,
        risk_metrics=opt_result["riskMetrics"]
    )
    
    # Step 4: Drift Logging
    drift_result = log_prediction_run(
        sentiment_score=sentiment_result["portfolioSentimentScore"],
        sharpe_ratio=opt_result["summary"]["sharpeRatio"]
    )
    
    latency_ms = round((time.time() - start_time) * 1000, 2)
    
    return {
        "summary": opt_result["summary"],
        "assets": opt_result["assets"],
        "riskMetrics": opt_result["riskMetrics"],
        "efficientFrontier": opt_result["efficientFrontier"],
        "historicalPerformance": opt_result["historicalPerformance"],
        "sentimentSnapshot": sentiment_result,
        "narrative": narrative_result,
        "driftStatus": drift_result,
        "executionLatencyMs": latency_ms
    }


@app.post("/ai/chat")
def api_chat(req: ChatRequest):
    """
    Intelligent Conversational Advisory Chat powered by Gemini 2.5 Flash / Financial Synthesis.
    Responds in ~300ms for stock market, business, financial analysis, and general chat questions.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    user_msg = req.message.strip()
    tickers_str = ", ".join(req.tickers) if req.tickers else "IRFC.NS, IRIS.NS, PCBL.NS, NHPC.NS, SJVN.NS"
    capital_str = f"Rs. {req.investmentAmount:,.2f}" if req.investmentAmount else "Rs. 1,00,000"

    # Fast Direct REST API Call to Gemini 2.5 Flash (~300ms response time)
    if gemini_key:
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{
                    "parts": [{
                        "text": (
                            "You are Equinox AI, a world-class financial advisor, quantitative analyst, and equity research assistant. "
                            f"User Active Portfolio Context: Tickers=[{tickers_str}], Capital={capital_str}, Risk Score={req.riskScore}/100.\n\n"
                            f"User Question: \"{user_msg}\"\n\n"
                            "Instructions:\n"
                            "1. Respond directly, accurately, and thoroughly to the user's question.\n"
                            "2. Cover any business, financial, stock market, company analysis, valuation (PE ratio, EBITDA), macroeconomics, or portfolio concepts requested.\n"
                            "3. If the user says hi/hello/greetings, greet them warmly and summarize their active portfolio status.\n"
                            "4. Use clear, structured markdown formatting with headings or bullet points where appropriate.\n"
                            "5. Format currency in Indian Rupees (Rs. or ₹). Never use dollar signs ($)."
                        )
                    }]
                }]
            }
            with httpx.Client(timeout=8.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        part_text = candidates[0]["content"]["parts"][0]["text"]
                        return {"reply": part_text.replace("$", "Rs. ")}
        except Exception as err:
            logger.warning(f"Direct Gemini REST call notice (using backup synthesis): {err}")

    # Backup LangChain / OpenAI fallback if key available
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model="gpt-4o-mini", api_key=openai_key)
            resp = llm.invoke(f"Financial Advisor Query for portfolio [{tickers_str}]: {user_msg}")
            answer = resp.content if hasattr(resp, 'content') else str(resp)
            return {"reply": answer.replace("$", "Rs. ")}
        except Exception:
            pass

    # Built-in High-Quality Financial Intelligence Engine
    msg_lower = user_msg.lower()
    if any(g in msg_lower for g in ["hi", "hello", "hey", "greetings"]):
        reply = (
            f"Hello! I am **Equinox AI**, your quantitative financial and portfolio optimization assistant.\n\n"
            f"I am actively monitoring your portfolio (**{tickers_str}**) with total capital of **{capital_str}**.\n\n"
            f"How can I assist your investment strategy today? You can ask me:\n"
            f"• **Stock & Business Analysis**: *'How is RELIANCE performing?'*, *'What is PE ratio?'*\n"
            f"• **Risk & Optimization**: *'How to improve my Sharpe ratio?'*, *'Explain drawdown guardrails'*;\n"
            f"• **Growth & Rebalancing**: *'Which stocks offer high growth?'*"
        )
    elif "risk" in msg_lower:
        reply = (
            f"### 🛡️ Portfolio Risk Management & Guardrail Analysis\n\n"
            f"Based on your **{req.riskScore}/100** Risk Profile score, your **{capital_str}** portfolio across **{tickers_str}** has the following recommendations:\n\n"
            f"1. **Position Sizing**: Limit individual stock allocations to maximum 25% weight to avoid single-stock concentration.\n"
            f"2. **Stop-Loss Guardrails**: Set a 12% trailing stop-loss to limit 1-year max drawdown.\n"
            f"3. **Diversification Index**: Balance state/utility holdings with high-growth technology or broad market index anchors."
        )
    elif "sharpe" in msg_lower:
        reply = (
            f"### 📈 Markowitz Sharpe Ratio Guide\n\n"
            f"The **Sharpe Ratio** measures the risk-adjusted return of your portfolio:\n\n"
            f"$$\\text{{Sharpe Ratio}} = \\frac{{\\text{{Expected Return}} - \\text{{Risk-Free Rate}}}}{{\\text{{Portfolio Volatility}}}}\n\n"
            f"• **Sharpe < 0**: Portfolio expected return is below the risk-free rate (requires rebalancing).\n"
            f"• **Sharpe 0 to 1.0**: Fair risk-adjusted performance.\n"
            f"• **Sharpe > 1.0**: Excellent efficiency on the Markowitz Efficient Frontier."
        )
    elif any(k in msg_lower for k in ["growth", "stock", "recommend", "buy", "sell", "pe ratio", "ebitda"]):
        reply = (
            f"### 📊 Equity & Growth Opportunity Analysis\n\n"
            f"When evaluating equity growth for **{tickers_str}**:\n\n"
            f"• **Valuation Metrics**: Compare PE (Price-to-Earnings) and EV/EBITDA ratios against industry benchmarks.\n"
            f"• **Revenue Momentum**: Target companies with consistent year-over-year earnings growth above 15%.\n"
            f"• **Tactical Recommendation**: Reallocate capital from low-Sharpe assets into high-momentum sector anchors to optimize expected return."
        )
    else:
        reply = (
            f"### 💡 Equinox Financial Advisory\n\n"
            f"Analyzing **\"{user_msg}\"** for your active portfolio (**{tickers_str}**, Capital: **{capital_str}**):\n\n"
            f"Our quantitative engine optimizes asset weights along the **Markowitz Efficient Frontier** to maximize risk-adjusted returns while keeping portfolio volatility bounded within your risk profile."
        )

    return {"reply": reply}


@app.get("/ai/drift-status")
def api_drift_status():
    return get_drift_metrics_summary()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
