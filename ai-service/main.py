from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import time

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
    Intelligent Conversational Advisory Chat powered by Gemini 2.5 / LangChain / Financial Synthesis.
    """
    import os
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    user_msg = req.message.strip()
    tickers_str = ", ".join(req.tickers) if req.tickers else "IRFC.NS, IRIS.NS, PCBL.NS, NHPC.NS, SJVN.NS"
    capital_str = f"Rs. {req.investmentAmount:,.2f}" if req.investmentAmount else "Rs. 1,00,000"

    prompt = (
        f"You are Equinox AI, an expert financial and portfolio optimization assistant.\n"
        f"Client Context: Holdings=[{tickers_str}], Capital={capital_str}, Risk Score={req.riskScore}/100.\n"
        f"User Question: \"{user_msg}\"\n\n"
        f"Provide a concise, highly informative, professional response addressing the user's question directly. "
        f"Reference relevant quantitative metrics (Sharpe ratio, volatility, diversification, rebalancing) where applicable. "
        f"Do NOT use dollar signs ($), format currency in Indian Rupees (Rs. or ₹)."
    )

    if gemini_key or openai_key:
        try:
            if gemini_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_key)
                    resp = llm.invoke(prompt)
                except Exception:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key)
                    resp = llm.invoke(prompt)
                answer = resp.content if hasattr(resp, 'content') else str(resp)
            else:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(model="gpt-4o-mini", api_key=openai_key)
                resp = llm.invoke(prompt)
                answer = resp.content if hasattr(resp, 'content') else str(resp)
            return {"reply": answer.replace("$", "Rs. ")}
        except Exception as e:
            pass

    msg_lower = user_msg.lower()
    if "risk" in msg_lower:
        reply = f"Based on your risk score of {req.riskScore}/100, your portfolio allocates capital across {tickers_str}. To manage downside drawdown, maintain individual position limits under 25% and establish stop-loss risk guardrails."
    elif "sharpe" in msg_lower:
        reply = "The Sharpe Ratio measures risk-adjusted return (Expected Return minus Risk-Free Rate, divided by Volatility). A higher Sharpe ratio indicates superior return per unit of risk along the Markowitz Efficient Frontier."
    elif "growth" in msg_lower or "stock" in msg_lower or "recommend" in msg_lower:
        reply = f"For higher growth in your {capital_str} portfolio, consider balancing core stocks like {tickers_str} with tech and clean energy momentum leaders. Periodic rebalancing locks in performance gains."
    else:
        reply = f"Equinox AI Advisory: Your portfolio strategy for {tickers_str} ({capital_str}) uses Markowitz Mean-Variance Optimization to maximize your risk-adjusted Sharpe ratio."

    return {"reply": reply}


@app.get("/ai/drift-status")
def api_drift_status():
    return get_drift_metrics_summary()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
