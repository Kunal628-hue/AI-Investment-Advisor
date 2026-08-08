import time
from typing import Dict, Any, List
import numpy as np
import logging

logger = logging.getLogger("drift_monitor")
logger.setLevel(logging.INFO)

# In-memory drift tracking registry
HISTORICAL_SENTIMENT_SCORES: List[float] = [0.35, 0.42, 0.28, 0.39, 0.45, 0.31, 0.37, 0.40, 0.33, 0.38]
HISTORICAL_OPTIMIZATION_SHARPES: List[float] = [1.45, 1.38, 1.52, 1.41, 1.48, 1.35, 1.50, 1.42]

BASELINE_SENTIMENT_MEAN = 0.36
BASELINE_SENTIMENT_STD = 0.08
BASELINE_SHARPE_MEAN = 1.44

DRIFT_THRESHOLD = 0.15 # 15% distribution shift threshold


def log_prediction_run(sentiment_score: float, sharpe_ratio: float) -> Dict[str, Any]:
    """Logs a single AI optimization run and checks for distribution drift."""
    HISTORICAL_SENTIMENT_SCORES.append(sentiment_score)
    HISTORICAL_OPTIMIZATION_SHARPES.append(sharpe_ratio)

    # Keep window of last 100 runs
    if len(HISTORICAL_SENTIMENT_SCORES) > 100:
        HISTORICAL_SENTIMENT_SCORES.pop(0)
    if len(HISTORICAL_OPTIMIZATION_SHARPES) > 100:
        HISTORICAL_OPTIMIZATION_SHARPES.pop(0)

    current_sentiment_mean = float(np.mean(HISTORICAL_SENTIMENT_SCORES))
    current_sharpe_mean = float(np.mean(HISTORICAL_OPTIMIZATION_SHARPES))

    sentiment_drift = abs(current_sentiment_mean - BASELINE_SENTIMENT_MEAN)
    sharpe_drift = abs(current_sharpe_mean - BASELINE_SHARPE_MEAN) / BASELINE_SHARPE_MEAN

    is_flagged = (sentiment_drift > DRIFT_THRESHOLD) or (sharpe_drift > DRIFT_THRESHOLD)

    status_label = "CRITICAL DRIFT ALERT" if (sentiment_drift > 0.25 or sharpe_drift > 0.25) else (
        "ELEVATED DRIFT" if is_flagged else "STABLE (NO DRIFT)"
    )

    return {
        "timestamp": int(time.time()),
        "runsTracked": len(HISTORICAL_SENTIMENT_SCORES),
        "sentimentBaselineMean": BASELINE_SENTIMENT_MEAN,
        "currentSentimentMean": round(current_sentiment_mean, 4),
        "sentimentDrift": round(sentiment_drift, 4),
        "sharpeBaselineMean": BASELINE_SHARPE_MEAN,
        "currentSharpeMean": round(current_sharpe_mean, 4),
        "sharpeDriftPct": round(sharpe_drift * 100, 2),
        "driftThresholdPct": round(DRIFT_THRESHOLD * 100, 2),
        "flagged": is_flagged,
        "statusLabel": status_label
    }


def get_drift_metrics_summary() -> Dict[str, Any]:
    """Returns baseline and current model drift summary for admin panel."""
    current_sentiment_mean = float(np.mean(HISTORICAL_SENTIMENT_SCORES)) if HISTORICAL_SENTIMENT_SCORES else 0.36
    current_sharpe_mean = float(np.mean(HISTORICAL_OPTIMIZATION_SHARPES)) if HISTORICAL_OPTIMIZATION_SHARPES else 1.44
    
    sentiment_drift = abs(current_sentiment_mean - BASELINE_SENTIMENT_MEAN)
    sharpe_drift = abs(current_sharpe_mean - BASELINE_SHARPE_MEAN) / BASELINE_SHARPE_MEAN
    
    is_flagged = (sentiment_drift > DRIFT_THRESHOLD) or (sharpe_drift > DRIFT_THRESHOLD)

    return {
        "totalEvaluatedRuns": len(HISTORICAL_SENTIMENT_SCORES),
        "sentimentModel": {
            "name": "FinBERT Sentiment Classifier (Financial PhraseBank)",
            "baselineMean": BASELINE_SENTIMENT_MEAN,
            "currentMean": round(current_sentiment_mean, 4),
            "driftAbsolute": round(sentiment_drift, 4),
            "status": "Healthy" if sentiment_drift <= DRIFT_THRESHOLD else "Drift Warning"
        },
        "optimizationEngine": {
            "name": "PyPortfolioOpt Markowitz Max Sharpe",
            "baselineSharpe": BASELINE_SHARPE_MEAN,
            "currentSharpe": round(current_sharpe_mean, 4),
            "driftPct": round(sharpe_drift * 100, 2),
            "status": "Healthy" if sharpe_drift <= DRIFT_THRESHOLD else "Stability Warning"
        },
        "overallFlagged": is_flagged,
        "alertMessage": "Model metrics are operating within normal stability boundaries." if not is_flagged else "Model drift threshold exceeded. Scheduled retraining recommended."
    }
