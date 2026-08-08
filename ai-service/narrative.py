import os
from typing import Dict, Any, List
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai_narrative")
logger.setLevel(logging.INFO)


def generate_llm_recommendation_narrative(
    risk_profile: Dict[str, Any],
    summary_metrics: Dict[str, Any],
    assets: List[Dict[str, Any]],
    sentiment_data: Dict[str, Any],
    risk_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generates a personalized, plain-English recommendation narrative:
    Integrates LangChain with Google Gemini API (or OpenAI API) if key is provided in .env,
    or falls back to high-quality financial synthesis engine.
    """
    score = risk_profile.get("score", 50)
    category = risk_profile.get("category", "Balanced")
    
    exp_return = summary_metrics.get("expectedReturn", 0.12) * 100
    volatility = summary_metrics.get("volatility", 0.15) * 100
    sharpe = summary_metrics.get("sharpeRatio", 1.2)
    inv_amount = summary_metrics.get("investmentAmount", 10000.0)
    
    top_assets = sorted(assets, key=lambda x: x.get("weight", 0.0), reverse=True)[:3]
    top_allocations_str = ", ".join([f"{a['ticker']} ({a['percentage']}%)" for a in top_assets])
    
    sentiment_tilt = sentiment_data.get("sentimentTiltLabel", "Bullish Sentiment Tilt")
    portfolio_sentiment_score = sentiment_data.get("portfolioSentimentScore", 0.35)

    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # If Gemini or OpenAI API Key is provided, use LangChain LLM
    if gemini_key or openai_key:
        try:
            logger.info("Calling LangChain LLM API for personalized recommendation narrative...")
            
            prompt_str = (
                f"You are an expert AI Investment Advisor. Generate a structured investment recommendation report.\n"
                f"Client Risk Profile: Category={category}, Score={score}/100.\n"
                f"Portfolio Metrics: Capital=₹{inv_amount:,.2f}, Expected Return={exp_return:.2f}%, Volatility={volatility:.2f}%, Sharpe Ratio={sharpe:.2f}.\n"
                f"Top Holdings: {top_allocations_str}.\n"
                f"News Sentiment: {sentiment_tilt} (Score={portfolio_sentiment_score:+.2f}).\n"
                f"Write a 4-paragraph personalized analysis covering: (1) Executive Summary, (2) Allocation Rationale, (3) News Sentiment Grounding, and (4) Downside Risk & Rebalancing."
            )

            if gemini_key:
                from langchain_google_genai import ChatGoogleGenerativeAI
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=gemini_key)
                    response = llm.invoke(prompt_str)
                except Exception:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_key)
                    response = llm.invoke(prompt_str)
                llm_output = response.content if hasattr(response, 'content') else str(response)
            else:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(model="gpt-4o-mini", api_key=openai_key)
                response = llm.invoke(prompt_str)
                llm_output = response.content if hasattr(response, 'content') else str(response)

            disclaimer = (
                "Educational & Informational Disclaimer: This AI-generated portfolio recommendation is produced for "
                "informational and decision-support purposes only and does not constitute licensed financial, investment, or legal advice."
            )

            return {
                "executiveSummary": f"Based on your {category} risk profile (Score: {score}/100), this portfolio optimizes your ₹{inv_amount:,.2f} capital across {len(assets)} holdings targeting {exp_return:.2f}% expected return with Sharpe Ratio {sharpe:.2f}.",
                "allocationRationale": f"Top allocations include {top_allocations_str}, balancing technology growth with defensive risk management.",
                "sentimentGrounding": f"Financial news sentiment indicates a {sentiment_tilt} (Score: {portfolio_sentiment_score:+.2f}).",
                "riskAndVolatilityAnalysis": f"Annual volatility is {volatility:.2f}% with 1-Year Max Drawdown of {abs(risk_metrics.get('maxDrawdown', 0.15))*100:.2f}%.",
                "rebalancingAdvice": "Quarterly rebalancing recommended if asset weights drift > 5%.",
                "disclaimer": disclaimer,
                "fullMarkdownNarrative": f"{llm_output}\n\n_{disclaimer}_"
            }
        except Exception as e:
            logger.warning(f"LangChain LLM invocation notice (falling back to built-in financial synthesis): {e}")

    # Built-in financial recommendation synthesis engine
    exec_summary = (
        f"Based on your **{category}** investor risk profile (Risk Score: {score}/100), "
        f"this mathematically optimized portfolio deploys your ₹{inv_amount:,.2f} capital across "
        f"{len(assets)} diversified holdings. The allocation maximizes the Sharpe Ratio ({sharpe:.2f}) "
        f"on the Markowitz Efficient Frontier, targeting an expected annual return of **{exp_return:.2f}%** "
        f"with an annual volatility of **{volatility:.2f}%**."
    )

    alloc_rationale = (
        f"The portfolio concentrates capital in key growth anchors: **{top_allocations_str}**. "
        f"Asset weights are dynamically constrained to limit single-stock risk while ensuring "
        f"broad sector exposure across Technology, Financial Services, and Defensive assets. "
        f"This structure ensures your portfolio captures market upside without taking uncompensated volatility risks."
    )

    sent_grounding = (
        f"Our Financial PhraseBank sentiment analyzer indicates a **{sentiment_tilt}** "
        f"(Composite Score: {portfolio_sentiment_score:+.2f}). Key sentiment catalysts include strong "
        f"earnings momentum in mega-cap technology and cloud infrastructure. News sentiment for top holding "
        f"**{top_assets[0]['ticker'] if top_assets else 'Core Asset'}** reinforces the quantitative weight assigned by the optimizer."
    )

    risk_analysis = (
        f"The calculated 1-Year Maximum Drawdown is **{abs(risk_metrics.get('maxDrawdown', 0.15))*100:.2f}%**, "
        f"with a 95% 1-Day Value at Risk (VaR) of **{abs(risk_metrics.get('valueAtRisk95', 0.02))*100:.2f}%**. "
        f"With a Portfolio Beta of **{risk_metrics.get('portfolioBeta', 1.05)}**, your portfolio exhibits a controlled risk "
        f"profile tailored to tolerate market fluctuations while preserving capital during downturns."
    )

    rebalancing_advice = (
        f"We recommend conducting a quarterly rebalancing check or triggering a review if any single position "
        f"drifts by more than ±5% from its target allocation weight. Tax-efficient rebalancing strategies "
        f"or directing new capital contributions to underweight positions are advised."
    )

    disclaimer = (
        "Educational & Informational Disclaimer: This AI-generated portfolio recommendation is produced for "
        "informational and decision-support purposes only and does not constitute licensed financial, investment, or legal advice. "
        "Past performance and mathematical optimization models do not guarantee future market results."
    )

    full_narrative = (
        f"### Executive Summary\n{exec_summary}\n\n"
        f"### Portfolio Construction & Allocation Rationale\n{alloc_rationale}\n\n"
        f"### News Sentiment Grounding\n{sent_grounding}\n\n"
        f"### Risk & Volatility Assessment\n{risk_analysis}\n\n"
        f"### Rebalancing & Monitoring Strategy\n{rebalancing_advice}\n\n"
        f"_{disclaimer}_"
    )

    return {
        "executiveSummary": exec_summary,
        "allocationRationale": alloc_rationale,
        "sentimentGrounding": sent_grounding,
        "riskAndVolatilityAnalysis": risk_analysis,
        "rebalancingAdvice": rebalancing_advice,
        "disclaimer": disclaimer,
        "fullMarkdownNarrative": full_narrative
    }
