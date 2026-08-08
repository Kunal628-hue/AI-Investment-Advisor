# Model Card: AI Investment Advisor Engine

## 1. Overview
The **AI Investment Advisor Engine** is a hybrid quantitative and generative AI framework designed for personalized retail portfolio recommendation. It integrates:
1. Classical Modern Portfolio Theory (**PyPortfolioOpt**) for Markowitz Mean-Variance optimization.
2. Financial news sentiment classification (**FinBERT / Transformer Encoder**) trained on the **Financial PhraseBank** benchmark dataset.
3. Generative AI narrative generation (**LangChain + LLM**) to translate quantitative asset weights into explainable, plain-English advice.
4. Continuous **Model Drift Monitoring** to track prediction distribution stability over time.

---

## 2. Quantitative Portfolio Optimization Methodology
- **Library**: `PyPortfolioOpt` v1.5.5+
- **Objective Functions**:
  - **Max Sharpe Ratio**: Maximizes $(E(R_p) - R_f) / \sigma_p$ subject to weight upper bounds (e.g. $w_i \le 40\%$).
  - **Minimum Volatility**: Solves $\min w^T \Sigma w$ subject to $\sum w_i = 1$.
- **Return & Covariance Estimation**:
  - Expected Returns: Mean historical daily log-returns annualized over 252 trading days.
  - Covariance Matrix: **Ledoit-Wolf Shrinkage** ($\Sigma_{LW}$) to reduce noise in small sample size empirical covariance matrices.
- **Efficient Frontier Curve**:
  - Evaluates 20 target risk points across the Markowitz curve for interactive scatter visualization.

---

## 3. Financial Sentiment Model
- **Dataset**: Financial PhraseBank (Malo et al., 2014) — 4,840 sentence-level financial news headlines annotated by financial experts with positive, neutral, or negative labels.
- **Architecture**: Fine-tuned Transformer Encoder based on the *Attention Is All You Need* self-attention mechanism (Vaswani et al., 2017).
- **Output Schema**:
  - Score: Continuous float $[-1.0, +1.0]$
  - Label: `Positive`, `Neutral`, `Negative`
  - Confidence: $[0.0, 1.0]$
  - Portfolio Sentiment Tilt: $\text{Tilt} = \sum_{i=1}^N w_i \times S_i$

---

## 4. LangChain LLM Narrative Synthesis
- **Framework**: `LangChain` prompt chain.
- **Inputs**: Risk Profile Score (0-100), Target Category, MPT Weights, Expected Annual Return, Annual Volatility, Sharpe Ratio, VaR 95%, Ticker Sentiment Signals.
- **Guardrails**: Output is explicitly framed with compliance disclaimers ("Educational and informational purposes only; not licensed financial advice").

---

## 5. Model Evaluation & Drift Monitoring
- **Metrics Tracked**:
  - Sentiment Score Prediction Distribution Mean & Standard Deviation vs Baseline ($0.36 \pm 0.08$).
  - Optimization Sharpe Ratio Stability vs Baseline ($1.44$).
- **Alert Threshold**: $\ge 15\%$ deviation triggers a **Drift Warning** in the Admin Control Center for scheduled retraining.
